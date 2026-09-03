/**
 * Transaction listing and totals for admin, shared by the API route and the
 * server page.
 *
 * The page made two browser queries: the page of transactions, and a second
 * that read every transaction to compute the summary tiles. Both are done here,
 * together rather than in sequence.
 */

import { createAdminServiceClient } from '@/lib/admin-auth'

export { TRANSACTIONS_PAGE_SIZE } from './pagination'
import { TRANSACTIONS_PAGE_SIZE } from './pagination'

export interface TransactionStats {
  totalTransactions: number
  totalVolume: number
  platformFees: number
  /** What the gateway actually charged on these transactions, in cents. */
  gatewayFees: number
  /** platformFees minus gatewayFees, in cents. What Ziyawa really kept. */
  netAfterGateway: number
  pendingCount: number
  heldVolume: number
  issueCount: number
}

export interface TransactionFilters {
  type?: string
  status?: string
  search?: string
  page?: number
  /**
   * Abandoned checkouts ('initiated') and failures are hidden unless asked for.
   * A started-and-never-paid checkout is not a transaction anyone needs to read
   * past to find real money.
   */
  includeIncomplete?: boolean
}

const INCOMPLETE_STATES = ['initiated', 'failed']

export async function loadTransactions({
  type = 'all',
  status = 'all',
  search = '',
  page = 1,
  includeIncomplete = false,
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
  // An explicit status filter wins - asking for 'initiated' should show them.
  else if (!includeIncomplete) {
    listQuery = listQuery.not('state', 'in', `(${INCOMPLETE_STATES.join(',')})`)
  }
  if (search) listQuery = listQuery.or(`reference.ilike.%${search}%`)

  const from = (page - 1) * TRANSACTIONS_PAGE_SIZE
  listQuery = listQuery.range(from, from + TRANSACTIONS_PAGE_SIZE - 1)

  // The tiles summarise every transaction, so they don't share the page filter.
  const [listResult, statsResult] = await Promise.all([
    listQuery,
    supabaseAdmin
      .from('transactions')
      .select('amount, net_amount, platform_fee, gateway_fee_cents, state, type', { count: 'exact' }),
  ])

  if (listResult.error) throw new Error('Failed to load transactions')

  const rows = statsResult.data || []
  // Money that actually moved. This used to mean 'settled' or 'released' only,
  // which excluded 'held' - the state every paid ticket sits in until its event
  // completes. The result was that Total Volume and Booking Fees read R0.00
  // against R260.00 of real sales, because nothing had reached settlement yet.
  // `refunded` is money that came back. It was previously counted as completed,
  // so a reversed sale still inflated volume, fees and the transaction count.
  const completed = rows.filter(
    (t) => !INCOMPLETE_STATES.includes(t.state) && t.state !== 'refunded'
  )

  // Volume means what buyers paid, so it counts ticket sales only. Summing
  // every type counted the same money up to three times — once as the sale,
  // again as the payout of that sale, and again as a refund of it — so R260 of
  // real trade could read as R780.
  const sales = completed.filter((t) => t.type === 'ticket_purchase')
  const held = rows.filter((t) => t.state === 'held')
  const issues = rows.filter((t) => ['failed', 'refunded'].includes(t.state))
  const sum = (list: typeof rows, key: 'amount' | 'platform_fee' | 'gateway_fee_cents' | 'net_amount') =>
    list.reduce((total, t) => total + (Number(t[key]) || 0), 0)

  const stats: TransactionStats = {
    // Counts what the table shows, not abandoned checkouts alongside it.
    totalTransactions: completed.length,
    totalVolume: sum(sales, 'amount'),
    platformFees: sum(sales, 'platform_fee'),
    gatewayFees: sum(sales, 'gateway_fee_cents'),
    netAfterGateway: sum(sales, 'platform_fee') - sum(sales, 'gateway_fee_cents'),
    // In-flight money awaiting settlement. `initiated` was in this list, which
    // contradicted the page's own rule — the table hides abandoned checkouts,
    // so counting them here described rows the admin could not see.
    pendingCount: rows.filter((t) => ['authorized', 'held', 'released'].includes(t.state)).length,
    // net_amount is the recipient's share; `|| t.amount` on a legitimate zero
    // would silently substitute the gross.
    heldVolume: held.reduce(
      (total, t) => total + Number(t.net_amount ?? t.amount ?? 0),
      0
    ),
    issueCount: issues.length,
  }

  return {
    transactions: listResult.data || [],
    totalCount: listResult.count || 0,
    stats,
  }
}
