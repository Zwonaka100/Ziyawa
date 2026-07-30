import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, is_admin, admin_role')
    .eq('id', user.id)
    .single()

  const isAdmin = Boolean(profile?.is_admin || profile?.admin_role === 'super_admin' || profile?.admin_role === 'admin')
  if (!isAdmin) {
    return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user, error: null }
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
