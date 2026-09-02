/**
 * Event listing for admin, shared by the API route and the server page.
 *
 * The page ran `select('*')` on events plus a `profiles:organizer_id` embed
 * from the browser. The embed reads the profiles table itself; the column list
 * below is what the table renders, and the organizer is attached separately
 * from a narrow read rather than embedded.
 */

import { createAdminServiceClient } from '@/lib/admin-auth'

export const EVENT_LIST_COLUMNS = [
  'id',
  'title',
  'venue',
  'location',
  'event_date',
  'ticket_price',
  'capacity',
  'tickets_sold',
  'is_published',
  'state',
  'created_at',
  'organizer_id',
].join(', ')

export const DEFAULT_EVENTS_PAGE_SIZE = 20

export interface AdminEventRow {
  id: string
  title: string
  venue: string
  location: string
  event_date: string
  ticket_price: number
  capacity: number
  tickets_sold: number
  is_published: boolean
  state: string
  created_at: string
  organizer_id: string
  profiles: { id: string; full_name: string; email: string } | null
}

export interface OrganizerOption {
  id: string
  full_name: string | null
  email: string | null
}

export interface EventFilters {
  search?: string
  lifecycle?: string
  state?: string
  organizer?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface AdminEventList {
  events: AdminEventRow[]
  totalCount: number
}

export async function listAdminEvents({
  search = '',
  lifecycle = 'all',
  state = 'all',
  organizer = 'all',
  dateFrom = '',
  dateTo = '',
  sortBy = 'created_at',
  sortDirection = 'desc',
  page = 1,
  pageSize = DEFAULT_EVENTS_PAGE_SIZE,
}: EventFilters = {}): Promise<AdminEventList> {
  const supabaseAdmin = createAdminServiceClient()
  const today = new Date().toISOString().slice(0, 10)

  let query = supabaseAdmin
    .from('events')
    .select(EVENT_LIST_COLUMNS, { count: 'exact' })

  if (lifecycle === 'draft') query = query.eq('is_published', false)
  else if (lifecycle === 'published') query = query.eq('is_published', true)
  else if (lifecycle === 'upcoming') query = query.gte('event_date', today)
  else if (lifecycle === 'past') query = query.lt('event_date', today)

  if (state !== 'all') query = query.eq('state', state)
  if (organizer !== 'all') query = query.eq('organizer_id', organizer)
  if (dateFrom) query = query.gte('event_date', dateFrom)
  if (dateTo) query = query.lte('event_date', dateTo)

  if (search.trim()) {
    const trimmed = search.trim()
    query = query.or(
      `title.ilike.%${trimmed}%,venue.ilike.%${trimmed}%,location.ilike.%${trimmed}%`
    )
  }

  const ascending = sortDirection === 'asc'
  if (sortBy === 'title') query = query.order('title', { ascending })
  else if (sortBy === 'tickets_sold') query = query.order('tickets_sold', { ascending })
  else if (sortBy === 'event_date') query = query.order('event_date', { ascending })
  else query = query.order('created_at', { ascending })

  const from = (page - 1) * pageSize
  query = query.range(from, from + pageSize - 1)

  const { data, count, error } = await query
  if (error) throw new Error('Failed to fetch events')

  const rows = (data || []) as unknown as AdminEventRow[]

  // Organizers attached from a narrow read rather than a PostgREST embed.
  const organizerIds = [...new Set(rows.map((row) => row.organizer_id).filter(Boolean))]
  if (organizerIds.length > 0) {
    const { data: organizers } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .in('id', organizerIds)

    const byId = new Map((organizers || []).map((o) => [o.id, o]))
    for (const row of rows) {
      row.profiles = (byId.get(row.organizer_id) as AdminEventRow['profiles']) ?? null
    }
  }

  return { events: rows, totalCount: count || 0 }
}

/** Organizers who have at least one event, for the filter dropdown. */
export async function listEventOrganizers(): Promise<OrganizerOption[]> {
  const supabaseAdmin = createAdminServiceClient()

  const { data, error } = await supabaseAdmin.from('events').select('organizer_id')
  if (error) throw new Error('Failed to load organizers')

  const organizerIds = Array.from(
    new Set((data || []).map((item) => item.organizer_id).filter(Boolean) as string[])
  )
  if (organizerIds.length === 0) return []

  const { data: profileData, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', organizerIds)
    .order('full_name', { ascending: true })

  if (profileError) throw new Error('Failed to load organizers')
  return (profileData || []) as OrganizerOption[]
}
