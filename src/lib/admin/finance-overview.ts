/**
 * The four figures on /admin/finance, computed correctly.
 *
 * The page this replaces was wrong on every axis at once, and the owner's
 * reaction — "the numbers in finance are not real" — was right:
 *
 *   - It summed `transactions.amount`, which is CENTS, and handed it straight
 *     to a rand formatter. Every figure was 100x too big.
 *   - It filtered on state IN ('settled','released'), and nothing on this
 *     platform has ever reached those states, so it actually rendered R0 —
 *     100x too big only once money started settling.
 *   - It mixed units inside one tile row: three cents figures beside
 *     `profiles.pending_payout_balance`, which is RANDS.
 *   - It labelled the fee figure "Platform Earnings (10%)" when the fee is not
 *     10% and the number is gross of Paystack, the exact 31% overstatement
 *     migration 031 was written to end.
 *   - It ran on the RLS-scoped user client rather than the service client every
 *     other admin loader uses, working only via an undocumented admin policy.
 *
 * Money units, because they differ by table:
 *   CENTS  transactions.amount / platform_fee / net_amount / gateway_fee_cents
 *   RANDS  profiles.wallet_balance / held_balance / pending_payout_balance,
 *          payout_requests.amount
 */

import { createAdminServiceClient } from '@/lib/admin-auth'

const CENTS = 100

/**
 * Money that actually moved. `initiated` is an abandoned checkout that never
 * took a cent and `failed` never cleared, so counting either overstates sales.
 * `held` MUST be included: it is where every real sale sits until its event
 * completes and the settlement hold passes.
 */
const REAL_MONEY_STATES = ['held', 'released', 'settled']

export interface FinanceOverview {
  /** What buyers actually paid, across completed ticket sales. */
  grossSalesRands: number
  /** Ziyawa's booking fee on those sales, before Paystack takes its cut. */
  bookingFeesRands: number
  /** What Paystack charged Ziyawa to process them. */
  gatewayFeesRands: number
  /** What Ziyawa actually keeps. This is the honest revenue line. */
  ziyawaNetRands: number
  /** What organisers, artists and crew earned from those sales. */
  earnedByUsersRands: number

  /** Owed but not yet released — still inside a settlement hold. */
  heldRands: number
  /** Released and payable, waiting to be queued or approved. */
  availableRands: number
  /** Approved and in flight to a bank. */
  pendingPayoutRands: number
  /** Everything Ziyawa owes people right now. */
  totalOwedRands: number

  /** Payouts that have actually reached a bank account. */
  paidOutRands: number

  ticketSaleCount: number
  refundedCount: number
}

export async function loadFinanceOverview(): Promise<FinanceOverview> {
  const db = createAdminServiceClient()

  const [{ data: txns }, { data: balances }, { data: completedPayouts }] = await Promise.all([
    db
      .from('transactions')
      .select('amount, platform_fee, net_amount, gateway_fee_cents, type, state')
      .eq('type', 'ticket_purchase')
      .in('state', [...REAL_MONEY_STATES, 'refunded']),
    db.from('profiles').select('wallet_balance, held_balance, pending_payout_balance'),
    db.from('payout_requests').select('amount').eq('status', 'completed'),
  ])

  const rows = txns || []
  // Refunded sales are fetched only so they can be reported separately. Money
  // that came back is not revenue, so it is excluded from every total.
  const sales = rows.filter((r) => REAL_MONEY_STATES.includes(String(r.state)))

  const sumCents = (key: 'amount' | 'platform_fee' | 'net_amount' | 'gateway_fee_cents') =>
    sales.reduce((total, row) => total + Number(row[key] || 0), 0) / CENTS

  const bookingFeesRands = sumCents('platform_fee')
  const gatewayFeesRands = sumCents('gateway_fee_cents')

  const allBalances = balances || []
  const sumRands = (key: 'wallet_balance' | 'held_balance' | 'pending_payout_balance') =>
    allBalances.reduce((total, row) => total + Number(row[key] || 0), 0)

  const heldRands = sumRands('held_balance')
  const availableRands = sumRands('wallet_balance')
  const pendingPayoutRands = sumRands('pending_payout_balance')

  return {
    grossSalesRands: sumCents('amount'),
    bookingFeesRands,
    gatewayFeesRands,
    ziyawaNetRands: bookingFeesRands - gatewayFeesRands,
    earnedByUsersRands: sumCents('net_amount'),

    heldRands,
    availableRands,
    pendingPayoutRands,
    totalOwedRands: heldRands + availableRands + pendingPayoutRands,

    paidOutRands: (completedPayouts || []).reduce((total, row) => total + Number(row.amount || 0), 0),

    ticketSaleCount: sales.length,
    refundedCount: rows.length - sales.length,
  }
}
