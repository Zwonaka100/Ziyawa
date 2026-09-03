/**
 * Finance reconciliation data, shared by the API route and the server page.
 */

import { createAdminServiceClient } from '@/lib/admin-auth'

export interface ReconciliationData {
  daily: Record<string, unknown>[]
  exceptions: {
    failedPayouts: Record<string, unknown>[]
    failedRefunds: Record<string, unknown>[]
    openRefundQueue: Record<string, unknown>[]
  }
}

export async function loadReconciliation(): Promise<ReconciliationData> {
  const supabaseAdmin = createAdminServiceClient()

  const [dailyResult, failedPayoutsResult, failedRefundsResult, openRefundQueueResult] =
    await Promise.all([
      // Order explicitly. The view carries an ORDER BY, but a LIMIT over a view
      // is not obliged to preserve it, and the UI treats the first row as the
      // latest day.
      supabaseAdmin
        .from('finance_daily_reconciliation')
        .select('*')
        .order('day', { ascending: false })
        .limit(30),
      supabaseAdmin
        .from('transactions')
        .select('id, reference, amount, failure_reason, created_at, updated_at')
        .eq('type', 'payout')
        .eq('state', 'failed')
        .order('updated_at', { ascending: false })
        .limit(50),
      supabaseAdmin
        .from('transactions')
        .select('id, reference, amount, failure_reason, created_at, updated_at')
        .eq('type', 'refund')
        .eq('state', 'failed')
        .order('updated_at', { ascending: false })
        .limit(50),
      supabaseAdmin
        .from('refund_work_items')
        .select('id, event_id, user_id, amount_cents, reason_code, status, created_at, updated_at')
        .in('status', ['new', 'under_review', 'failed'])
        .order('updated_at', { ascending: false })
        .limit(100),
    ])

  if (dailyResult.error) throw new Error('Failed to load daily reconciliation data')
  if (failedPayoutsResult.error) throw new Error('Failed to load payout exceptions')
  if (failedRefundsResult.error) throw new Error('Failed to load refund exceptions')
  if (openRefundQueueResult.error) throw new Error('Failed to load refund queue exceptions')

  return {
    daily: dailyResult.data || [],
    exceptions: {
      failedPayouts: failedPayoutsResult.data || [],
      failedRefunds: failedRefundsResult.data || [],
      openRefundQueue: openRefundQueueResult.data || [],
    },
  }
}
