/**
 * Open disputes for admin, across both booking tables, shared by the API route
 * and the server page.
 *
 * Artist and provider bookings are separate tables with parallel shapes, so
 * both are read together and normalised into one list.
 */

import { createAdminServiceClient } from '@/lib/admin-auth'

export interface DisputeRow {
  id: string
  bookingType: 'artist' | 'provider'
  state: string
  amount: number
  disputedAt: string | null
  disputeReason: string | null
  disputeOpenedBy: string | null
  confirmedAt: string | null
  organizerName: string
  organizerId: string
  recipientName: string
  contextLabel: string
  eventTitle: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const norm = (val: any) => (Array.isArray(val) ? val[0] : val)

export async function listOpenDisputes(): Promise<DisputeRow[]> {
  const supabaseAdmin = createAdminServiceClient()

  const [{ data: artistDisputes }, { data: providerDisputes }] = await Promise.all([
    supabaseAdmin
      .from('bookings')
      .select(`
        id, state, offered_amount, final_amount, disputed_at, dispute_reason, dispute_opened_by, confirmed_at,
        organizer:organizer_id (id, full_name),
        artists (stage_name, profiles:profile_id (full_name)),
        events (title)
      `)
      .eq('state', 'disputed')
      .order('disputed_at', { ascending: false }),

    supabaseAdmin
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

  return [...artistRows, ...providerRows].sort((a, b) =>
    (b.disputedAt ?? '').localeCompare(a.disputedAt ?? '')
  )
}
