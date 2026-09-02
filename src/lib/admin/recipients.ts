/**
 * Recipient picker for the admin compose screens, shared by the send and bulk
 * pages, which ran byte-identical queries apart from their row limit.
 *
 * Read-only. Nothing here sends anything.
 */

import { createAdminServiceClient } from '@/lib/admin-auth'

export interface RecipientRow {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_organizer: boolean
  is_artist: boolean
  is_provider: boolean
  created_at: string
}

export interface RecipientFilters {
  role?: string
  search?: string
  limit?: number
}

export async function listRecipients({
  role = 'all',
  search = '',
  limit = 100,
}: RecipientFilters = {}): Promise<RecipientRow[]> {
  const supabaseAdmin = createAdminServiceClient()

  let query = supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, avatar_url, is_organizer, is_artist, is_provider, created_at')
    .order('created_at', { ascending: false })

  if (role === 'organizers') query = query.eq('is_organizer', true)
  else if (role === 'artists') query = query.eq('is_artist', true)
  else if (role === 'providers') query = query.eq('is_provider', true)
  else if (role === 'groovists') {
    query = query.eq('is_organizer', false).eq('is_artist', false).eq('is_provider', false)
  }

  if (search.trim()) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const { data, error } = await query.limit(limit)
  if (error) throw new Error('Failed to load recipients')

  return (data || []) as RecipientRow[]
}

/** A single recipient, for the send screen's deep link from a user page. */
export async function loadRecipient(userId: string): Promise<RecipientRow | null> {
  const supabaseAdmin = createAdminServiceClient()

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, avatar_url, is_organizer, is_artist, is_provider, created_at')
    .eq('id', userId)
    .maybeSingle()

  return (data as RecipientRow) ?? null
}
