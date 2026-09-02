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

export interface AdminEventDetail {
  event: Record<string, unknown> | null
  buyers: TicketBuyer[]
  reports: Record<string, unknown>[]
}

export async function loadAdminEventDetail(eventId: string): Promise<AdminEventDetail> {
  const supabaseAdmin = createAdminServiceClient()

  // None of the three depend on each other, so they go together.
  const [eventResult, ticketsResult, reportsResult] = await Promise.all([
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

  return {
    event: eventResult.data as Record<string, unknown> | null,
    buyers,
    reports: (reportsResult.data || []) as Record<string, unknown>[],
  }
}
