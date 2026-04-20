'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { EventStaffManager } from '@/components/events/event-staff-manager'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/helpers'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Loader2,
  MessageSquare,
  Music,
  Plus,
  Users,
  Wrench,
  XCircle,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArtistBooking {
  id: string
  state: string
  offered_amount: number
  final_amount: number | null
  artist_notes: string | null
  organizer_notes: string | null
  created_at: string
  organizer_id: string
  artists: {
    id: string
    stage_name: string
    genre: string
    profile_image: string | null
    profile_id: string
  } | null
}

interface ProviderBooking {
  id: string
  state: string
  offered_amount: number
  final_amount: number | null
  service_date: string
  quantity: number
  special_requirements: string | null
  organizer_notes: string | null
  provider_notes: string | null
  organizer_completed_at: string | null
  provider_completed_at: string | null
  providers: {
    id: string
    business_name: string | null
    primary_category: string | null
    profile_id: string
  } | null
  provider_services: {
    id: string
    title: string
    price_unit: string
  } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATE_CONFIG: Record<string, { label: string; className: string }> = {
  pending:   { label: 'Pending',   className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  accepted:  { label: 'Accepted',  className: 'bg-blue-100 text-blue-800 border-blue-200' },
  confirmed: { label: 'Confirmed', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  paid:      { label: 'Paid',      className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  declined:  { label: 'Declined',  className: 'bg-red-100 text-red-800 border-red-200' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800 border-green-200' },
  disputed:  { label: 'Disputed',  className: 'bg-orange-100 text-orange-800 border-orange-200' },
}

function StateBadge({ state }: { state: string }) {
  const cfg = STATE_CONFIG[state] ?? { label: state, className: 'bg-slate-100 text-slate-700' }
  return (
    <Badge variant="outline" className={cfg.className}>
      {cfg.label}
    </Badge>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventBookingsPage() {
  const params = useParams()
  const eventId = params.id as string
  const { profile, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [eventTitle, setEventTitle] = useState('')
  const [artistBookings, setArtistBookings] = useState<ArtistBooking[]>([])
  const [providerBookings, setProviderBookings] = useState<ProviderBooking[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  // Dispute dialog
  const [disputeDialog, setDisputeDialog] = useState<{
    id: string
    bookingType: 'artist' | 'provider'
  } | null>(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeSubmitting, setDisputeSubmitting] = useState(false)

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    try {
      const supabase = createClient()

      const [{ data: event }, { data: ab }, { data: pb }] = await Promise.all([
        supabase
          .from('events')
          .select('title')
          .eq('id', eventId)
          .eq('organizer_id', profile.id)
          .single(),

        supabase
          .from('bookings')
          .select(`
            id, state, offered_amount, final_amount,
            artist_notes, organizer_notes, created_at, organizer_id,
            artists (id, stage_name, genre, profile_image, profile_id)
          `)
          .eq('event_id', eventId)
          .eq('organizer_id', profile.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('provider_bookings')
          .select(`
            id, state, offered_amount, final_amount, service_date, quantity,
            special_requirements, organizer_notes, provider_notes,
            organizer_completed_at, provider_completed_at,
            providers (id, business_name, primary_category, profile_id),
            provider_services (id, title, price_unit)
          `)
          .eq('event_id', eventId)
          .eq('organizer_id', profile.id)
          .order('created_at', { ascending: false }),
      ])

      if (event) setEventTitle(event.title)

      // Supabase returns FK-joined relations as arrays; normalise to single object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normArtist = (rows: any[]): ArtistBooking[] =>
        rows.map(r => ({ ...r, artists: Array.isArray(r.artists) ? (r.artists[0] ?? null) : r.artists }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normProvider = (rows: any[]): ProviderBooking[] =>
        rows.map(r => ({
          ...r,
          providers: Array.isArray(r.providers) ? (r.providers[0] ?? null) : r.providers,
          provider_services: Array.isArray(r.provider_services) ? (r.provider_services[0] ?? null) : r.provider_services,
        }))

      setArtistBookings(normArtist(ab ?? []))
      setProviderBookings(normProvider(pb ?? []))
    } finally {
      setLoading(false)
    }
  }, [profile?.id, eventId])

  useEffect(() => {
    if (!authLoading && profile?.id) load()
  }, [authLoading, profile?.id, load])

  // ── Actions ─────────────────────────────────────────────────────────────────
  const cancelArtistBooking = async (bookingId: string) => {
    if (!confirm('Cancel this artist booking?')) return
    setBusyId(bookingId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('bookings')
        .update({ state: 'cancelled' })
        .eq('id', bookingId)
        .eq('organizer_id', profile!.id)
      if (error) throw error
      toast.success('Booking cancelled')
      await load()
    } catch {
      toast.error('Failed to cancel booking')
    } finally {
      setBusyId(null)
    }
  }

  const completeArtistBooking = async (bookingId: string) => {
    if (!confirm('Mark this booking as completed? Both parties need to confirm before the artist is paid out.')) return
    setBusyId(bookingId)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/complete`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(data.message || 'Completion recorded — waiting for artist to confirm')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to mark as complete')
    } finally {
      setBusyId(null)
    }
  }

  const cancelProviderBooking = async (bookingId: string) => {
    if (!confirm('Cancel this service booking?')) return
    setBusyId(bookingId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('provider_bookings')
        .update({ state: 'declined' })
        .eq('id', bookingId)
        .eq('organizer_id', profile!.id)
      if (error) throw error
      toast.success('Booking cancelled')
      await load()
    } catch {
      toast.error('Failed to cancel booking')
    } finally {
      setBusyId(null)
    }
  }

  const completeProviderBooking = async (bookingId: string) => {
    if (!confirm('Mark this service as completed? Both parties need to confirm before the provider is paid out.')) return
    setBusyId(bookingId)
    try {
      const res = await fetch(`/api/provider-bookings/${bookingId}/complete`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Completion recorded — waiting for provider to confirm')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to mark as complete')
    } finally {
      setBusyId(null)
    }
  }

  const payBooking = async (bookingId: string, bookingType: 'artist' | 'provider') => {
    setBusyId(bookingId)
    try {
      const res = await fetch('/api/payments/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, bookingType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.authorizationUrl
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to initiate payment')
      setBusyId(null)
    }
  }

  const submitDispute = async () => {
    if (!disputeDialog) return
    const reason = disputeReason.trim()
    if (!reason) { toast.error('Please describe the dispute'); return }
    setDisputeSubmitting(true)
    try {
      const endpoint = disputeDialog.bookingType === 'artist'
        ? `/api/bookings/${disputeDialog.id}/dispute`
        : `/api/provider-bookings/${disputeDialog.id}/dispute`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(data.message ?? 'Dispute opened — our team will review within 2 business days')
      setDisputeDialog(null)
      setDisputeReason('')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to open dispute')
    } finally {
      setDisputeSubmitting(false)
    }
  }

  const openChat = async (recipientProfileId: string, contextType: string, contextId: string) => {
    try {
      const res = await fetch('/api/conversations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: recipientProfileId, contextType, contextId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.conversationId) {
        window.location.href = `/messages?chat=${data.conversationId}`
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Cannot open chat for this booking')
    }
  }

  // ── Payment summary ──────────────────────────────────────────────────────────
  const INACTIVE = ['cancelled', 'declined']

  const allObligations = [
    ...artistBookings
      .filter(b => !INACTIVE.includes(b.state))
      .map(b => ({
        name: b.artists?.stage_name ?? 'Artist',
        type: 'Artist',
        amount: b.final_amount ?? b.offered_amount,
        state: b.state,
      })),
    ...providerBookings
      .filter(b => !INACTIVE.includes(b.state))
      .map(b => ({
        name: b.providers?.business_name ?? 'Provider',
        type: b.provider_services?.title ?? 'Service',
        amount: b.final_amount ?? b.offered_amount,
        state: b.state,
      })),
  ]

  const totalObligations = allObligations.reduce((s, o) => s + o.amount, 0)
  const totalCompleted   = allObligations.filter(o => o.state === 'completed').reduce((s, o) => s + o.amount, 0)
  const totalOutstanding = totalObligations - totalCompleted

  const pendingArtists   = artistBookings.filter(b => b.state === 'pending').length
  const pendingProviders = providerBookings.filter(b => b.state === 'pending').length

  // ── Render ───────────────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href={`/dashboard/organizer/events/${eventId}/manage`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Book, Manage &amp; Pay</h1>
          {eventTitle && (
            <p className="text-muted-foreground">{eventTitle}</p>
          )}
        </div>
      </div>

      {/* Payment summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalObligations)}</p>
                <p className="text-sm text-muted-foreground">Total obligations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalCompleted)}</p>
                <p className="text-sm text-muted-foreground">Paid out</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</p>
                <p className="text-sm text-muted-foreground">Outstanding</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="artists" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="artists" className="flex items-center gap-1.5">
            <Music className="h-3.5 w-3.5" />
            Artists
            {pendingArtists > 0 && (
              <span className="ml-0.5 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
                {pendingArtists}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Staff
          </TabsTrigger>
          <TabsTrigger value="providers" className="flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5" />
            Services
            {pendingProviders > 0 && (
              <span className="ml-0.5 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
                {pendingProviders}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            Payments
          </TabsTrigger>
        </TabsList>

        {/* ── Artists ── */}
        <TabsContent value="artists" className="space-y-3">
          <div className="flex justify-end">
            <Link href={`/dashboard/organizer/events/${eventId}/book`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Book Artist
              </Button>
            </Link>
          </div>

          {artistBookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Music className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="mb-2">No artist bookings yet.</p>
                <Link href={`/dashboard/organizer/events/${eventId}/book`} className="text-primary underline underline-offset-4">
                  Book an artist
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {artistBookings.map((booking) => {
                const isBusy      = busyId === booking.id
                const canCancel   = booking.state === 'pending'
                const canPay      = booking.state === 'accepted'
                const canComplete = booking.state === 'confirmed'
                const canDispute  = booking.state === 'confirmed'
                const canChat     = ['pending', 'accepted', 'confirmed'].includes(booking.state)

                return (
                  <Card key={booking.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{booking.artists?.stage_name ?? 'Unknown Artist'}</p>
                            <StateBadge state={booking.state} />
                          </div>
                          {booking.artists?.genre && (
                            <p className="text-sm text-muted-foreground">{booking.artists.genre}</p>
                          )}
                          <p className="text-sm">
                            Offered:{' '}
                            <span className="font-medium">{formatCurrency(booking.offered_amount)}</span>
                            {booking.final_amount != null && booking.final_amount !== booking.offered_amount && (
                              <>
                                {' '}→ Final:{' '}
                                <span className="font-medium">{formatCurrency(booking.final_amount)}</span>
                              </>
                            )}
                          </p>
                          {booking.artist_notes && (
                            <p className="text-sm text-muted-foreground italic">&quot;{booking.artist_notes}&quot;</p>
                          )}
                          {booking.state === 'pending' && (
                            <p className="text-xs text-amber-600 font-medium">Waiting for artist to respond</p>
                          )}
                          {canPay && (
                            <p className="text-xs text-blue-600 font-medium">
                              Artist accepted — click Pay Artist to lock in the booking
                            </p>
                          )}
                          {canComplete && (
                            <p className="text-xs text-blue-600">
                              Ready to complete — both parties must confirm before payout releases
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
                          {canChat && booking.artists?.profile_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openChat(booking.artists!.profile_id, 'booking', booking.id)}
                            >
                              <MessageSquare className="h-3.5 w-3.5 mr-1" />
                              Chat
                            </Button>
                          )}
                          {canPay && (
                            <Button
                              size="sm"
                              onClick={() => payBooking(booking.id, 'artist')}
                              disabled={isBusy}
                            >
                              {isBusy
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                : <CreditCard className="h-3.5 w-3.5 mr-1" />}
                              Pay Artist
                            </Button>
                          )}
                          {canComplete && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => completeArtistBooking(booking.id)}
                              disabled={isBusy}
                            >
                              {isBusy
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                              Mark Complete
                            </Button>
                          )}
                          {canCancel && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => cancelArtistBooking(booking.id)}
                              disabled={isBusy}
                            >
                              {isBusy
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                : <XCircle className="h-3.5 w-3.5 mr-1" />}
                              Cancel
                            </Button>
                          )}
                          {canDispute && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-orange-600 hover:text-orange-700"
                              onClick={() => { setDisputeDialog({ id: booking.id, bookingType: 'artist' }); setDisputeReason('') }}
                            >
                              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                              Dispute
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Staff ── */}
        <TabsContent value="staff">
          <EventStaffManager eventId={eventId} />
        </TabsContent>

        {/* ── Service Providers ── */}
        <TabsContent value="providers" className="space-y-3">
          <div className="flex justify-end">
            <Link href="/crew">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Browse Crew &amp; Services
              </Button>
            </Link>
          </div>

          {providerBookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Wrench className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="mb-2">No service bookings yet.</p>
                <Link href="/crew" className="text-primary underline underline-offset-4">
                  Browse crew &amp; services
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {providerBookings.map((booking) => {
                const isBusy       = busyId === booking.id
                const canCancel    = booking.state === 'pending'
                const canPay       = booking.state === 'accepted'
                const canComplete  = booking.state === 'confirmed'
                const canDispute   = booking.state === 'confirmed'
                const orgCompleted = Boolean(booking.organizer_completed_at)
                const canChat      = ['pending', 'accepted', 'confirmed'].includes(booking.state)

                return (
                  <Card key={booking.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">
                              {booking.providers?.business_name ?? 'Unknown Provider'}
                            </p>
                            <StateBadge state={booking.state} />
                          </div>
                          {booking.provider_services?.title && (
                            <p className="text-sm text-muted-foreground">
                              {booking.provider_services.title}
                              {booking.quantity > 1 && ` × ${booking.quantity}`}
                            </p>
                          )}
                          <p className="text-sm">
                            Offered:{' '}
                            <span className="font-medium">{formatCurrency(booking.offered_amount)}</span>
                            {booking.final_amount != null && booking.final_amount !== booking.offered_amount && (
                              <>
                                {' '}→ Final:{' '}
                                <span className="font-medium">{formatCurrency(booking.final_amount)}</span>
                              </>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Service date: {formatDate(booking.service_date)}
                          </p>
                          {booking.state === 'pending' && (
                            <p className="text-xs text-amber-600 font-medium">Waiting for provider to respond</p>
                          )}
                          {canPay && (
                            <p className="text-xs text-blue-600 font-medium">
                              Provider accepted — click Pay Provider to lock in the booking
                            </p>
                          )}
                          {canComplete && orgCompleted && (
                            <p className="text-xs text-blue-600">
                              You confirmed — waiting for provider to confirm before payout releases
                            </p>
                          )}
                          {booking.provider_notes && (
                            <p className="text-sm text-muted-foreground italic">&quot;{booking.provider_notes}&quot;</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
                          {canChat && booking.providers?.profile_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openChat(booking.providers!.profile_id, 'provider_booking', booking.id)}
                            >
                              <MessageSquare className="h-3.5 w-3.5 mr-1" />
                              Chat
                            </Button>
                          )}
                          {canPay && (
                            <Button
                              size="sm"
                              onClick={() => payBooking(booking.id, 'provider')}
                              disabled={isBusy}
                            >
                              {isBusy
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                : <CreditCard className="h-3.5 w-3.5 mr-1" />}
                              Pay Provider
                            </Button>
                          )}
                          {canComplete && !orgCompleted && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => completeProviderBooking(booking.id)}
                              disabled={isBusy}
                            >
                              {isBusy
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                              Mark Complete
                            </Button>
                          )}
                          {canCancel && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => cancelProviderBooking(booking.id)}
                              disabled={isBusy}
                            >
                              {isBusy
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                : <XCircle className="h-3.5 w-3.5 mr-1" />}
                              Cancel
                            </Button>
                          )}
                          {canDispute && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-orange-600 hover:text-orange-700"
                              onClick={() => { setDisputeDialog({ id: booking.id, bookingType: 'provider' }); setDisputeReason('') }}
                            >
                              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                              Dispute
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Payments ── */}
        <TabsContent value="payments" className="space-y-4">
          {allObligations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-40" />
                No financial obligations for this event yet.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Financial Obligations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {allObligations.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.type}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StateBadge state={item.state} />
                        <p className="font-semibold tabular-nums w-24 text-right">
                          {formatCurrency(item.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t pt-4 space-y-1.5">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Total obligations</span>
                    <span className="tabular-nums">{formatCurrency(totalObligations)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Paid out</span>
                    <span className="tabular-nums">{formatCurrency(totalCompleted)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1.5 mt-1">
                    <span>Outstanding</span>
                    <span className="tabular-nums">{formatCurrency(totalOutstanding)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {totalOutstanding > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="py-4 flex items-start gap-3">
                <Clock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  Outstanding payments are released once both parties mark the booking as complete and any escrow hold period has passed.
                  Contact <Link href="/support" className="underline underline-offset-2">support</Link> if you have a dispute.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dispute Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={!!disputeDialog} onOpenChange={(open) => { if (!open) setDisputeDialog(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Open a Dispute
            </DialogTitle>
            <DialogDescription>
              Disputes freeze the escrow funds until our team reviews the case.
              Please describe the issue clearly so we can resolve it quickly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="dispute-reason">Reason <span className="text-muted-foreground font-normal">(required)</span></Label>
            <Textarea
              id="dispute-reason"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="e.g. Artist did not perform the agreed set. The provider cancelled on the day without notice."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">Our team will review within 2 business days and contact both parties.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDisputeDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submitDispute}
              disabled={disputeSubmitting || !disputeReason.trim()}
            >
              {disputeSubmitting
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting…</>
                : 'Submit Dispute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
