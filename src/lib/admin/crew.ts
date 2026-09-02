/**
 * Crew (provider) listing for admin, shared by the API route and the server
 * page — same arrangement as @/lib/admin/artists, and for the same reason: the
 * page used to render empty and fetch on mount.
 */

import { createAdminServiceClient } from '@/lib/admin-auth'

export type CrewAdminRow = {
  id: string
  profile_id: string
  business_name: string
  primary_category: string
  work_mode?: string | null
  location: string
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

export interface CrewFilters {
  query?: string
  availability?: string
  visibility?: string
}

export async function listAdminCrew({
  query = '',
  availability = 'all',
  visibility = 'all',
}: CrewFilters = {}): Promise<CrewAdminRow[]> {
  const supabaseAdmin = createAdminServiceClient()

  const { data, error } = await supabaseAdmin
    .from('providers')
    .select(
      'id, profile_id, business_name, primary_category, work_mode, location, is_available, is_public, total_bookings, average_rating, created_at'
    )
    .order('created_at', { ascending: false })

  if (error) throw new Error('Failed to fetch crew profiles')

  let rows: CrewAdminRow[] = (data || []) as CrewAdminRow[]

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
    [
      row.business_name,
      row.primary_category,
      row.work_mode || '',
      row.profile?.full_name || '',
      row.profile?.email || '',
    ]
      .join(' ')
      .toLowerCase()
      .includes(needle)
  )
}
