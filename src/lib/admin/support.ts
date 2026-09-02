/**
 * Support ticket listing for admin, shared by the API route and the server page.
 */

import { createAdminServiceClient } from '@/lib/admin-auth'

export const SUPPORT_PAGE_SIZE = 20

export interface SupportFilters {
  status?: string
  category?: string
  page?: number
}

export async function listSupportTickets({
  status = 'all',
  category = 'all',
  page = 1,
}: SupportFilters = {}) {
  const supabaseAdmin = createAdminServiceClient()

  let query = supabaseAdmin
    .from('support_tickets')
    .select(
      `*, user:user_id ( full_name, email ), assigned:assigned_to ( full_name )`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  if (status !== 'all') query = query.eq('status', status)
  if (category !== 'all') query = query.eq('category', category)

  const from = (page - 1) * SUPPORT_PAGE_SIZE
  query = query.range(from, from + SUPPORT_PAGE_SIZE - 1)

  // The status tally drives the filter chips and doesn't depend on the page.
  const [listResult, countsResult] = await Promise.all([
    query,
    supabaseAdmin.from('support_tickets').select('status'),
  ])

  if (listResult.error) throw new Error('Failed to fetch tickets')

  const statusCounts: Record<string, number> = {}
  for (const row of countsResult.data || []) {
    statusCounts[row.status] = (statusCounts[row.status] || 0) + 1
  }

  return {
    tickets: listResult.data || [],
    totalCount: listResult.count || 0,
    statusCounts,
  }
}
