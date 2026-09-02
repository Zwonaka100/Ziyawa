/**
 * Refund work queue for admin, shared by the API route's GET and the server
 * page, so the queue renders with the page rather than after it.
 */

import { createAdminServiceClient } from '@/lib/admin-auth'

export interface RefundFilters {
  status?: string | null
  eventId?: string | null
}

export async function listRefundWorkItems({
  status,
  eventId,
}: RefundFilters = {}): Promise<Record<string, unknown>[]> {
  const supabaseAdmin = createAdminServiceClient()

  let query = supabaseAdmin
    .from('refund_work_items')
    .select(
      'id, event_id, source_transaction_id, user_id, amount_cents, reason_code, status, requested_by, reviewed_by, reviewed_at, executed_at, admin_notes, metadata, created_at, updated_at'
    )
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  if (eventId) query = query.eq('event_id', eventId)

  const { data, error } = await query
  if (error) throw new Error('Failed to load refund work items')

  const items = data || []
  const userIds = Array.from(new Set(items.map((item) => item.user_id).filter(Boolean)))
  const eventIds = Array.from(new Set(items.map((item) => item.event_id).filter(Boolean)))
  const transactionIds = Array.from(
    new Set(items.map((item) => item.source_transaction_id).filter(Boolean))
  )

  const [usersResult, eventsResult, transactionsResult] = await Promise.all([
    userIds.length > 0
      ? supabaseAdmin.from('profiles').select('id, full_name, email, avatar_url').in('id', userIds)
      : Promise.resolve({ data: [], error: null }),
    eventIds.length > 0
      ? supabaseAdmin.from('events').select('id, title, event_date').in('id', eventIds)
      : Promise.resolve({ data: [], error: null }),
    transactionIds.length > 0
      ? supabaseAdmin.from('transactions').select('id, reference, type, state').in('id', transactionIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const usersById = new Map((usersResult.data || []).map((user) => [user.id, user]))
  const eventsById = new Map((eventsResult.data || []).map((event) => [event.id, event]))
  const transactionsById = new Map((transactionsResult.data || []).map((txn) => [txn.id, txn]))

  return items.map((item) => ({
    ...item,
    user: usersById.get(item.user_id) || null,
    event: item.event_id ? eventsById.get(item.event_id) || null : null,
    sourceTransaction: item.source_transaction_id
      ? transactionsById.get(item.source_transaction_id) || null
      : null,
  }))
}
