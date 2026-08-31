/**
 * ADMIN PAYOUT ACTION API
 * POST /api/admin/payouts/[id]  { action: 'approve' | 'reject', admin_notes?: string }
 *
 * This is the only path by which money leaves the platform. Approving fires a
 * real, irreversible Paystack transfer, so every precondition is re-checked
 * here against current state rather than trusted from the queued row.
 *
 * The sequence mirrors src/app/api/payments/withdraw/route.ts, which is not
 * stylistic: Paystack's Transfer Approval webhook (see
 * src/app/api/payments/transfer-approval/route.ts) validates the outgoing
 * transfer against a `transactions` row that must already exist with a matching
 * reference, net_amount in cents, and recipient_code. Creating that row before
 * calling initiateTransfer is therefore required, not optional.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { initiateTransfer, generatePaymentReference } from '@/lib/paystack'
import { adjustProfileBalanceBuckets } from '@/lib/payments/escrow'
import { createNotification } from '@/lib/notifications'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function resolveRecipientType(profile: { is_artist?: boolean; is_provider?: boolean }) {
  if (profile.is_artist) return 'artist'
  if (profile.is_provider) return 'vendor'
  return 'organizer'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: payoutId } = await params

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, is_admin, admin_role')
      .eq('id', user.id)
      .single()

    if (!adminProfile?.is_admin && !['admin', 'super_admin'].includes(adminProfile?.admin_role ?? '')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({})) as { action?: string; admin_notes?: string }
    const action = body.action
    const adminNotes = typeof body.admin_notes === 'string' ? body.admin_notes.trim() : ''

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
    }

    const { data: payoutRequest, error: fetchError } = await supabaseAdmin
      .from('payout_requests')
      .select('*')
      .eq('id', payoutId)
      .single()

    if (fetchError || !payoutRequest) {
      return NextResponse.json({ error: 'Payout request not found' }, { status: 404 })
    }

    // Guards against a double-click or two admins acting at once paying twice.
    if (payoutRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `This payout is already ${payoutRequest.status}` },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    if (action === 'reject') {
      if (!adminNotes) {
        return NextResponse.json(
          { error: 'A note is required when rejecting, so there is a record of why' },
          { status: 400 }
        )
      }

      await supabaseAdmin
        .from('payout_requests')
        .update({
          status: 'rejected',
          admin_notes: adminNotes,
          reviewed_by: user.id,
          processed_at: now,
        })
        .eq('id', payoutId)

      // Money stays in the recipient's available balance — rejecting declines
      // this request, it does not confiscate anything.
      return NextResponse.json({ success: true, message: 'Payout rejected. Funds remain in the recipient balance.' })
    }

    // ── Approve ──────────────────────────────────────────────────────────────
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, wallet_balance, is_verified, is_artist, is_provider')
      .eq('id', payoutRequest.user_id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Recipient profile not found' }, { status: 404 })
    }
    if (!profile.is_verified) {
      return NextResponse.json({ error: 'Recipient is no longer verified' }, { status: 400 })
    }

    const { data: payoutAccount } = await supabaseAdmin
      .from('payout_accounts')
      .select('paystack_recipient_code, account_number, bank_name, account_holder')
      .eq('profile_id', payoutRequest.user_id)
      .maybeSingle()

    if (!payoutAccount?.paystack_recipient_code) {
      return NextResponse.json(
        { error: 'No Paystack recipient exists for this account. Re-run verification approval to create one.' },
        { status: 400 }
      )
    }

    // Re-check against the live balance, not the amount captured at queue time.
    const amountRands = Number(payoutRequest.amount || 0)
    const availableRands = Number(profile.wallet_balance || 0)

    if (amountRands <= 0) {
      return NextResponse.json({ error: 'Payout amount must be greater than zero' }, { status: 400 })
    }
    if (amountRands > availableRands) {
      return NextResponse.json(
        { error: `Available balance (R${availableRands.toFixed(2)}) is less than the payout amount (R${amountRands.toFixed(2)})` },
        { status: 400 }
      )
    }

    // No fee and no minimum on this path: commission was already taken at the
    // point of sale, and an admin approves each payout individually.
    const amountCents = Math.round(amountRands * 100)
    const reference = generatePaymentReference('PAY')

    const { data: transaction, error: txnError } = await supabaseAdmin
      .from('transactions')
      .insert({
        reference,
        type: 'payout',
        state: 'initiated',
        payer_id: payoutRequest.user_id,
        recipient_id: payoutRequest.user_id,
        recipient_type: resolveRecipientType(profile),
        amount: amountCents,
        platform_fee: 0,
        net_amount: amountCents,
        gateway_provider: 'paystack',
        gateway_response: {
          payout_type: 'admin_approved_payout',
          payout_request_id: payoutId,
          approved_by: user.id,
          bank_name: payoutAccount.bank_name,
          account_number_last4: String(payoutAccount.account_number || '').slice(-4),
          account_name: payoutAccount.account_holder,
          recipient_code: payoutAccount.paystack_recipient_code,
        },
      })
      .select()
      .single()

    if (txnError || !transaction) {
      console.error('Payout transaction creation failed:', txnError)
      return NextResponse.json({ error: 'Could not create the payout record' }, { status: 500 })
    }

    await supabaseAdmin
      .from('payout_requests')
      .update({
        status: 'processing',
        reviewed_by: user.id,
        processed_at: now,
        reference,
        admin_notes: adminNotes || null,
      })
      .eq('id', payoutId)

    // Reserve the funds before calling Paystack, so a slow response can't be
    // approved twice against the same balance.
    const reserve = await adjustProfileBalanceBuckets(
      payoutRequest.user_id,
      { walletDelta: -amountRands, pendingPayoutDelta: amountRands },
      {
        reasonCode: 'admin_payout_reserved',
        referenceType: 'transaction',
        referenceId: String(transaction.id),
        actorUserId: user.id,
        metadata: { reference, payoutRequestId: payoutId },
      }
    )

    if (!reserve.success) {
      await supabaseAdmin
        .from('transactions')
        .update({ state: 'failed', failure_reason: 'Balance reservation failed' })
        .eq('id', transaction.id)
      await supabaseAdmin
        .from('payout_requests')
        .update({ status: 'failed', admin_notes: 'Balance reservation failed' })
        .eq('id', payoutId)

      return NextResponse.json({ error: 'Could not reserve the funds for payout' }, { status: 500 })
    }

    const transferResult = await initiateTransfer({
      amount: amountCents,
      recipient_code: payoutAccount.paystack_recipient_code,
      reference,
      reason: `Ziyawa payout - ${reference}`,
    }).catch((error) => {
      console.error('Paystack transfer threw:', error)
      return { status: false, message: error instanceof Error ? error.message : 'Transfer failed' }
    })

    if (!transferResult.status) {
      // Put the money back exactly as the withdraw route does, so a failed
      // transfer never leaves funds stranded in pending_payout.
      await adjustProfileBalanceBuckets(
        payoutRequest.user_id,
        { walletDelta: amountRands, pendingPayoutDelta: -amountRands },
        {
          reasonCode: 'admin_payout_restore_failed_transfer',
          referenceType: 'transaction',
          referenceId: String(transaction.id),
          actorUserId: user.id,
          metadata: { reference, failure: transferResult.message || 'Transfer initiation failed' },
        }
      )

      await supabaseAdmin
        .from('transactions')
        .update({
          state: 'failed',
          failed_at: new Date().toISOString(),
          failure_reason: transferResult.message || 'Transfer initiation failed',
        })
        .eq('id', transaction.id)

      await supabaseAdmin
        .from('payout_requests')
        .update({ status: 'failed', admin_notes: transferResult.message || 'Transfer initiation failed' })
        .eq('id', payoutId)

      return NextResponse.json(
        { error: `Transfer failed: ${transferResult.message || 'unknown error'}. The balance has been restored.` },
        { status: 400 }
      )
    }

    const transferData = 'data' in transferResult ? transferResult.data : null

    await supabaseAdmin
      .from('transactions')
      .update({ state: 'released', released_at: new Date().toISOString(), gateway_response: transferData })
      .eq('id', transaction.id)

    // Left as 'processing' rather than 'completed': the transfer.success
    // webhook settles it once Paystack confirms the money actually landed.
    await supabaseAdmin
      .from('payout_requests')
      .update({ gateway_reference: transferData?.transfer_code || null, gateway_response: transferData })
      .eq('id', payoutId)

    await createNotification({
      userId: payoutRequest.user_id,
      type: 'payout_sent',
      title: 'Payout on its way',
      message: `Your payout of R${amountRands.toFixed(2)} has been approved and sent to your bank account.`,
      link: '/wallet',
      transactionId: transaction.id,
      sendEmail: true,
    })

    return NextResponse.json({
      success: true,
      reference,
      amount: amountRands,
      message: `Payout of R${amountRands.toFixed(2)} initiated.`,
    })
  } catch (error) {
    console.error('Admin payout action error:', error)
    return NextResponse.json({ error: 'Payout action failed' }, { status: 500 })
  }
}
