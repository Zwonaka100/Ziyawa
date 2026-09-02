/**
 * Artist listing for admin, shared by the API route and the server page.
 *
 * The page used to render empty and then call /api/admin/artists on mount — a
 * round trip to Ireland after the page had already arrived, which is the
 * spinner. The page now calls this directly while rendering, so the table
 * arrives filled in. The route still exists, and still uses this same function,
 * because the client re-queries it when filters change.
 */

import { createAdminServiceClient } from '@/lib/admin-auth'

export type ArtistAdminRow = {
  id: string
  profile_id: string
  stage_name: string
  genre: string
  location: string
  base_price: number
  is_available?: boolean
  is_public?: boolean
  total_bookings?: number
  average_rating?: number
  created_at: string
  profile?: {
    full_name: string | null
    email: string
    is_suspended?: boolean
    is_banned?: boolean
  } | null
}

export interface ArtistFilters {
  query?: string
  availability?: string
  visibility?: string
}

export async function listAdminArtists({
  query = '',
  availability = 'all',
  visibility = 'all',
}: ArtistFilters = {}): Promise<ArtistAdminRow[]> {
  const supabaseAdmin = createAdminServiceClient()

  const { data, error } = await supabaseAdmin
    .from('artists')
    .select(
      'id, profile_id, stage_name, genre, location, base_price, is_available, is_public, total_bookings, average_rating, created_at'
    )
    .order('created_at', { ascending: false })

  if (error) throw new Error('Failed to fetch artist profiles')

  let rows: ArtistAdminRow[] = (data || []) as ArtistAdminRow[]

  if (rows.length > 0) {
    const profileIds = rows.map((row) => row.profile_id).filter(Boolean)
    if (profileIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, is_suspended, is_banned')
        .in('id', profileIds)

      if (!profilesError && profilesData) {
        const profileMap = new Map(profilesData.map((profile) => [profile.id, profile]))
        rows = rows.map((row) => ({
          ...row,
          profile: profileMap.get(row.profile_id) || null,
        }))
      }
    }
  }

  if (availability === 'available') rows = rows.filter((row) => row.is_available)
  else if (availability === 'paused') rows = rows.filter((row) => !row.is_available)

  if (visibility === 'public') rows = rows.filter((row) => row.is_public)
  else if (visibility === 'hidden') rows = rows.filter((row) => !row.is_public)

  const needle = query.trim().toLowerCase()
  if (!needle) return rows

  return rows.filter((row) =>
    [row.stage_name, row.genre, row.profile?.full_name || '', row.profile?.email || '']
      .join(' ')
      .toLowerCase()
      .includes(needle)
  )
}
