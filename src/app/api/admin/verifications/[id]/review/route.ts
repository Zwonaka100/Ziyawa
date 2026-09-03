/**
 * ADMIN VERIFICATION REVIEW API
 * POST /api/admin/verifications/[id]/review
 *
 * Approves or rejects a verification request.
 * Requires admin or super_admin role.
 * Uses service role client to bypass RLS.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createNotification } from '@/lib/notifications'
import { createTransferRecipient } from '@/lib/paystack'
import { enqueuePayoutRequest } from '@/lib/payments/escrow'
import { buildRejectionMessage } from '@/lib/verification-rejection-reasons'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface VerificationBankDetails {
  profile_id: string
  bank_code: string | null
  bank_name: string | null
  account_number: string | null
  account_holder: string | null
  legal_name: string | null
}

/**
 * Store the verified bank details and create the Paystack Transfer Recipient
 * that future payouts will target.
 *
 * Note there is no machine check on the account itself: Paystack's resolve
 * endpoint supports only NGN/USD/GHS/KES (not ZAR), and createTransferRecipient
 * accepts any well-formed account number without validating it. The admin's
 * comparison of the declared account holder against the ID document, made
 * before calling this, is the actual safeguard.
 *
 * Returns rather than throws: identity approval has already succeeded by the
 * time this runs, and a Paystack outage should not roll that back or leave the
 * request stuck as pending. A failure is persisted on the row so it can be
 * retried and shown to an admin.
 */
async function setUpPayoutAccount(
  request: VerificationBankDetails
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { profile_id, bank_code, bank_name, account_number, account_holder, legal_name } = request

  if (!bank_code || !bank_name || !account_number || !account_holder) {
    return { ok: false, error: 'No bank details were submitted with this request' }
  }

  try {
    const recipient = await createTransferRecipient({
      name: account_holder,
      account_number,
      bank_code,
    })

    if (!recipient.status || !recipient.data?.recipient_code) {
      throw new Error('Paystack did not return a recipient code')
    }

    const { error } = await supabaseAdmin
      .from('payout_accounts')
      .upsert({
        profile_id,
        bank_code,
        bank_name,
        account_number,
        account_holder,
        legal_name,
        paystack_recipient_code: recipient.data.recipient_code,
        recipient_error: null,
        verified_at: new Date().toISOString(),
      }, { onConflict: 'profile_id' })

    if (error) throw error

    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Payout account setup failed:', message)

    // Keep the details so an admin can see what was attempted and retry,
    // rather than losing them because Paystack was unavailable.
    await supabaseAdmin
      .from('payout_accounts')
      .upsert({
        profile_id,
        bank_code,
        bank_name,
        account_number,
        account_holder,
        legal_name,
        paystack_recipient_code: null,
        recipient_error: message,
      }, { onConflict: 'profile_id' })

    return { ok: false, error: message }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params

    // Auth check
    const gate = await requireAdminApi()
    if ('response' in gate) return gate.response
    const user = { id: gate.admin.userId }

    const body = await request.json().catch(() => ({})) as {
      action?: string
      rejection_reason?: string
      rejection_codes?: string[]
    }
    const { action, rejection_reason } = body
    const rejectionCodes = Array.isArray(body.rejection_codes) ? body.rejection_codes : []
    const rejectionNote = typeof rejection_reason === 'string' ? rejection_reason.trim() : ''

    // Compose the user-facing text server-side from known codes, so the client
    // cannot put arbitrary wording into an email we send on the user's behalf.
    const rejectionText = buildRejectionMessage(rejectionCodes, rejectionNote)

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
    }
    if (action === 'reject' && !rejectionText) {
      return NextResponse.json(
        { error: 'Select at least one rejection reason, or add a note explaining what needs fixing' },
        { status: 400 }
      )
    }

    // Fetch the request
    const { data: verificationRequest, error: fetchError } = await supabaseAdmin
      .from('verification_requests')
      .select('id, profile_id, entity_type, status, submitted_at, bank_code, bank_name, account_number, account_holder, legal_name')
      .eq('id', requestId)
      .single()

    if (fetchError || !verificationRequest) {
      return NextResponse.json({ error: 'Verification request not found' }, { status: 404 })
    }

    if (verificationRequest.status !== 'pending') {
      return NextResponse.json({
        error: `This request is already ${verificationRequest.status}`,
      }, { status: 400 })
    }

    const now = new Date().toISOString()

    if (action === 'approve') {
      const { error: requestUpdateError } = await supabaseAdmin
        .from('verification_requests')
        .update({
          status: 'approved',
          reviewed_at: now,
          reviewed_by: user.id,
        })
        .eq('id', requestId)

      if (requestUpdateError) {
        throw requestUpdateError
      }

      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({
          is_verified: true,
          verified_at: now,
          verified_entity_type: verificationRequest.entity_type,
        })
        .eq('id', verificationRequest.profile_id)

      if (profileUpdateError) {
        throw profileUpdateError
      }

      // Set up the payout destination now, while an admin is looking at this
      // person — so a bad account surfaces here rather than when someone is
      // waiting to be paid. A Paystack failure must not undo the identity
      // approval, so it is recorded and left for retry instead of thrown.
      const payoutSetup = await setUpPayoutAccount(verificationRequest)

      // Money that released BEFORE this approval is stranded without this call.
      //
      // enqueuePayoutRequest only ever ran after a fund release. So verifying
      // first and releasing later worked, while releasing first and verifying
      // later left the balance sitting in wallet_balance with nothing that
      // would ever queue it again — no admin row to approve, no notification,
      // nothing. Verification is exactly the moment that block clears, so it is
      // the moment to retry the queue.
      const enqueueOutcome = payoutSetup.ok
        ? await enqueuePayoutRequest(verificationRequest.profile_id)
        : 'no_payout_account'

      if (enqueueOutcome === 'error') {
        console.error('Post-verification payout enqueue failed', {
          profileId: verificationRequest.profile_id,
        })
      }

      await createNotification({
        userId: verificationRequest.profile_id,
        type: 'profile_verified',
        title: 'Identity verified ✓',
        // Ziyawa has no withdrawals — self-service withdrawal is a retired 410
        // route. Telling a newly verified organiser to "withdraw from your
        // wallet" sent them looking for a button that does not exist.
        message: enqueueOutcome === 'queued'
          ? 'Your identity is verified. Your available earnings are now queued for payout — our team approves it and the money goes to your bank. Nothing further for you to do.'
          : 'Your identity is verified. Earnings from your events are paid out to your bank automatically after each event clears its settlement period. There is nothing to withdraw and nothing further for you to do.',
        link: '/earnings',
        sendEmail: true,
      })

      return NextResponse.json({
        success: true,
        message: payoutSetup.ok
          ? `Verification approved. Payout account is ready.${enqueueOutcome === 'queued' ? ' Their available balance has been queued for payout.' : ''}`
          : `Verification approved, but the payout account could not be set up: ${payoutSetup.error}`,
        payoutAccountReady: payoutSetup.ok,
        payoutAccountError: payoutSetup.ok ? null : payoutSetup.error,
        payoutQueued: enqueueOutcome === 'queued',
      })
    }

    // Reject
    await supabaseAdmin
      .from('verification_requests')
      .update({
        status: 'rejected',
        reviewed_at: now,
        reviewed_by: user.id,
        rejection_reason: rejectionText,
      })
      .eq('id', requestId)

    // Notify the user
    await createNotification({
      userId: verificationRequest.profile_id,
      type: 'profile_verified',
      title: 'Verification unsuccessful',
      message:
        `We couldn't approve your verification yet. Here's what needs fixing:\n\n${rejectionText}\n\n` +
        'Once sorted, submit again from your settings — you can reuse anything that was fine.',
      link: '/dashboard/settings?tab=verification',
      sendEmail: true,
    })

    return NextResponse.json({
      success: true,
      message: 'Verification rejected. User has been notified.',
    })
  } catch (error) {
    console.error('Verification review error:', error)
    return NextResponse.json({ error: 'Review failed' }, { status: 500 })
  }
}
