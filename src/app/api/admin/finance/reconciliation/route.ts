import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function assertAdmin() {
  const gate = await requireAdminApi()
  if ('response' in gate) return { user: null, error: gate.response }
  return { user: { id: gate.admin.userId }, error: null }
}

export async function GET() {
  try {
    const adminCheck = await assertAdmin()
    if (adminCheck.error) return adminCheck.error

    const [dailyResult, failedPayoutsResult, failedRefundsResult, openRefundQueueResult] = await Promise.all([
      supabaseAdmin
        .from('finance_daily_reconciliation')
        .select('*')
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

    if (dailyResult.error) {
      return NextResponse.json({ error: 'Failed to load daily reconciliation data' }, { status: 500 })
    }

    if (failedPayoutsResult.error) {
      return NextResponse.json({ error: 'Failed to load payout exceptions' }, { status: 500 })
    }

    if (failedRefundsResult.error) {
      return NextResponse.json({ error: 'Failed to load refund exceptions' }, { status: 500 })
    }

    if (openRefundQueueResult.error) {
      return NextResponse.json({ error: 'Failed to load refund queue exceptions' }, { status: 500 })
    }

    return NextResponse.json({
      daily: dailyResult.data || [],
      exceptions: {
        failedPayouts: failedPayoutsResult.data || [],
        failedRefunds: failedRefundsResult.data || [],
        openRefundQueue: openRefundQueueResult.data || [],
      },
    })
  } catch (error) {
    console.error('Admin finance reconciliation GET error:', error)
    return NextResponse.json({ error: 'Failed to load reconciliation dashboard' }, { status: 500 })
  }
}
