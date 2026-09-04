'use client'

/**
 * The screen an admin decides a payout on.
 *
 * Approving is the one irreversible thing in the product, so this shows the
 * whole picture before the button: every sale, what each party took, what the
 * organiser is owed, whether Ziyawa can cover it, and anything that looks off.
 *
 * Declining is a first-class outcome, not a cancel button — it needs a reason,
 * and the organiser is emailed that reason.
 */

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Info,
  Loader2,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatMoneyExact } from '@/lib/helpers'
import { PAYOUT_REJECTION_REASONS } from '@/lib/payout-rejection-reasons'
import type { EventPayoutReview, PayoutFlag } from '@/lib/admin/event-payout-review'

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string
  value: string
  strong?: boolean
  muted?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className={muted ? 'text-xs text-muted-foreground' : 'text-sm text-muted-foreground'}>{label}</span>
      <span className={`tabular-nums ${strong ? 'text-base font-semibold' : 'text-sm'}`}>{value}</span>
    </div>
  )
}

function FlagCard({ flag }: { flag: PayoutFlag }) {
  const style = {
    blocker: { cls: 'border-red-300 bg-red-50 text-red-900', Icon: Ban },
    warning: { cls: 'border-amber-300 bg-amber-50 text-amber-900', Icon: AlertTriangle },
    note: { cls: 'border-neutral-300 bg-neutral-50 text-neutral-800', Icon: Info },
  }[flag.level]

  return (
    <div className={`flex gap-2.5 rounded-lg border p-3 ${style.cls}`}>
      <style.Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="text-sm font-medium">{flag.title}</p>
        <p className="mt-0.5 text-xs opacity-90">{flag.detail}</p>
      </div>
    </div>
  )
}

export function PayoutReviewDialog({
  eventId,
  open,
  onOpenChange,
  onDone,
}: {
  eventId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}) {
  const [review, setReview] = useState<EventPayoutReview | null>(null)
  const [loading, setLoading] = useState(false)
  const [working, setWorking] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [codes, setCodes] = useState<string[]>([])
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/payout-review`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load the payout details')
      setReview(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load the payout details')
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }, [eventId, onOpenChange])

  useEffect(() => {
    if (open) {
      setDeclining(false)
      setCodes([])
      setNote('')
      void load()
    }
  }, [open, load])

  const approve = async () => {
    if (!review) return
    const confirmed = window.confirm(
      `Send ${formatMoneyExact(review.balances.payoutNowRands)} to ${review.organiser.name}? ` +
      'This transfers real money and cannot be undone.'
    )
    if (!confirmed) return

    setWorking(true)
    try {
      const decide = await fetch(`/api/admin/events/${eventId}/payout-decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      const decided = await decide.json()
      if (!decide.ok) {
        throw new Error(
          decided.blockers?.length ? `Blocked: ${decided.blockers.join('; ')}` : decided.error || 'Could not prepare the payout'
        )
      }

      // The transfer itself goes through the payouts route — the only place
      // that talks to Paystack.
      const send = await fetch(`/api/admin/payouts/${decided.payoutRequestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      const sent = await send.json()
      if (!send.ok) throw new Error(sent.error || 'The payout was queued but the transfer failed')

      toast.success(sent.message || 'Payout sent.', { duration: 10000 })
      onOpenChange(false)
      onDone?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not complete the payout', { duration: 10000 })
    } finally {
      setWorking(false)
    }
  }

  const decline = async () => {
    setWorking(true)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/payout-decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline', rejection_codes: codes, admin_notes: note.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not record the decline')
      toast.success(data.message, { duration: 9000 })
      onOpenChange(false)
      onDone?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not record the decline')
    } finally {
      setWorking(false)
    }
  }

  const blockers = review?.flags.filter((f) => f.level === 'blocker') ?? []
  const others = review?.flags.filter((f) => f.level !== 'blocker') ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review payout</DialogTitle>
          <DialogDescription>
            {review
              ? `${review.eventTitle} — everything this event took, and what it owes.`
              : 'Loading the full picture…'}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading
          </div>
        )}

        {review && !loading && (
          <div className="space-y-5">
            {/* Headline */}
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-xs text-muted-foreground">Pay the organiser</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">
                {formatMoneyExact(review.balances.payoutNowRands)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                to {review.organiser.name}
                {review.organiser.bankName
                  ? ` · ${review.organiser.bankName} ····${review.organiser.accountLast4}`
                  : ' · no bank account on file'}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs">
                {review.organiser.isVerified ? (
                  <><ShieldCheck className="h-3.5 w-3.5 text-green-600" /><span className="text-green-700">Verified organiser</span></>
                ) : (
                  <><ShieldAlert className="h-3.5 w-3.5 text-red-600" /><span className="text-red-700">Not verified</span></>
                )}
                {review.organiser.completedPayouts > 0 && (
                  <span className="text-muted-foreground">· {review.organiser.completedPayouts} previous payout{review.organiser.completedPayouts === 1 ? '' : 's'}</span>
                )}
              </div>
            </div>

            {/* Anything worth knowing */}
            {(blockers.length > 0 || others.length > 0) && (
              <div className="space-y-2">
                {blockers.map((f) => <FlagCard key={f.title} flag={f} />)}
                {others.map((f) => <FlagCard key={f.title} flag={f} />)}
              </div>
            )}

            {/* Where the money went */}
            <div>
              <h4 className="mb-1 text-sm font-semibold">Where the money went</h4>
              <div className="rounded-lg border px-4 py-2">
                <Row label={`Buyers paid (${review.totals.ticketsSold} sale${review.totals.ticketsSold === 1 ? '' : 's'})`} value={formatMoneyExact(review.totals.grossRands)} />
                <Row label="Paystack took" value={`−${formatMoneyExact(review.totals.paystackFeesRands)}`} />
                <Row label="Ziyawa booking fee" value={`−${formatMoneyExact(review.totals.ziyawaFeesRands)}`} />
                <div className="my-1 border-t" />
                <Row label="Organiser earned" value={formatMoneyExact(review.totals.organiserRands)} strong />
                <Row label="Ziyawa kept after Paystack" value={formatMoneyExact(review.totals.ziyawaNetRands)} muted />
                <Row label="Transfer will cost Ziyawa" value={`−${formatMoneyExact(review.balances.transferCostRands)}`} muted />
              </div>
            </div>

            {/* Can we afford it */}
            <div>
              <h4 className="mb-1 text-sm font-semibold">Can Ziyawa cover it</h4>
              <div className="rounded-lg border px-4 py-2">
                <Row
                  label="Paystack balance"
                  value={review.balances.paystackBalanceRands === null ? 'unavailable' : formatMoneyExact(review.balances.paystackBalanceRands)}
                />
                <Row label="After this payout" value={review.balances.balanceAfterRands === null ? '—' : formatMoneyExact(review.balances.balanceAfterRands)} strong />
              </div>
            </div>

            {/* The event itself */}
            <div>
              <h4 className="mb-1 text-sm font-semibold">The event</h4>
              <div className="rounded-lg border px-4 py-2">
                <Row label="Tickets issued" value={String(review.activity.ticketsIssued)} />
                <Row label="Checked in at the door" value={String(review.activity.checkedIn)} />
                <Row
                  label="Attendee reviews"
                  value={review.activity.reviewCount === 0 ? 'none yet' : `${review.activity.averageRating?.toFixed(1)} / 5 from ${review.activity.reviewCount}`}
                />
                <Row label="Open reports" value={String(review.activity.openReports)} />
                <Row label="Open refund requests" value={String(review.activity.openRefunds)} />
              </div>
            </div>

            {/* Every sale */}
            {review.sales.length > 0 && (
              <div>
                <h4 className="mb-1 text-sm font-semibold">Every ticket sold</h4>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Buyer</th>
                        <th className="px-3 py-2 text-right font-medium">Paid</th>
                        <th className="px-3 py-2 text-right font-medium">Paystack</th>
                        <th className="px-3 py-2 text-right font-medium">Ziyawa</th>
                        <th className="px-3 py-2 text-right font-medium">Organiser</th>
                      </tr>
                    </thead>
                    <tbody>
                      {review.sales.map((s) => (
                        <tr key={s.reference} className="border-t">
                          <td className="px-3 py-2">
                            <span className="block">{s.buyerName}</span>
                            <span className="text-muted-foreground">{s.reference}</span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatMoneyExact(s.paidRands)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatMoneyExact(s.paystackFeeRands)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatMoneyExact(s.ziyawaFeeRands)}</td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">{formatMoneyExact(s.organiserRands)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Decline reasons */}
            {declining && (
              <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50/60 p-3">
                <p className="text-sm font-medium">Why is this on hold?</p>
                <p className="text-xs text-muted-foreground">
                  The organiser is emailed exactly these points, so they know what to do next. Their money stays where it is.
                </p>
                {PAYOUT_REJECTION_REASONS.map((reason) => (
                  <label key={reason.code} className="flex cursor-pointer gap-2.5 rounded border bg-background p-2.5 text-sm hover:bg-muted/40">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={codes.includes(reason.code)}
                      onChange={(e) =>
                        setCodes((c) => (e.target.checked ? [...c, reason.code] : c.filter((x) => x !== reason.code)))
                      }
                    />
                    <span>
                      <span className="block font-medium">{reason.adminLabel}</span>
                      <span className="text-xs text-muted-foreground">{reason.userMessage}</span>
                    </span>
                  </label>
                ))}
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything else? Added to the end of the message they receive."
                  rows={2}
                  maxLength={500}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={working}>
            Close
          </Button>
          <div className="flex gap-2">
            {!declining ? (
              <Button variant="outline" className="text-red-600" onClick={() => setDeclining(true)} disabled={working || !review}>
                <Ban className="mr-2 h-4 w-4" />
                Decline
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={decline}
                disabled={working || (codes.length === 0 && !note.trim())}
              >
                {working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirm decline
              </Button>
            )}
            {!declining && (
              <Button
                className="bg-green-600 text-white hover:bg-green-700"
                onClick={approve}
                disabled={working || !review?.canPayOut}
                title={review && !review.canPayOut ? 'Something is blocking this payout' : undefined}
              >
                {working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Approve and pay {review ? formatMoneyExact(review.balances.payoutNowRands) : ''}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
