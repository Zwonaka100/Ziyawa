/**
 * Report listing for admin, shared by the API route and the server page.
 */

import { createAdminServiceClient } from '@/lib/admin-auth'

export const REPORTS_PAGE_SIZE = 20

export interface ReportListFilters {
  status?: string
  type?: string
  page?: number
}

export async function listReports({
  status = 'all',
  type = 'all',
  page = 1,
}: ReportListFilters = {}) {
  const supabaseAdmin = createAdminServiceClient()

  let query = supabaseAdmin
    .from('reports')
    .select(`*, reporter:reporter_id ( full_name, email )`, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (status !== 'all') query = query.eq('status', status)
  if (type !== 'all') query = query.eq('reported_type', type)

  const from = (page - 1) * REPORTS_PAGE_SIZE
  query = query.range(from, from + REPORTS_PAGE_SIZE - 1)

  const { data, count, error } = await query
  if (error) throw new Error('Failed to fetch reports')

  return { reports: data || [], totalCount: count || 0 }
}
