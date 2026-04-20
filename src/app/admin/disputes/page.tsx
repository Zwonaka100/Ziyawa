'use client'

/**
 * ADMIN DISPUTES PAGE
 * /admin/disputes
 *
 * Lists all disputed bookings (artist + provider types).
 * Admin can resolve each dispute by releasing funds or issuing a refund.
 */

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCcw,
  XCircle,
} from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DisputeRow {
  id: string
  bookingType: 'artist' | 'provider'
  state: string
  amount: number
  disputedAt: string | null
  disputeReason: string | null
  disputeOpenedBy: string | null
  confirmedAt: string | null
  // parties
  organizerName: string
  organizerId: string
  recipientName: string
  // context
  contextLabel: string // artist name or service title
  eventTitle: string
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<DisputeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState<DisputeRow | null>(null)
  const [resolution, setResolution] = useState<'release' | 'refund'>('release')
  const [resolutionNotes, setResolutionNotes] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      const [{ data: artistDisputes }, { data: providerDisputes }] = await Promise.all([
        supabase
          .from('bookings')
          .select(`
            id, state, offered_amount, final_amount, disputed_at, dispute_reason, dispute_opened_by, confirmed_at,
            organizer:organizer_id (id, full_name),
            artists (stage_name, profiles:profile_id (full_name)),
            events (title)
          `)
          .eq('state', 'disputed')
          .order('disputed_at', { ascending: false }),

        supabase
          .from('provider_bookings')
          .select(`
            id, state, offered_amount, final_amount, disputed_at, dispute_reason, dispute_opened_by, confirmed_at,
            organizer:organizer_id (id, full_name),
            providers (business_name, profiles:profile_id (full_name)),
            provider_services (title),
            events (title)
          `)
          .eq('state', 'disputed')
          .order('disputed_at', { ascending: false }),
      ])

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const norm = (val: any) => Array.isArray(val) ? val[0] : val

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const artistRows: DisputeRow[] = (artistDisputes ?? []).map((b: any) => {
        const organizer = norm(b.organizer)
        const artist = norm(b.artists)
        const event = norm(b.events)
        const artistProfile = norm(artist?.profiles)
        return {
          id: b.id,
          bookingType: 'artist',
          state: b.state,
          amount: Number(b.final_amount ?? b.offered_amount),
          disputedAt: b.disputed_at,
          disputeReason: b.dispute_reason,
          disputeOpenedBy: b.dispute_opened_by,
          confirmedAt: b.confirmed_at,
          organizerName: organizer?.full_name ?? 'Unknown Organizer',
          organizerId: organizer?.id ?? '',
          recipientName: artistProfile?.full_name ?? artist?.stage_name ?? 'Unknown Artist',
          contextLabel: artist?.stage_name ?? 'Artist',
          eventTitle: event?.title ?? 'Unknown Event',
        }
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const providerRows: DisputeRow[] = (providerDisputes ?? []).map((b: any) => {
        const organizer = norm(b.organizer)
        const provider = norm(b.providers)
        const service = norm(b.provider_services)
        const event = norm(b.events)
        const providerProfile = norm(provider?.profiles)
        return {
          id: b.id,
          bookingType: 'provider',
          state: b.state,
          amount: Number(b.final_amount ?? b.offered_amount),
          disputedAt: b.disputed_at,
          disputeReason: b.dispute_reason,
          disputeOpenedBy: b.dispute_opened_by,
          confirmedAt: b.confirmed_at,
          organizerName: organizer?.full_name ?? 'Unknown Organizer',
          organizerId: organizer?.id ?? '',
          recipientName: providerProfile?.full_name ?? provider?.business_name ?? 'Unknown Provider',
          contextLabel: service?.title ?? provider?.business_name ?? 'Service',
          eventTitle: event?.title ?? 'Unknown Event',
        }
      })

      // Merge and sort by disputedAt descending
      const all = [...artistRows, ...providerRows].sort((a, b) =>
        (b.disputedAt ?? '').localeCompare(a.disputedAt ?? '')
      )
      setDisputes(all)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openResolveDialog = (dispute: DisputeRow) => {
    setSelected(dispute)
    setResolution('release')
    setResolutionNotes('')
    setDialogOpen(true)
  }

  const handleResolve = async () => {
    if (!selected) return
    setResolving(selected.id)
    try {
      const res = await fetch('/api/admin/disputes/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selected.id,
          bookingType: selected.bookingType,
          resolution,
          notes: resolutionNotes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(
        resolution === 'release'
          ? `Payment released to ${selected.recipientName}`
          : `Refund issued to ${selected.organizerName}`
      )
      setDialogOpen(false)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to resolve dispute')
    } finally {
      setResolving(null)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Disputes</h1>
          <p className="text-muted-foreground mt-1">
            Review and resolve disputed bookings. Resolutions are irreversible.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : disputes.length === 0 ? (
        <Card>
          <CardContent className="py-24 text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No active disputes</p>
            <p className="text-sm mt-1">All bookings are in good standing.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {disputes.map((d) => (
            <Card key={`${d.bookingType}-${d.id}`} className="border-orange-200">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  {/* Left: details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      <span className="font-semibold">{d.eventTitle}</span>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        Disputed
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {d.bookingType === 'artist' ? 'Artist' : 'Provider'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <div>
                        <span className="text-muted-foreground">Organizer: </span>
                        <span className="font-medium">{d.organizerName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {d.bookingType === 'artist' ? 'Artist: ' : 'Provider: '}
                        </span>
                        <span className="font-medium">{d.recipientName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Service/Role: </span>
                        <span className="font-medium">{d.contextLabel}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Amount: </span>
                        <span className="font-semibold">{formatCurrency(d.amount)}</span>
                      </div>
                      {d.confirmedAt && (
                        <div>
                          <span className="text-muted-foreground">Paid: </span>
                          <span>{format(new Date(d.confirmedAt), 'dd MMM yyyy')}</span>
                        </div>
                      )}
                      {d.disputedAt && (
                        <div>
                          <span className="text-muted-foreground">Disputed: </span>
                          <span>{format(new Date(d.disputedAt), 'dd MMM yyyy, HH:mm')}</span>
                        </div>
                      )}
                    </div>

                    {d.disputeReason && (
                      <div className="mt-2 rounded-md bg-orange-50 border border-orange-100 px-3 py-2">
                        <p className="text-xs text-orange-700 font-medium mb-0.5">Dispute reason</p>
                        <p className="text-sm">{d.disputeReason}</p>
                      </div>
                    )}
                  </div>

                  {/* Right: action */}
                  <div className="flex-shrink-0">
                    <Button
                      onClick={() => openResolveDialog(d)}
                      variant="outline"
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      Resolve Dispute
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Resolve Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
            <DialogDescription>
              {selected && (
                <>
                  <strong>{selected.eventTitle}</strong> — {formatCurrency(selected.amount)}
                  <br />
                  Organizer: {selected.organizerName} · {selected.bookingType === 'artist' ? 'Artist' : 'Provider'}: {selected.recipientName}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Resolution</Label>
              <div className="space-y-3">
                <div
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40 ${resolution === 'release' ? 'border-green-500 bg-green-50/40' : ''}`}
                  onClick={() => setResolution('release')}
                >
                  <input type="radio" name="resolution" value="release" id="release" checked={resolution === 'release'} onChange={() => setResolution('release')} className="mt-1" />
                  <Label htmlFor="release" className="cursor-pointer space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Release payment to {selected?.bookingType === 'artist' ? 'artist' : 'provider'}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Funds are moved from escrow to {selected?.recipientName}&apos;s wallet. Booking marked completed.
                    </p>
                  </Label>
                </div>
                <div
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40 ${resolution === 'refund' ? 'border-red-400 bg-red-50/40' : ''}`}
                  onClick={() => setResolution('refund')}
                >
                  <input type="radio" name="resolution" value="refund" id="refund" checked={resolution === 'refund'} onChange={() => setResolution('refund')} className="mt-1" />
                  <Label htmlFor="refund" className="cursor-pointer space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="font-medium">Refund organizer</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Funds are returned from escrow to {selected?.organizerName}&apos;s wallet. Booking marked cancelled.
                    </p>
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-sm font-medium">
                Resolution notes <span className="text-muted-foreground font-normal">(optional — shown to both parties)</span>
              </Label>
              <Textarea
                id="notes"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="e.g. Artist failed to show up. Refund issued per platform policy."
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={!!resolving}
              variant={resolution === 'refund' ? 'destructive' : 'default'}
            >
              {resolving ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Resolving…</>
              ) : resolution === 'release' ? (
                'Release Payment'
              ) : (
                'Issue Refund'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
