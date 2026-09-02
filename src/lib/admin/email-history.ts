/**
 * Email log listing and tallies for admin.
 *
 * This page had never worked. It queried columns and relationships that do not
 * exist on email_logs — `to_email`, `to_user_id`, `sent_by`, `opened_at`,
 * `delivered_at`, and two foreign keys named email_logs_to_user_id_fkey and
 * email_logs_sent_by_fkey. PostgREST rejected the query, the page discarded the
 * error, and it rendered "No emails found" over a table holding 18 sent emails.
 *
 * The real shape: sender_id (FK to profiles), recipient_ids and
 * recipient_emails as arrays, template_id (FK to email_templates), status,
 * email_type, sent_at, error_message. There is no per-recipient join and no
 * open/delivery tracking, so an open rate cannot be computed from this table -
 * the tile that claimed to show one was reporting on a column that isn't there.
 */

import { createAdminServiceClient } from '@/lib/admin-auth'

export const EMAIL_HISTORY_PAGE_SIZE = 20

export interface EmailStats {
  totalSent: number
  failed: number
  automated: number
  individual: number
}

export interface EmailHistoryFilters {
  status?: string
  type?: string
  search?: string
  page?: number
}

export async function loadEmailHistory({
  status = 'all',
  type = 'all',
  search = '',
  page = 1,
}: EmailHistoryFilters = {}) {
  const supabaseAdmin = createAdminServiceClient()

  let listQuery = supabaseAdmin
    .from('email_logs')
    .select(
      `id, sender_id, recipient_ids, recipient_emails, subject, body,
       template_id, email_type, status, sent_at, error_message,
       sender:profiles!email_logs_sender_id_fkey(full_name, email),
       template:email_templates(name)`,
      { count: 'exact' }
    )
    .order('sent_at', { ascending: false })

  if (status !== 'all') listQuery = listQuery.eq('status', status)
  if (type !== 'all') listQuery = listQuery.eq('email_type', type)
  // recipient_emails is an array, so a plain ilike does not apply to it.
  if (search) listQuery = listQuery.ilike('subject', `%${search}%`)

  const from = (page - 1) * EMAIL_HISTORY_PAGE_SIZE
  listQuery = listQuery.range(from, from + EMAIL_HISTORY_PAGE_SIZE - 1)

  const [listResult, total, failed, automated, individual] = await Promise.all([
    listQuery,
    supabaseAdmin.from('email_logs').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('email_logs').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    supabaseAdmin.from('email_logs').select('id', { count: 'exact', head: true }).eq('email_type', 'automated'),
    supabaseAdmin.from('email_logs').select('id', { count: 'exact', head: true }).eq('email_type', 'individual'),
  ])

  // Surfaced rather than swallowed. Hiding this error is what kept the page
  // looking empty instead of broken.
  if (listResult.error) {
    console.error('Failed to load email history:', listResult.error)
    throw new Error(listResult.error.message || 'Failed to load email history')
  }

  const stats: EmailStats = {
    totalSent: total.count || 0,
    failed: failed.count || 0,
    automated: automated.count || 0,
    individual: individual.count || 0,
  }

  return {
    emails: listResult.data || [],
    totalCount: listResult.count || 0,
    stats,
  }
}
