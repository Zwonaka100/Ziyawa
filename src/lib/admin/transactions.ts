/**
 * Transaction listing and totals for admin, shared by the API route and the
 * server page.
 *
 * The page made two browser queries: the page of transactions, and a second
 * that read every transaction to compute the summary tiles. Both are done here,
 * together rather than in sequence.
 */

import { createAdminServiceClient } from '@/lib/admin-auth'

export const TRANSACTIONS_PAGE_SIZE = 20

export interface TransactionStats {
  totalTransactions: number
  totalVolume: number
  platformFees: number
  pendingCount: number
  heldVolume: number
  issueCount: number
}

export interface TransactionFilters {
  type?: string
  status?: string
  search?: string
  page?: number
}

export async function loadTransactions({
  type = 'all',
  status = 'all',
  search = '',
  page = 1,
}: TransactionFilters = {}) {
  const supabaseAdmin = createAdminServiceClient()

  let listQuery = supabaseAdmin
    .from('transactions')
    .select(
      `*,
       payer:profiles!transactions_payer_id_fkey(full_name, email),
       recipient:profiles!transactions_recipient_id_fkey(full_name, email),
       event:events(title)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  if (type !== 'all') listQuery = listQuery.eq('type', type)
  if (status !== 'all') listQuery = listQuery.eq('state', status)
  if (search) listQuery = listQuery.or(`reference.ilike.%${search}%`)

  const from = (page - 1) * TRANSACTIONS_PAGE_SIZE
  listQuery = listQuery.range(from, from + TRANSACTIONS_PAGE_SIZE - 1)

  // The tiles summarise every transaction, so they don't share the page filter.
  const [listResult, statsResult] = await Promise.all([
    listQuery,
    supabaseAdmin
      .from('transactions')
      .select('amount, net_amount, platform_fee, state', { count: 'exact' }),
  ])

  if (listResult.error) throw new Error('Failed to load transactions')

  const rows = statsResult.data || []
  const completed = rows.filter((t) => t.state === 'settled' || t.state === 'released')
  const held = rows.filter((t) => t.state === 'held')
  const issues = rows.filter((t) => ['failed', 'refunded'].includes(t.state))

  const stats: TransactionStats = {
    totalTransactions: statsResult.count || 0,
    totalVolume: completed.reduce((sum, t) => sum + (t.amount || 0), 0),
    platformFees: completed.reduce((sum, t) => sum + (t.platform_fee || 0), 0),
    pendingCount: rows.filter((t) =>
      ['initiated', 'authorized', 'held', 'released'].includes(t.state)
    ).length,
    heldVolume: held.reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0),
    issueCount: issues.length,
  }

  return {
    transactions: listResult.data || [],
    totalCount: listResult.count || 0,
    stats,
  }
}
