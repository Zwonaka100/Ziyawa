/**
 * The admin dashboard's data: work waiting, money position, and failures.
 *
 * Replaces eight counts that never needed acting on (total users, total events,
 * total artists...) and three "recent" lists. A count of everything that has
 * ever existed does not tell you what to do today.
 *
 * Every queue here is something a person has to act on, and carries the age of
 * its oldest item, because a queue of two that has been waiting a fortnight is
 * more urgent than a queue of ten opened this morning.
 */

import { createAdminServiceClient } from '@/lib/admin-auth'
import { fetchPaystackBalanceRands } from '@/lib/admin/payouts'

export interface QueueSummary {
  count: number
  oldestAt: string | null
  /** Rands attached to this queue, where money is involved. */
  amountRands?: number
}

export interface MoneyPosition {
  heldRands: number
  availableRands: number
  pendingPayoutRands: number
  totalOwedRands: number
  paystackBalanceRands: number | null
}

export interface DashboardData {
  needsCompletion: QueueSummary
  verifications: QueueSummary
  payouts: QueueSummary
  refunds: QueueSummary
  disputes: QueueSummary
  reports: QueueSummary
  support: QueueSummary
  money: MoneyPosition
  failures: {
    failedPayouts: number
    failedRefunds: number
    failedEmails: number
    payoutsWithoutRecipient: number
  }
}

const oldest = (rows: { [k: string]: unknown }[] | null, field: string): string | null => {
  if (!rows || rows.length === 0) return null
  const dates = rows.map((r) => r[field]).filter(Boolean) as string[]
  if (dates.length === 0) return null
  return dates.sort()[0]
}

export async function loadDashboard(): Promise<DashboardData> {
  const db = createAdminServiceClient()
  const today = new Date().toISOString().slice(0, 10)

  const [
    incompleteEvents,
    pendingVerifications,
    openPayouts,
    queuedRefunds,
    artistDisputes,
    providerDisputes,
    openReports,
    openTickets,
    balances,
    failedPayouts,
    failedRefunds,
    failedEmails,
    payoutAccounts,
    paystackBalanceRands,
  ] = await Promise.all([
    // Published, already happened, never completed — money cannot move until
    // the organiser (or admin, as an escalation) marks it done.
    db.from('events')
      .select('id, title, event_date, organizer_id')
      .eq('is_published', true)
      .lt('event_date', today)
      .is('completed_at', null),
    db.from('verification_requests').select('id, submitted_at').eq('status', 'pending'),
    db.from('payout_requests').select('id, amount, requested_at').eq('status', 'pending'),
    db.from('refund_work_items')
      .select('id, amount_cents, created_at')
      .in('status', ['new', 'under_review']),
    db.from('bookings').select('id, disputed_at').eq('state', 'disputed'),
    db.from('provider_bookings').select('id, disputed_at').eq('state', 'disputed'),
    db.from('reports').select('id, created_at').eq('status', 'pending'),
    db.from('support_tickets').select('id, created_at').in('status', ['open', 'in_progress']),
    db.from('profiles').select('wallet_balance, held_balance, pending_payout_balance'),
    db.from('transactions').select('id', { count: 'exact', head: true }).eq('type', 'payout').eq('state', 'failed'),
    db.from('transactions').select('id', { count: 'exact', head: true }).eq('type', 'refund').eq('state', 'failed'),
    db.from('email_logs').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    db.from('payout_accounts').select('profile_id, paystack_recipient_code'),
    fetchPaystackBalanceRands(),
  ])

  const heldOnIncompleteEvents = await (async () => {
    const ids = (incompleteEvents.data || []).map((e) => e.organizer_id).filter(Boolean)
    if (ids.length === 0) return 0
    const { data } = await db.from('profiles').select('held_balance').in('id', ids)
    return (data || []).reduce((sum, p) => sum + Number(p.held_balance || 0), 0)
  })()

  const allBalances = balances.data || []
  const heldRands = allBalances.reduce((s, p) => s + Number(p.held_balance || 0), 0)
  const availableRands = allBalances.reduce((s, p) => s + Number(p.wallet_balance || 0), 0)
  const pendingPayoutRands = allBalances.reduce(
    (s, p) => s + Number(p.pending_payout_balance || 0),
    0
  )

  const disputes = [...(artistDisputes.data || []), ...(providerDisputes.data || [])]

  return {
    needsCompletion: {
      count: (incompleteEvents.data || []).length,
      oldestAt: oldest(incompleteEvents.data, 'event_date'),
      amountRands: heldOnIncompleteEvents,
    },
    verifications: {
      count: (pendingVerifications.data || []).length,
      oldestAt: oldest(pendingVerifications.data, 'submitted_at'),
    },
    payouts: {
      count: (openPayouts.data || []).length,
      oldestAt: oldest(openPayouts.data, 'requested_at'),
      amountRands: (openPayouts.data || []).reduce((s, r) => s + Number(r.amount || 0), 0),
    },
    refunds: {
      count: (queuedRefunds.data || []).length,
      oldestAt: oldest(queuedRefunds.data, 'created_at'),
      amountRands: (queuedRefunds.data || []).reduce(
        (s, r) => s + Number(r.amount_cents || 0) / 100,
        0
      ),
    },
    disputes: { count: disputes.length, oldestAt: oldest(disputes, 'disputed_at') },
    reports: {
      count: (openReports.data || []).length,
      oldestAt: oldest(openReports.data, 'created_at'),
    },
    support: {
      count: (openTickets.data || []).length,
      oldestAt: oldest(openTickets.data, 'created_at'),
    },
    money: {
      heldRands,
      availableRands,
      pendingPayoutRands,
      totalOwedRands: heldRands + availableRands + pendingPayoutRands,
      paystackBalanceRands,
    },
    failures: {
      failedPayouts: failedPayouts.count || 0,
      failedRefunds: failedRefunds.count || 0,
      failedEmails: failedEmails.count || 0,
      payoutsWithoutRecipient: (payoutAccounts.data || []).filter(
        (a) => !a.paystack_recipient_code
      ).length,
    },
  }
}

// ── Trading ────────────────────────────────────────────────────────────────
//
// MONEY UNITS ARE NOT CONSISTENT ACROSS TABLES. Getting this wrong is silent
// and produces figures that look plausible: summing platform_fee as rands
// reported "R28,350 earned" against R260 of actual ticket sales.
//
//   cents  transactions.amount, .net_amount, .platform_fee
//          refund_work_items.amount_cents
//   rands  tickets.price_paid, payout_requests.amount,
//          profiles.wallet_balance / held_balance / pending_payout_balance
//
// Everything below converts at the point of reading and returns rands.

const CENTS = 100

/** A checkout that never completed leaves its transaction in this state. */
const ABANDONED_STATES = ['initiated']

export const TRADING_PERIODS = [7, 30, 90] as const
export type TradingPeriod = (typeof TRADING_PERIODS)[number]

export interface TradingFigure {
  value: number
  previous: number
  /** Percent change, or null when the previous period was zero. */
  changePct: number | null
}

export interface TradingData {
  days: number
  grossSalesRands: TradingFigure
  feeEarnedRands: TradingFigure
  /** What the gateway took out of feeEarnedRands. Ziyawa's real cost of trading. */
  gatewayFeesRands: TradingFigure
  /** feeEarned minus gatewayFees. The honest revenue line. */
  netEarnedRands: TradingFigure
  ticketsSold: TradingFigure
  checkoutsAttempted: number
  checkoutsCompleted: number
  completionPct: number | null
  newSignups: TradingFigure
  newEvents: TradingFigure
  daysSinceLastSale: number | null
  daysSinceLastAttempt: number | null
}

const figure = (value: number, previous: number): TradingFigure => ({
  value,
  previous,
  changePct: previous === 0 ? null : Math.round(((value - previous) / previous) * 100),
})

const daysSince = (iso: string | null | undefined): number | null =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : null

export async function loadTrading(days: TradingPeriod = 30): Promise<TradingData> {
  const db = createAdminServiceClient()

  const now = Date.now()
  const periodStart = new Date(now - days * 86_400_000).toISOString()
  const priorStart = new Date(now - days * 2 * 86_400_000).toISOString()

  const [current, prior, lastSale, lastAttempt, signups, events] = await Promise.all([
    db
      .from('transactions')
      .select('amount, platform_fee, gateway_fee_cents, state, created_at')
      .eq('type', 'ticket_purchase')
      .gte('created_at', periodStart),
    db
      .from('transactions')
      .select('amount, platform_fee, gateway_fee_cents, state, created_at')
      .eq('type', 'ticket_purchase')
      .gte('created_at', priorStart)
      .lt('created_at', periodStart),
    db
      .from('transactions')
      .select('created_at')
      .not('state', 'in', `(${ABANDONED_STATES.join(',')})`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from('transactions')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from('profiles').select('created_at').gte('created_at', priorStart),
    db.from('events').select('created_at').gte('created_at', priorStart),
  ])

  type TxnRow = {
    amount: number | null
    platform_fee: number | null
    gateway_fee_cents: number | null
    state: string
  }

  const settled = (rows: TxnRow[] | null) =>
    (rows || []).filter((r) => !ABANDONED_STATES.includes(r.state))

  const sumRands = (rows: TxnRow[], key: 'amount' | 'platform_fee' | 'gateway_fee_cents') =>
    rows.reduce((total, row) => total + Number(row[key] || 0) / CENTS, 0)

  const currentSettled = settled(current.data)
  const priorSettled = settled(prior.data)

  const inPeriod = (rows: { created_at: string }[] | null) =>
    (rows || []).filter((r) => r.created_at >= periodStart).length
  const inPrior = (rows: { created_at: string }[] | null) =>
    (rows || []).filter((r) => r.created_at < periodStart).length

  const attempted = (current.data || []).length
  const completed = currentSettled.length

  return {
    days,
    grossSalesRands: figure(
      sumRands(currentSettled, 'amount'),
      sumRands(priorSettled, 'amount')
    ),
    feeEarnedRands: figure(
      sumRands(currentSettled, 'platform_fee'),
      sumRands(priorSettled, 'platform_fee')
    ),
    gatewayFeesRands: figure(
      sumRands(currentSettled, 'gateway_fee_cents'),
      sumRands(priorSettled, 'gateway_fee_cents')
    ),
    netEarnedRands: figure(
      sumRands(currentSettled, 'platform_fee') - sumRands(currentSettled, 'gateway_fee_cents'),
      sumRands(priorSettled, 'platform_fee') - sumRands(priorSettled, 'gateway_fee_cents')
    ),
    ticketsSold: figure(currentSettled.length, priorSettled.length),
    checkoutsAttempted: attempted,
    checkoutsCompleted: completed,
    completionPct: attempted === 0 ? null : Math.round((completed / attempted) * 100),
    newSignups: figure(inPeriod(signups.data), inPrior(signups.data)),
    newEvents: figure(inPeriod(events.data), inPrior(events.data)),
    daysSinceLastSale: daysSince(lastSale.data?.created_at),
    daysSinceLastAttempt: daysSince(lastAttempt.data?.created_at),
  }
}

// ── What's coming ──────────────────────────────────────────────────────────

export interface UpcomingEvent {
  id: string
  title: string
  event_date: string
  capacity: number
  tickets_sold: number
  ticketPriceRands: number
}

export interface ForwardView {
  nextSevenDays: UpcomingEvent[]
  publishedNotSelling: UpcomingEvent[]
}

export async function loadForwardView(): Promise<ForwardView> {
  const db = createAdminServiceClient()
  const today = new Date().toISOString().slice(0, 10)
  const inAWeek = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)

  const [soon, notSelling] = await Promise.all([
    db
      .from('events')
      .select('id, title, event_date, capacity, tickets_sold, ticket_price')
      .eq('is_published', true)
      .gte('event_date', today)
      .lte('event_date', inAWeek)
      .order('event_date', { ascending: true }),
    // Published, still to come, and nobody has bought a ticket. These are the
    // ones an organiser needs nudging about while there is still time.
    db
      .from('events')
      .select('id, title, event_date, capacity, tickets_sold, ticket_price')
      .eq('is_published', true)
      .gte('event_date', today)
      .or('tickets_sold.is.null,tickets_sold.eq.0')
      .order('event_date', { ascending: true })
      .limit(10),
  ])

  const shape = (rows: Record<string, unknown>[] | null): UpcomingEvent[] =>
    (rows || []).map((e) => ({
      id: String(e.id),
      title: String(e.title),
      event_date: String(e.event_date),
      capacity: Number(e.capacity || 0),
      tickets_sold: Number(e.tickets_sold || 0),
      // events.ticket_price is rands, unlike transactions.
      ticketPriceRands: Number(e.ticket_price || 0),
    }))

  return {
    nextSevenDays: shape(soon.data),
    publishedNotSelling: shape(notSelling.data),
  }
}

/**
 * Money Ziyawa owes that cannot currently move, and why.
 *
 * Nothing surfaced this. The seven queues are all request-driven — they list
 * things someone submitted — and an organiser whose money is stuck submitted
 * nothing. Worse, once an event is completed it drops out of every one of them,
 * so the exact moment money becomes owed is the moment it becomes invisible.
 *
 * The blocked list on /admin/finance/payouts could not cover this either: it is
 * built from payout_requests rows, and the whole problem is that no row was
 * ever created.
 *
 * Reads the balances directly, which is the only source that cannot be missing.
 */
export interface BlockedMoneyRow {
  profileId: string
  name: string
  email: string
  availableRands: number
  heldRands: number
  pendingPayoutRands: number
  reason: 'not_verified' | 'verification_pending' | 'verification_rejected' | 'no_payout_account' | 'queued' | 'in_hold'
  label: string
}

export async function loadBlockedMoney(): Promise<{
  rows: BlockedMoneyRow[]
  stuckCount: number
  stuckRands: number
}> {
  const db = createAdminServiceClient()

  const { data: profiles } = await db
    .from('profiles')
    .select('id, full_name, email, is_verified, wallet_balance, held_balance, pending_payout_balance')
    .or('wallet_balance.gt.0,held_balance.gt.0,pending_payout_balance.gt.0')

  const owed = profiles || []
  if (owed.length === 0) return { rows: [], stuckCount: 0, stuckRands: 0 }

  const ids = owed.map((p) => p.id)
  const [{ data: accounts }, { data: verifications }, { data: openPayouts }] = await Promise.all([
    db.from('payout_accounts').select('profile_id, paystack_recipient_code').in('profile_id', ids),
    db
      .from('verification_requests')
      .select('profile_id, status, submitted_at')
      .in('profile_id', ids)
      .order('submitted_at', { ascending: false }),
    db
      .from('payout_requests')
      .select('user_id')
      .in('user_id', ids)
      .in('status', ['pending', 'approved', 'processing']),
  ])

  const hasRecipient = new Set(
    (accounts || []).filter((a) => a.paystack_recipient_code).map((a) => a.profile_id)
  )
  const queued = new Set((openPayouts || []).map((r) => r.user_id))
  const latestVerification = new Map<string, string>()
  for (const row of verifications || []) {
    if (!latestVerification.has(row.profile_id)) latestVerification.set(row.profile_id, row.status)
  }

  const rows: BlockedMoneyRow[] = owed.map((profile) => {
    const availableRands = Number(profile.wallet_balance || 0)
    const heldRands = Number(profile.held_balance || 0)
    const pendingPayoutRands = Number(profile.pending_payout_balance || 0)
    const verification = latestVerification.get(profile.id)

    let reason: BlockedMoneyRow['reason']
    let label: string

    if (queued.has(profile.id)) {
      reason = 'queued'
      label = 'Queued for your approval'
    } else if (availableRands <= 0) {
      // Nothing payable yet — the money is still inside its settlement hold.
      reason = 'in_hold'
      label = 'In settlement hold'
    } else if (!profile.is_verified) {
      if (verification === 'pending') {
        reason = 'verification_pending'
        label = 'Waiting in your verification queue'
      } else if (verification === 'rejected') {
        reason = 'verification_rejected'
        label = 'Verification rejected — waiting on them'
      } else {
        reason = 'not_verified'
        label = 'Never submitted verification'
      }
    } else if (!hasRecipient.has(profile.id)) {
      reason = 'no_payout_account'
      label = 'Verified, but no Paystack recipient'
    } else {
      reason = 'queued'
      label = 'Payable — will queue on the next release'
    }

    return {
      profileId: profile.id,
      name: profile.full_name || profile.email || 'Unknown',
      email: profile.email || '',
      availableRands,
      heldRands,
      pendingPayoutRands,
      reason,
      label,
    }
  })

  // "Stuck" means payable money that nothing will move on its own.
  const STUCK: BlockedMoneyRow['reason'][] = [
    'not_verified',
    'verification_pending',
    'verification_rejected',
    'no_payout_account',
  ]
  const stuck = rows.filter((r) => STUCK.includes(r.reason))

  return {
    rows: rows.sort((a, b) => b.availableRands + b.heldRands - (a.availableRands + a.heldRands)),
    stuckCount: stuck.length,
    stuckRands: stuck.reduce((sum, r) => sum + r.availableRands, 0),
  }
}
