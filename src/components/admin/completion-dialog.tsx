'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { formatMoneyExact } from '@/lib/helpers'
import type { CompletionBreakdown } from '@/lib/admin/completion-breakdown'

/**
 * What completing an event actually does, shown before it is approved.
 *
 * This replaces `window.confirm('Mark this event as completed?')`, which told
 * an admin nothing about the money they were releasing.
 */
/** One line of the breakdown. Module scope so it is not recreated per render. */
function Row({
  label,
  value,
  strong = false,
  tone,
}: {
  label: string
  value: string
  strong?: boolean
  tone?: 'good' | 'cost'
}) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className={strong ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
      <span
        className={[
          strong ? 'font-bold' : 'font-medium',
          tone === 'cost' ? 'text-red-600' : '',
          tone === 'good' ? 'text-green-600' : '',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  )
}

export function CompletionDialog({
  open,
  eventId,
  onOpenChange,
  onConfirm,
  confirming,
}: {
  open: boolean
  eventId: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  confirming: boolean
}) {
  const [breakdown, setBreakdown] = useState<CompletionBreakdown | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/events/${eventId}/completion-preview`, {
          cache: 'no-store',
        })
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error || 'Failed to load breakdown')
        if (!cancelled) setBreakdown(payload)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load breakdown')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [open, eventId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete this event?</DialogTitle>
          <DialogDescription>
            Completion releases the organiser&apos;s held funds so they can be paid out. Here
            is everything it covers.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Working out the numbers…
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
        )}

        {breakdown && !loading && (
          <div className="space-y-4">
            <div>
              <p className="font-medium">{breakdown.eventTitle}</p>
              <p className="text-sm text-muted-foreground">
                {breakdown.organiserName || 'Unknown organiser'} ·{' '}
                {breakdown.ticketsSold} ticket{breakdown.ticketsSold === 1 ? '' : 's'} sold
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Where the money went
              </p>
              <Row label="Buyers paid" value={formatMoneyExact(breakdown.grossTakenRands)} />
              <Row
                label="Booking fees charged"
                value={formatMoneyExact(breakdown.bookingFeesRands)}
              />
              <Row
                label="Paystack took"
                value={`− ${formatMoneyExact(breakdown.paystackFeesRands)}`}
                tone="cost"
              />
              <div className="border-t mt-2 pt-2">
                <Row
                  label="Ziyawa keeps"
                  value={formatMoneyExact(breakdown.ziyawaNetRands)}
                  strong
                  tone="good"
                />
                <Row
                  label="Organiser earns"
                  value={formatMoneyExact(breakdown.organiserEarnsRands)}
                  strong
                />
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                What completing does
              </p>
              <Row
                label="Released from held to available"
                value={formatMoneyExact(breakdown.releasesRands)}
                strong
              />
              <Row
                label="Paystack balance now"
                value={
                  breakdown.paystackBalanceRands === null
                    ? 'Could not read'
                    : formatMoneyExact(breakdown.paystackBalanceRands)
                }
              />
              <Row
                label="Transfer will cost (absorbed by Ziyawa)"
                value={formatMoneyExact(breakdown.expectedTransferCostRands)}
                tone="cost"
              />
            </div>

            {!breakdown.organiserVerified && (
              <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  This organiser is not verified, so the released funds cannot be paid out
                  until they are. Completion still works.
                </span>
              </div>
            )}

            {!breakdown.meetsPayoutFloor && breakdown.releasesRands > 0 && (
              <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Below the {formatMoneyExact(breakdown.minimumPayoutRands)} payout minimum, so
                  this will not queue a transfer on its own — it accumulates until their
                  balance clears the floor.
                </span>
              </div>
            )}

            {breakdown.balanceAfterReleaseRands !== null &&
              breakdown.balanceAfterReleaseRands < 0 && (
                <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-900">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    The Paystack balance is{' '}
                    {formatMoneyExact(Math.abs(breakdown.balanceAfterReleaseRands))} short of
                    this release. Completing is still fine — it moves no money out — but the
                    balance has to be topped up before the payout can be approved.
                  </span>
                </div>
              )}

            {breakdown.balanceAfterReleaseRands !== null &&
              breakdown.balanceAfterReleaseRands >= 0 && (
                <div className="flex items-start gap-2 rounded-md bg-green-50 p-3 text-sm text-green-900">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Paystack balance covers this release, with{' '}
                    {formatMoneyExact(breakdown.balanceAfterReleaseRands)} remaining.
                  </span>
                </div>
              )}

            {breakdown.alreadyCompleted && (
              <p className="text-sm text-muted-foreground">
                This event is already marked complete.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={confirming || loading || !breakdown}>
            {confirming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Complete event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
