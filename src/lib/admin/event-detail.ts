/**
 * Admin event detail, shared by the API route and the server page.
 *
 * The ticket-buyer list on this page had never worked. It read the `bookings`
 * table through a foreign key called bookings_user_id_fkey, selecting quantity,
 * total_amount and status. None of that exists: `bookings` is the ARTIST
 * booking table (artist_id, organizer_id, state, offered_amount) and has no
 * user, quantity, total_amount or status column at all. Ticket purchases live
 * in `tickets`. PostgREST rejected the query, the result was discarded without
 * checking the error, and the section rendered empty for every event.
 *
 * It now reads tickets, which is where ticket buyers actually are.
 */

import { createAdminServiceClient } from '@/lib/admin-auth'

export interface TicketBuyer {
  id: string
  quantity: number
  total_amount: number
  status: string
  created_at: string
  user?: { full_name: string; email: string }
}

/** One completed ticket sale, with what each party took. */
export interface EventSale {
  reference: string
  buyerName: string
  buyerEmail: string
  state: string
  paidRands: number
  paystackFeeRands: number
  ziyawaFeeRands: number
  organiserRands: number
  purchasedAt: string
}

export interface EventReview {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  reviewerName: string
}

export interface EventBooking {
  id: string
  kind: 'Artist' | 'Crew'
  who: string
  state: string
  amountRands: number
  createdAt: string
}

export interface AdminEventDetail {
  event: Record<string, unknown> | null
  buyers: TicketBuyer[]
  reports: Record<string, unknown>[]
  sales: EventSale[]
  money: {
    grossRands: number
    paystackFeesRands: number
    ziyawaFeesRands: number
    ziyawaNetRands: number
    organiserRands: number
    heldRands: number
    releasedRands: number
  }
  reviews: EventReview[]
  averageRating: number | null
  eventBookings: EventBooking[]
  attendance: { issued: number; checkedIn: number }
}

export async function loadAdminEventDetail(eventId: string): Promise<AdminEventDetail> {
  const supabaseAdmin = createAdminServiceClient()

  // None of the three depend on each other, so they go together.
  const [eventResult, ticketsResult, reportsResult, salesResult, reviewsResult, artistBookingsResult, crewBookingsResult] = await Promise.all([
    supabaseAdmin
      .from('events')
      .select(`*, organizer:profiles!events_organizer_id_fkey(id, full_name, email, avatar_url, phone)`)
      .eq('id', eventId)
      .maybeSingle(),
    supabaseAdmin
      .from('tickets')
      .select('id, price_paid, created_at, buyer_name, buyer_email, is_used, user_id')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('reports')
      .select('*')
      .eq('reported_type', 'event')
      .eq('reported_id', eventId)
      .order('created_at', { ascending: false }),
    // Money that actually moved, per sale. Abandoned checkouts never took a
    // cent, so they are excluded rather than inflating the totals.
    supabaseAdmin
      .from('transactions')
      .select('reference, state, amount, platform_fee, net_amount, gateway_fee_cents, created_at, payer:profiles!transactions_payer_id_fkey(full_name, email)')
      .eq('event_id', eventId)
      .eq('type', 'ticket_purchase')
      .not('state', 'in', '(initiated,failed)')
      .order('created_at', { ascending: false }),
    // No embed here on purpose: reviews.user_id references auth.users, not
    // profiles, so there is no foreign key for PostgREST to join through. The
    // reviewer names are fetched separately below.
    supabaseAdmin
      .from('reviews')
      .select('id, rating, comment, is_anonymous, user_id, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('bookings')
      .select('id, state, offered_amount, final_amount, created_at, artist:artists(stage_name)')
      .eq('event_id', eventId),
    supabaseAdmin
      .from('provider_bookings')
      .select('id, state, offered_amount, final_amount, created_at')
      .eq('event_id', eventId),
  ])

  if (eventResult.error) throw new Error('Failed to load event')
  if (ticketsResult.error) {
    console.error('Failed to load ticket buyers:', ticketsResult.error)
  }

  // One ticket is one admission, so each row is a quantity of one. Presented in
  // the shape the table already renders.
  const buyers: TicketBuyer[] = (ticketsResult.data || []).map((t) => ({
    id: t.id,
    quantity: 1,
    total_amount: Number(t.price_paid || 0),
    status: t.is_used ? 'checked in' : 'valid',
    created_at: t.created_at,
    user: {
      full_name: t.buyer_name || 'Guest',
      email: t.buyer_email || '',
    },
  }))

  const CENTS = 100
  const saleRows = (salesResult.data || []) as unknown as {
    reference: string; state: string; amount: number; platform_fee: number
    net_amount: number; gateway_fee_cents: number | null; created_at: string
    payer: { full_name: string | null; email: string } | null
  }[]

  const sales: EventSale[] = saleRows.map((row) => ({
    reference: row.reference,
    buyerName: row.payer?.full_name || row.payer?.email || 'Unknown buyer',
    buyerEmail: row.payer?.email || '',
    state: row.state,
    paidRands: Number(row.amount || 0) / CENTS,
    paystackFeeRands: Number(row.gateway_fee_cents || 0) / CENTS,
    ziyawaFeeRands: Number(row.platform_fee || 0) / CENTS,
    organiserRands: Number(row.net_amount || 0) / CENTS,
    purchasedAt: row.created_at,
  }))

  const total = (pick: (s: EventSale) => number) => sales.reduce((sum, s) => sum + pick(s), 0)
  const ziyawaFeesRands = total((s) => s.ziyawaFeeRands)
  const paystackFeesRands = total((s) => s.paystackFeeRands)

  const reviewRows = (reviewsResult.data || []) as unknown as {
    id: string; rating: number; comment: string | null
    is_anonymous: boolean | null; user_id: string | null; created_at: string
  }[]

  // profiles.id and auth.users.id are the same value, so the names resolve with
  // one lookup rather than a join PostgREST cannot make.
  const reviewerIds = [...new Set(reviewRows.map((r) => r.user_id).filter(Boolean))] as string[]
  const reviewerNames = new Map<string, string>()
  if (reviewerIds.length) {
    const { data: reviewerProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .in('id', reviewerIds)
    for (const p of reviewerProfiles || []) reviewerNames.set(p.id, p.full_name || 'Attendee')
  }

  const reviews: EventReview[] = reviewRows.map((r) => ({
    id: r.id,
    rating: Number(r.rating),
    comment: r.comment,
    createdAt: r.created_at,
    // An anonymous review stays anonymous, even to an admin reading the page.
    reviewerName: r.is_anonymous
      ? 'Anonymous'
      : (r.user_id ? reviewerNames.get(r.user_id) ?? 'Attendee' : 'Attendee'),
  }))

  const eventBookings: EventBooking[] = [
    ...((artistBookingsResult.data || []) as unknown as { id: string; state: string; offered_amount: number; final_amount: number | null; created_at: string; artist: { stage_name: string | null } | null }[])
      .map((b) => ({
        id: b.id,
        kind: 'Artist' as const,
        who: b.artist?.stage_name || 'Artist',
        state: b.state,
        amountRands: Number(b.final_amount ?? b.offered_amount ?? 0),
        createdAt: b.created_at,
      })),
    ...((crewBookingsResult.data || []) as unknown as { id: string; state: string; offered_amount: number; final_amount: number | null; created_at: string }[])
      .map((b) => ({
        id: b.id,
        kind: 'Crew' as const,
        who: 'Crew / provider',
        state: b.state,
        amountRands: Number(b.final_amount ?? b.offered_amount ?? 0),
        createdAt: b.created_at,
      })),
  ]

  const ticketRows = ticketsResult.data || []

  return {
    event: eventResult.data as Record<string, unknown> | null,
    buyers,
    reports: (reportsResult.data || []) as Record<string, unknown>[],
    sales,
    money: {
      grossRands: total((s) => s.paidRands),
      paystackFeesRands,
      ziyawaFeesRands,
      ziyawaNetRands: ziyawaFeesRands - paystackFeesRands,
      organiserRands: total((s) => s.organiserRands),
      heldRands: sales.filter((s) => s.state === 'held').reduce((sum, s) => sum + s.organiserRands, 0),
      releasedRands: sales.filter((s) => s.state !== 'held').reduce((sum, s) => sum + s.organiserRands, 0),
    },
    reviews,
    averageRating: reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : null,
    eventBookings,
    attendance: {
      issued: ticketRows.length,
      checkedIn: ticketRows.filter((t) => t.is_used).length,
    },
  }
}
