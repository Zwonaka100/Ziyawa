import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { adjustProfileBalanceBuckets } from '@/lib/payments/escrow'
import { createNotification } from '@/lib/notifications'

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type RefundDecision = 'approve' | 'reject' | 'review'

function resolveRecipientType(profile: { is_artist?: boolean; is_provider?: boolean }) {
  if (profile.is_artist) return 'artist'
  if (profile.is_provider) return 'vendor'
  return 'organizer'
}

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminCheck = await assertAdmin()
    if (adminCheck.error) return adminCheck.error

    const body = await request.json().catch(() => ({})) as {
      decision?: RefundDecision
      notes?: string
    }

    const decision = body.decision
    const notes = String(body.notes || '').trim()

    if (!decision || !['approve', 'reject', 'review'].includes(decision)) {
      return NextResponse.json({ error: 'decision must be approve, reject, or review' }, { status: 400 })
    }

    const { data: item, error: itemError } = await supabaseAdmin
      .from('refund_work_items')
      .select('id, event_id, source_transaction_id, user_id, amount_cents, reason_code, status')
      .eq('id', id)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Refund work item not found' }, { status: 404 })
    }

    const now = new Date().toISOString()

    if (decision === 'review') {
      const { error } = await supabaseAdmin
        .from('refund_work_items')
        .update({
          status: 'under_review',
          reviewed_by: adminCheck.user?.id,
          reviewed_at: now,
          admin_notes: notes || null,
          updated_at: now,
        })
        .eq('id', id)

      if (error) {
        return NextResponse.json({ error: 'Failed to move refund work item to review' }, { status: 500 })
      }

      return NextResponse.json({ success: true, status: 'under_review' })
    }

    if (decision === 'reject') {
      const { error } = await supabaseAdmin
        .from('refund_work_items')
        .update({
          status: 'rejected',
          reviewed_by: adminCheck.user?.id,
          reviewed_at: now,
          admin_notes: notes || null,
          updated_at: now,
        })
        .eq('id', id)

      if (error) {
        return NextResponse.json({ error: 'Failed to reject refund work item' }, { status: 500 })
      }

      return NextResponse.json({ success: true, status: 'rejected' })
    }

    if (item.status === 'executed') {
      return NextResponse.json({ success: true, status: 'executed', alreadyExecuted: true })
    }

    const amountRands = Math.round((Number(item.amount_cents || 0) / 100) * 100) / 100
    if (amountRands <= 0) {
      return NextResponse.json({ error: 'Refund amount is invalid' }, { status: 400 })
    }

    const walletCredit = await adjustProfileBalanceBuckets(
      item.user_id,
      { walletDelta: amountRands },
      {
        reasonCode: 'admin_refund_wallet_credit',
        referenceType: 'refund_work_item',
        referenceId: item.id,
        actorUserId: adminCheck.user?.id,
        metadata: {
          eventId: item.event_id,
          sourceTransactionId: item.source_transaction_id,
          reasonCode: item.reason_code,
        },
      }
    )

    if (!walletCredit.success) {
      await supabaseAdmin
        .from('refund_work_items')
        .update({
          status: 'failed',
          reviewed_by: adminCheck.user?.id,
          reviewed_at: now,
          admin_notes: notes || 'Wallet credit failed',
          updated_at: now,
        })
        .eq('id', id)

      return NextResponse.json({ error: 'Failed to credit user wallet' }, { status: 500 })
    }

    const { data: recipientProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_artist, is_provider')
      .eq('id', item.user_id)
      .single()

    const reference = `RFD-${item.id.slice(0, 8)}-${Date.now()}`

    const { data: refundTx, error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        reference,
        type: 'refund',
        state: 'settled',
        amount: Math.round(amountRands * 100),
        platform_fee: 0,
        net_amount: Math.round(amountRands * 100),
        payer_id: adminCheck.user?.id,
        recipient_id: item.user_id,
        recipient_type: resolveRecipientType(recipientProfile || {}),
        event_id: item.event_id,
        gateway_provider: 'wallet_credit',
        authorized_at: now,
        settled_at: now,
        gateway_response: {
          refund_work_item_id: item.id,
          reason_code: item.reason_code,
          source_transaction_id: item.source_transaction_id,
        },
      })
      .select('id')
      .single()

    if (txError || !refundTx) {
      await adjustProfileBalanceBuckets(item.user_id, { walletDelta: -amountRands }, {
        reasonCode: 'admin_refund_wallet_credit_reversal',
        referenceType: 'refund_work_item',
        referenceId: item.id,
        actorUserId: adminCheck.user?.id,
      })

      await supabaseAdmin
        .from('refund_work_items')
        .update({
          status: 'failed',
          reviewed_by: adminCheck.user?.id,
          reviewed_at: now,
          admin_notes: notes || 'Refund transaction record failed',
          updated_at: now,
        })
        .eq('id', id)

      return NextResponse.json({ error: 'Failed to write refund transaction' }, { status: 500 })
    }

    if (item.source_transaction_id) {
      await supabaseAdmin
        .from('transactions')
        .update({
          state: 'refunded',
          refunded_at: now,
          refund_amount: Math.round(amountRands * 100),
          refund_reason: `Approved refund work item ${item.id}`,
        })
        .eq('id', item.source_transaction_id)
    }

    await supabaseAdmin
      .from('refund_work_items')
      .update({
        status: 'executed',
        reviewed_by: adminCheck.user?.id,
        reviewed_at: now,
        executed_at: now,
        admin_notes: notes || null,
        updated_at: now,
        metadata: {
          refund_transaction_id: refundTx.id,
        },
      })
      .eq('id', id)

    await createNotification({
      userId: item.user_id,
      type: 'refund_issued',
      title: 'Refund approved and credited',
      message: `Your refund has been approved and credited to your Ziyawa wallet. Amount: R${amountRands.toFixed(2)}.`,
      link: '/wallet',
      transactionId: refundTx.id,
      sendEmail: true,
    })

    return NextResponse.json({ success: true, status: 'executed', refundTransactionId: refundTx.id })
  } catch (error) {
    console.error('Refund decision error:', error)
    return NextResponse.json({ error: 'Failed to process refund decision' }, { status: 500 })
  }
}
