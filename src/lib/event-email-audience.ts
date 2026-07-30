import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface EventEmailRecipient {
  email: string
  name: string
  userId: string | null
  role: 'attendee' | 'artist' | 'provider' | 'crew'
}

interface EventEmailAudience {
  attendees: EventEmailRecipient[]
  artists: EventEmailRecipient[]
  providers: EventEmailRecipient[]
  crew: EventEmailRecipient[]
}

function normalizeEmail(email: string | null | undefined) {
  return String(email || '').trim().toLowerCase()
}

function dedupeRecipients(recipients: EventEmailRecipient[]) {
  const map = new Map<string, EventEmailRecipient>()

  for (const recipient of recipients) {
    const email = normalizeEmail(recipient.email)
    if (!email || map.has(email)) continue
    map.set(email, {
      ...recipient,
      email,
    })
  }

  return Array.from(map.values())
}

export async function getEventEmailAudience(eventId: string): Promise<EventEmailAudience> {
  const attendees: EventEmailRecipient[] = []
  const artists: EventEmailRecipient[] = []
  const providers: EventEmailRecipient[] = []
  const crew: EventEmailRecipient[] = []

  const { data: tickets } = await supabaseAdmin
    .from('tickets')
    .select('user_id, attendee_name, attendee_email, buyer_name, buyer_email')
    .eq('event_id', eventId)

  for (const ticket of tickets || []) {
    const email = normalizeEmail(ticket.attendee_email || ticket.buyer_email)
    if (!email) continue

    attendees.push({
      email,
      name: String(ticket.attendee_name || ticket.buyer_name || 'there'),
      userId: ticket.user_id ? String(ticket.user_id) : null,
      role: 'attendee',
    })
  }

  const { data: guestPasses, error: passError } = await supabaseAdmin
    .from('event_access_passes')
    .select('full_name, email')
    .eq('event_id', eventId)

  if (!passError) {
    for (const pass of guestPasses || []) {
      const email = normalizeEmail(pass.email)
      if (!email) continue

      attendees.push({
        email,
        name: String(pass.full_name || 'there'),
        userId: null,
        role: 'attendee',
      })
    }
  }

  const { data: bookingRows } = await supabaseAdmin
    .from('bookings')
    .select('artist_id, state')
    .eq('event_id', eventId)
    .in('state', ['pending', 'accepted', 'confirmed'])

  const artistIds = Array.from(new Set((bookingRows || []).map((row) => row.artist_id).filter(Boolean)))
  if (artistIds.length > 0) {
    const { data: artistRows } = await supabaseAdmin
      .from('artists')
      .select('id, stage_name, profile_id')
      .in('id', artistIds)

    const profileIds = Array.from(new Set((artistRows || []).map((artist) => artist.profile_id).filter(Boolean)))
    const artistProfiles = profileIds.length > 0
      ? (await supabaseAdmin.from('profiles').select('id, full_name, email').in('id', profileIds)).data || []
      : []

    const profilesById = new Map((artistProfiles || []).map((profile) => [profile.id, profile]))
    for (const artist of artistRows || []) {
      const profile = profilesById.get(String(artist.profile_id || ''))
      const email = normalizeEmail(profile?.email)
      if (!email) continue

      artists.push({
        email,
        name: String(profile?.full_name || artist.stage_name || 'there'),
        userId: profile?.id ? String(profile.id) : null,
        role: 'artist',
      })
    }
  }

  const { data: providerBookingRows } = await supabaseAdmin
    .from('provider_bookings')
    .select('provider_id, state')
    .eq('event_id', eventId)
    .in('state', ['pending', 'accepted', 'confirmed'])

  const providerIds = Array.from(new Set((providerBookingRows || []).map((row) => row.provider_id).filter(Boolean)))
  if (providerIds.length > 0) {
    const { data: providerRows } = await supabaseAdmin
      .from('providers')
      .select('id, business_name, profile_id')
      .in('id', providerIds)

    const profileIds = Array.from(new Set((providerRows || []).map((provider) => provider.profile_id).filter(Boolean)))
    const providerProfiles = profileIds.length > 0
      ? (await supabaseAdmin.from('profiles').select('id, full_name, email').in('id', profileIds)).data || []
      : []

    const profilesById = new Map((providerProfiles || []).map((profile) => [profile.id, profile]))
    for (const provider of providerRows || []) {
      const profile = profilesById.get(String(provider.profile_id || ''))
      const email = normalizeEmail(profile?.email)
      if (!email) continue

      providers.push({
        email,
        name: String(profile?.full_name || provider.business_name || 'there'),
        userId: profile?.id ? String(profile.id) : null,
        role: 'provider',
      })
    }
  }

  const { data: teamInvites, error: inviteError } = await supabaseAdmin
    .from('event_team_invites')
    .select('email, full_name, status')
    .eq('event_id', eventId)
    .in('status', ['pending', 'accepted'])

  if (!inviteError) {
    for (const invite of teamInvites || []) {
      const email = normalizeEmail(invite.email)
      if (!email) continue

      crew.push({
        email,
        name: String(invite.full_name || 'there'),
        userId: null,
        role: 'crew',
      })
    }
  }

  const { data: teamMembers, error: memberError } = await supabaseAdmin
    .from('event_team_members')
    .select('user_id, status')
    .eq('event_id', eventId)
    .eq('status', 'active')

  if (!memberError) {
    const teamUserIds = Array.from(new Set((teamMembers || []).map((member) => member.user_id).filter(Boolean)))
    if (teamUserIds.length > 0) {
      const { data: teamProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', teamUserIds)

      for (const profile of teamProfiles || []) {
        const email = normalizeEmail(profile.email)
        if (!email) continue

        crew.push({
          email,
          name: String(profile.full_name || 'there'),
          userId: String(profile.id),
          role: 'crew',
        })
      }
    }
  }

  return {
    attendees: dedupeRecipients(attendees),
    artists: dedupeRecipients(artists),
    providers: dedupeRecipients(providers),
    crew: dedupeRecipients(crew),
  }
}