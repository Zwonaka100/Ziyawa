/**
 * Admin audit log listing, shared by the API route and the server page.
 */

import { createAdminServiceClient } from '@/lib/admin-auth'

export const AUDIT_LOGS_PAGE_SIZE = 20

export interface AuditLogFilters {
  action?: string
  entity?: string
  page?: number
}

export async function listAuditLogs({
  action = 'all',
  entity = 'all',
  page = 1,
}: AuditLogFilters = {}) {
  const supabaseAdmin = createAdminServiceClient()

  let query = supabaseAdmin
    .from('admin_audit_logs')
    .select(
      `*, admin:profiles!admin_audit_logs_admin_id_fkey(full_name, email)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range((page - 1) * AUDIT_LOGS_PAGE_SIZE, page * AUDIT_LOGS_PAGE_SIZE - 1)

  if (action !== 'all') query = query.ilike('action', `%${action}%`)
  if (entity !== 'all') query = query.eq('entity_type', entity)

  const { data, error, count } = await query
  if (error) throw new Error('Failed to fetch audit logs')

  return { logs: data || [], totalCount: count || 0 }
}
