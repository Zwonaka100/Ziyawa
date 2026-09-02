import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { listRefundWorkItems } from '@/lib/admin/refunds'
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

export async function GET(request: NextRequest) {
  const adminCheck = await assertAdmin()
  if (adminCheck.error) return adminCheck.error

  try {
    const items = await listRefundWorkItems({
      status: request.nextUrl.searchParams.get('status'),
      eventId: request.nextUrl.searchParams.get('eventId'),
    })
    return NextResponse.json({ items })
  } catch (error) {
    console.error('Admin refund queue GET error:', error)
    return NextResponse.json({ error: 'Failed to load refund queue' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await assertAdmin()
    if (adminCheck.error) return adminCheck.error

    const body = await request.json().catch(() => ({})) as {
      action?: 'enqueueEventCancellation' | 'enqueueTransaction'
      eventId?: string
      transactionId?: string
      reasonCode?: string
      notes?: string
    }

    const action = body.action || 'enqueueEventCancellation'

    if (action === 'enqueueTransaction') {
      const transactionId = String(body.transactionId || '').trim()
      if (!transactionId) {
        return NextResponse.json({ error: 'transactionId is required' }, { status: 400 })
      }

      const { data: tx, error: txError } = await supabaseAdmin
        .from('transactions')
        .select('id, event_id, payer_id, amount, state, type')
        .eq('id', transactionId)
        .single()

      if (txError || !tx) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
      }

      if (!['ticket_purchase', 'booking_payment', 'artist_booking', 'vendor_service'].includes(tx.type)) {
        return NextResponse.json({ error: 'Unsupported transaction type for refund queue' }, { status: 400 })
      }

      const { data, error } = await supabaseAdmin
        .from('refund_work_items')
        .upsert({
          event_id: tx.event_id,
          source_transaction_id: tx.id,
          user_id: tx.payer_id,
          amount_cents: Number(tx.amount || 0),
          reason_code: body.reasonCode || 'admin_requested',
          status: 'new',
          requested_by: adminCheck.user?.id,
          metadata: {
            source: 'admin_manual_enqueue',
            notes: body.notes || null,
          },
        }, { onConflict: 'source_transaction_id', ignoreDuplicates: false })
        .select('id, status')
        .single()

      if (error) {
        return NextResponse.json({ error: 'Failed to enqueue refund transaction' }, { status: 500 })
      }

      return NextResponse.json({ success: true, item: data })
    }

    const eventId = String(body.eventId || '').trim()
    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
    }

    const { data: txns, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('id, event_id, payer_id, amount, state, type')
      .eq('event_id', eventId)
      .eq('type', 'ticket_purchase')
      .in('state', ['authorized', 'held', 'released', 'settled'])

    if (txError) {
      return NextResponse.json({ error: 'Failed to load event transactions for refund queue' }, { status: 500 })
    }

    const queueRows = (txns || [])
      .filter((txn) => txn.payer_id && Number(txn.amount || 0) > 0)
      .map((txn) => ({
        event_id: eventId,
        source_transaction_id: txn.id,
        user_id: txn.payer_id,
        amount_cents: Number(txn.amount || 0),
        reason_code: body.reasonCode || 'event_cancelled',
        status: 'new',
        requested_by: adminCheck.user?.id,
        metadata: {
          source: 'event_cancellation',
          notes: body.notes || null,
        },
      }))

    if (queueRows.length === 0) {
      return NextResponse.json({ success: true, created: 0, message: 'No refundable ticket transactions found' })
    }

    const { error: insertError } = await supabaseAdmin
      .from('refund_work_items')
      .upsert(queueRows, { onConflict: 'source_transaction_id', ignoreDuplicates: true })

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create event refund work items' }, { status: 500 })
    }

    return NextResponse.json({ success: true, created: queueRows.length })
  } catch (error) {
    console.error('Admin refund queue POST error:', error)
    return NextResponse.json({ error: 'Failed to enqueue refund work items' }, { status: 500 })
  }
}
