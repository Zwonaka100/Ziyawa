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
import { requireAdminApi } from '@/lib/admin-auth'
import { buildPayoutRejectionMessage } from '@/lib/payout-rejection-reasons'
import { buildPayoutStatementPdf } from '@/lib/payments/payout-statement-pdf'
import { sendPayoutStatementEmail } from '@/lib/email'
import { formatMoneyExact } from '@/lib/helpers'
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

/** How the recipient's role reads on their own statement. */
const RECIPIENT_ROLE_LABEL: Record<string, string> = {
  organizer: 'Event organiser',
  artist: 'Artist',
  vendor: 'Crew / service provider',
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: payoutId } = await params

    const gate = await requireAdminApi()
    if ('response' in gate) return gate.response
    const user = { id: gate.admin.userId }

    const body = await request.json().catch(() => ({})) as {
      action?: string
      admin_notes?: string
      rejection_codes?: string[]
    }
    const action = body.action
    const adminNotes = typeof body.admin_notes === 'string' ? body.admin_notes.trim() : ''
    const rejectionCodes = Array.isArray(body.rejection_codes) ? body.rejection_codes : []
    // Composed server-side from the codes, so the browser cannot choose the
    // wording of an email Ziyawa sends about someone's money.
    const rejectionText = buildPayoutRejectionMessage(rejectionCodes, adminNotes)

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
      if (!rejectionText) {
        return NextResponse.json(
          { error: 'Select at least one reason, or add a note explaining why this was declined' },
          { status: 400 }
        )
      }

      await supabaseAdmin
        .from('payout_requests')
        .update({
          status: 'rejected',
          // The full composed prose, so the record and the email agree.
          admin_notes: rejectionText,
          reviewed_by: user.id,
          processed_at: now,
        })
        .eq('id', payoutId)

      // Tell them. This branch used to require a reason and then send nothing —
      // no email, no notification — so someone expecting money watched it not
      // arrive with no explanation anywhere. The approve branch has always
      // notified; only the bad news was silent.
      const { data: recipient } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', payoutRequest.user_id)
        .maybeSingle()

      if (recipient) {
        await createNotification({
          userId: recipient.id,
          type: 'payment_failed',
          title: 'Your payout is on hold',
          message:
            `We could not send your payment of ${formatMoneyExact(Number(payoutRequest.amount || 0))} yet. ` +
            `Here is why:\n\n${rejectionText}\n\n` +
            'Your money is safe and stays in your Ziyawa balance.',
          link: '/earnings',
          sendEmail: true,
        }).catch((error) => {
          console.error('Payout rejection notification failed', { payoutId, error })
        })
      }

      // Money stays in the recipient's available balance — rejecting declines
      // this request, it does not confiscate anything.
      return NextResponse.json({ success: true, message: 'Payout rejected. The recipient has been told why, and the funds remain in their balance.' })
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
      // failure_reason, not admin_notes — the latter holds what the approving
      // admin typed, and overwriting it would destroy their record of why.
      await supabaseAdmin
        .from('payout_requests')
        .update({ status: 'failed', failure_reason: 'Balance reservation failed' })
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
        .update({
          status: 'failed',
          failure_reason: transferResult.message || 'Transfer initiation failed',
        })
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

    // Left as 'processing' rather than 'completed': settlePayoutRequest() in
    // src/app/api/webhooks/paystack/route.ts moves it to completed/failed once
    // Paystack confirms what actually happened to the money. Nothing else
    // clears this row, and enqueuePayoutRequest() will not queue this person
    // again until it is cleared.
    await supabaseAdmin
      .from('payout_requests')
      .update({ gateway_reference: transferData?.transfer_code || null, gateway_response: transferData })
      .eq('id', payoutId)

    // The in-app notification stays short; the email carries the detail.
    await createNotification({
      userId: payoutRequest.user_id,
      type: 'payout_sent',
      title: 'Payout on its way',
      message: `${formatMoneyExact(amountRands)} has been sent to your ${payoutAccount.bank_name || 'bank'} account ending ${String(payoutAccount.account_number || '').slice(-4)}. It usually lands within one business day.`,
      link: '/earnings',
      transactionId: transaction.id,
      sendEmail: false,
    })

    // A proper statement, with a PDF to keep. This used to be a one-line
    // generic notification on the single most important message Ziyawa sends —
    // no amount breakdown, no bank details, no record of what it covered.
    //
    // Everything below is best-effort: the transfer has already been
    // initiated, so a failure to describe it must never fail the request.
    try {
      // payout_requests carries no event link — enqueuePayoutRequest queues the
      // whole pooled wallet balance, so the event→money trail is severed at
      // write time. The releases that made this balance payable are the
      // closest honest answer, so they are what the statement itemises.
      // Read the real recorded figures rather than deriving them.
      //
      // The first version of this took the organiser's NET amounts, called that
      // "ticket sales", then invented a booking fee as (net - paid) and
      // hardcoded card fees to zero. Gmaster's statement therefore claimed
      // R180 of ticket sales, a R90 booking fee and R0.00 to Paystack, when the
      // truth was R210, R30 and R9.32. Every one of those numbers is stored on
      // the transaction; none of them needed inventing.
      const { data: released } = await supabaseAdmin
        .from('transactions')
        .select('amount, platform_fee, net_amount, gateway_fee_cents, released_at, recipient_type, event:events(title, event_date)')
        .eq('recipient_id', payoutRequest.user_id)
        .eq('type', 'ticket_purchase')
        .eq('state', 'released')
        .order('released_at', { ascending: false })
        .limit(200)

      type ReleasedSale = {
        amount: number | null
        platform_fee: number | null
        net_amount: number | null
        gateway_fee_cents: number | null
        recipient_type: string | null
        event: { title: string; event_date: string } | null
      }
      const sales = ((released || []) as unknown as ReleasedSale[]).filter((row) => row.event)

      // One line per event, not per ticket: a statement for a fifty-ticket
      // event should not run to fifty rows.
      const byEvent = new Map<string, { label: string; detail: string; amountRands: number; tickets: number }>()
      for (const sale of sales) {
        const key = `${sale.event!.title}|${sale.event!.event_date}`
        const entry = byEvent.get(key) ?? {
          label: sale.event!.title,
          detail: sale.event!.event_date,
          amountRands: 0,
          tickets: 0,
        }
        entry.amountRands += Number(sale.net_amount || 0) / 100
        entry.tickets += 1
        byEvent.set(key, entry)
      }

      const sources = [...byEvent.values()].map((entry) => ({
        label: entry.label,
        detail: `${entry.tickets} ticket${entry.tickets === 1 ? '' : 's'} · ${new Date(entry.detail).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        amountRands: entry.amountRands,
      }))

      const sumOf = (pick: (row: ReleasedSale) => number | null) =>
        sales.reduce((total, row) => total + Number(pick(row) || 0), 0) / 100

      const grossSalesRands = sumOf((r) => r.amount)
      const bookingFeesRands = sumOf((r) => r.platform_fee)
      const gatewayFeesRands = sumOf((r) => r.gateway_fee_cents)

      // Paid for the role the money was actually earned in. resolveRecipientType
      // reads profile flags, so an organiser who also has an artist profile was
      // labelled "Artist" on a statement for their own event's ticket sales.
      const earnedAs = sales[0]?.recipient_type || resolveRecipientType(profile)

      const statementPdf = await buildPayoutStatementPdf({
        reference,
        recipientName: profile.full_name || profile.email,
        recipientEmail: profile.email,
        recipientRole: RECIPIENT_ROLE_LABEL[earnedAs] ?? 'Recipient',
        amountRands,
        bankName: payoutAccount.bank_name || 'Bank',
        accountLast4: String(payoutAccount.account_number || '').slice(-4),
        accountHolder: payoutAccount.account_holder || profile.full_name || '',
        approvedAt: new Date(now),
        sources,
        grossSalesRands,
        bookingFeesRands,
        gatewayFeesRands,
      })

      const emailResult = await sendPayoutStatementEmail(profile.email, {
        recipientName: (profile.full_name || profile.email).split(' ')[0],
        amount: formatMoneyExact(amountRands),
        bankName: payoutAccount.bank_name || 'your bank',
        accountLast4: String(payoutAccount.account_number || '').slice(-4),
        reference,
        sources: sources.map((row) => ({
          label: row.label,
          detail: row.detail,
          amount: formatMoneyExact(row.amountRands),
        })),
        recipientId: profile.id,
        statementPdf,
      })

      if (!emailResult.success) {
        console.error('Payout statement email not sent', { payoutId, reason: emailResult.error })
      }
    } catch (statementError) {
      console.error('Payout statement could not be produced', {
        payoutId,
        message: statementError instanceof Error ? statementError.message : String(statementError),
      })
    }

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
