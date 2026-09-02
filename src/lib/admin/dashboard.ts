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
