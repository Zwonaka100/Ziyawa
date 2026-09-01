import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { adjustProfileBalanceBuckets } from '@/lib/payments/escrow'
import { refundPayment } from '@/lib/paystack'
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

    // The source charge tells us where to send the money back to, and how much
    // of the organizer's balance was never actually earned.
    const { data: sourceTxn } = item.source_transaction_id
      ? await supabaseAdmin
          .from('transactions')
          .select('id, reference, type, state, amount, net_amount, recipient_id')
          .eq('id', item.source_transaction_id)
          .maybeSingle()
      : { data: null }

    const failWorkItem = async (reason: string) => {
      await supabaseAdmin
        .from('refund_work_items')
        .update({
          status: 'failed',
          reviewed_by: adminCheck.user?.id,
          reviewed_at: now,
          admin_notes: notes ? `${notes} — ${reason}` : reason,
          updated_at: now,
        })
        .eq('id', id)
    }

    if (!sourceTxn?.reference) {
      await failWorkItem('No original charge on file to reverse')
      return NextResponse.json(
        { error: 'This refund has no original transaction reference, so it cannot be reversed to a card.' },
        { status: 400 }
      )
    }

    // Reverse to the original card. Deliberately NOT a balance credit: that
    // would leave money the buyer can only extract via a bank transfer, which
    // costs ~R3 per person and, for a groovist with no verified payout account,
    // could not be extracted at all.
    const refundResult = await refundPayment({
      reference: sourceTxn.reference,
      amount: Math.round(amountRands * 100),
    }).catch((error) => ({
      status: false,
      message: error instanceof Error ? error.message : 'Refund request failed',
    }))

    if (!refundResult.status) {
      const reason = refundResult.message || 'Paystack refused the refund'
      await failWorkItem(reason)
      return NextResponse.json(
        {
          error: `Paystack could not reverse this charge: ${reason}. Nothing was moved. ` +
            `If the charge is too old for the card network to accept a reversal, pay it out manually and note it here.`,
        },
        { status: 400 }
      )
    }

    // The organizer was credited on purchase; a refunded ticket was never
    // earned. Which bucket to take it out of depends on how far the money got.
    // If it has already been paid to their bank there is nothing left to
    // reverse — say so rather than silently corrupting the balance.
    let organizerClawbackNote: string | null = null
    const organizerNetRands = Math.round(Number(sourceTxn.net_amount || 0)) / 100

    if (sourceTxn.recipient_id && organizerNetRands > 0 && sourceTxn.type === 'ticket_purchase') {
      const clawbackContext = {
        reasonCode: 'refund_organizer_clawback',
        referenceType: 'refund_work_item',
        referenceId: item.id,
        actorUserId: adminCheck.user?.id,
        metadata: {
          eventId: item.event_id,
          sourceTransactionId: sourceTxn.id,
          sourceState: sourceTxn.state,
          reasonCode: item.reason_code,
        },
      }

      if (sourceTxn.state === 'held') {
        await adjustProfileBalanceBuckets(
          sourceTxn.recipient_id,
          { heldDelta: -organizerNetRands },
          clawbackContext
        )
      } else if (sourceTxn.state === 'released') {
        await adjustProfileBalanceBuckets(
          sourceTxn.recipient_id,
          { walletDelta: -organizerNetRands },
          clawbackContext
        )
      } else if (sourceTxn.state === 'settled') {
        organizerClawbackNote =
          `R${organizerNetRands.toFixed(2)} was already paid out to the organizer for this ticket ` +
          `and could not be reclaimed automatically. Recover it manually.`
        console.error('Refund on an already-settled ticket:', {
          workItemId: item.id,
          sourceTransactionId: sourceTxn.id,
          organizerNetRands,
        })
      }
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
        gateway_provider: 'paystack',
        authorized_at: now,
        settled_at: now,
        gateway_response: {
          refund_work_item_id: item.id,
          reason_code: item.reason_code,
          source_transaction_id: item.source_transaction_id,
          source_reference: sourceTxn.reference,
          destination: 'original_card',
          paystack_refund_status: 'data' in refundResult ? refundResult.data?.status : null,
          organizer_clawback_rands: organizerNetRands,
          organizer_clawback_note: organizerClawbackNote,
        },
      })
      .select('id')
      .single()

    if (txError || !refundTx) {
      // Deliberately no rollback: the money has already left for the buyer's
      // card and Paystack reversals cannot be un-done. Losing the audit row is
      // bad, but pretending the refund did not happen would be worse — record
      // it loudly and leave the work item for a human.
      console.error('Refund succeeded at Paystack but the transaction record failed:', {
        workItemId: item.id,
        sourceReference: sourceTxn.reference,
        amountRands,
        error: txError,
      })

      await failWorkItem(
        `Paystack refunded R${amountRands.toFixed(2)} to the card, but writing the transaction record failed. ` +
        `Do NOT retry — the buyer has been refunded.`
      )

      return NextResponse.json(
        {
          error: `The refund went through at Paystack but could not be recorded. ` +
            `Do not retry it — the buyer has already been refunded R${amountRands.toFixed(2)}.`,
        },
        { status: 500 }
      )
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
          organizer_clawback_rands: organizerNetRands,
          organizer_clawback_note: organizerClawbackNote,
        },
      })
      .eq('id', id)

    await createNotification({
      userId: item.user_id,
      type: 'refund_issued',
      title: 'Refund on its way',
      message:
        `R${amountRands.toFixed(2)} has been sent back to the card you paid with. ` +
        `Banks usually take a few working days to show it.`,
      link: '/dashboard/tickets',
      transactionId: refundTx.id,
      sendEmail: true,
    })

    return NextResponse.json({
      success: true,
      status: 'executed',
      refundTransactionId: refundTx.id,
      // Surfaced so the admin sees it in the UI rather than only in the logs.
      warning: organizerClawbackNote,
    })
  } catch (error) {
    console.error('Refund decision error:', error)
    return NextResponse.json({ error: 'Failed to process refund decision' }, { status: 500 })
  }
}
