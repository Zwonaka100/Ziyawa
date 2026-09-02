/**
 * User listing for admin, shared by the API route and the server page.
 *
 * The page previously ran `select('*', { count: 'exact' })` on profiles from
 * the browser — all 39 columns of every user, including email, phone, all three
 * balances and the admin flags, shipped to the client for a table that renders
 * 14 of them. The column list below is exactly what the table uses.
 */

import { createAdminServiceClient } from '@/lib/admin-auth'

export const USER_LIST_COLUMNS = [
  'id',
  'email',
  'full_name',
  'avatar_url',
  'is_organizer',
  'is_artist',
  'is_provider',
  'is_admin',
  'admin_role',
  'is_suspended',
  'is_banned',
  'is_verified',
  'created_at',
].join(', ')

export const USERS_PER_PAGE = 20

export interface AdminUserRow {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  is_organizer: boolean
  is_artist?: boolean
  is_provider?: boolean
  is_admin: boolean
  admin_role: string | null
  is_suspended: boolean
  is_banned: boolean
  is_verified: boolean
  created_at: string
}

export interface UserFilters {
  search?: string
  role?: string
  status?: string
  page?: number
}

export interface AdminUserList {
  users: AdminUserRow[]
  totalCount: number
}

export async function listAdminUsers({
  search = '',
  role = 'all',
  status = 'all',
  page = 1,
}: UserFilters = {}): Promise<AdminUserList> {
  const supabaseAdmin = createAdminServiceClient()

  let query = supabaseAdmin
    .from('profiles')
    .select(USER_LIST_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (role === 'organizer') query = query.eq('is_organizer', true)
  else if (role === 'artist') query = query.eq('is_artist', true)
  else if (role === 'crew') query = query.eq('is_provider', true)
  else if (role === 'admin') query = query.eq('is_admin', true)
  else if (role === 'user') {
    query = query
      .eq('is_organizer', false)
      .eq('is_admin', false)
      .eq('is_artist', false)
      .eq('is_provider', false)
  }

  if (status === 'suspended') query = query.eq('is_suspended', true)
  else if (status === 'banned') query = query.eq('is_banned', true)
  else if (status === 'active') query = query.eq('is_suspended', false).eq('is_banned', false)

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const from = (page - 1) * USERS_PER_PAGE
  query = query.range(from, from + USERS_PER_PAGE - 1)

  const { data, count, error } = await query
  if (error) throw new Error('Failed to fetch users')

  return {
    users: (data || []) as unknown as AdminUserRow[],
    totalCount: count || 0,
  }
}

/** The single profile the admin edit form needs, narrowed to its fields. */
export async function loadUserForEdit(userId: string) {
  const supabaseAdmin = createAdminServiceClient()

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(
      'id, full_name, email, phone, location, bio, is_organizer, is_verified, avatar_url, is_suspended, is_banned, is_admin, admin_role, suspension_reason, ban_reason'
    )
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error('Failed to load user')
  return data
}
