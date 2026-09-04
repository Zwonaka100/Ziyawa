/**
 * The admin's decision on an event's payout: pay it, or decline it with a
 * reason the organiser is actually told.
 *
 * Approving here only gets the money *ready* — it releases the held funds
 * ahead of the review window and queues the payout request. The transfer
 * itself still goes through /api/admin/payouts/[id], which is the one place
 * that talks to Paystack, reserves the balance and handles a failed transfer.
 * Duplicating that here would mean two code paths that move real money.
 *
 * Declining never takes anything away. The funds stay exactly where they are;
 * the organiser is told why they are waiting and what to do about it.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi, createAdminServiceClient } from '@/lib/admin-auth'
import { enqueuePayoutRequest, releaseEligibleHeldFunds } from '@/lib/payments/escrow'
import { loadEventPayoutReview } from '@/lib/admin/event-payout-review'
import { buildPayoutRejectionMessage } from '@/lib/payout-rejection-reasons'
import { createNotification } from '@/lib/notifications'
import { formatMoneyExact } from '@/lib/helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  const { id: eventId } = await params
  const body = (await request.json().catch(() => ({}))) as {
    action?: 'approve' | 'decline'
    rejection_codes?: string[]
    admin_notes?: string
  }

  if (body.action !== 'approve' && body.action !== 'decline') {
    return NextResponse.json({ error: 'action must be approve or decline' }, { status: 400 })
  }

  const db = createAdminServiceClient()
  const review = await loadEventPayoutReview(eventId)
  if (!review) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const audit = (action: string, details: Record<string, unknown>) =>
    db
      .from('admin_audit_logs')
      .insert({
        admin_id: gate.admin.userId,
        action,
        target_type: 'event',
        target_id: eventId,
        details,
      })
      .then(undefined, (error) => console.error('Payout decision audit failed', { eventId, error }))

  // ── Decline ──────────────────────────────────────────────────────────────
  if (body.action === 'decline') {
    const note = typeof body.admin_notes === 'string' ? body.admin_notes.trim() : ''
    const codes = Array.isArray(body.rejection_codes) ? body.rejection_codes : []
    // Composed server-side so the browser cannot author an email about someone's money.
    const message = buildPayoutRejectionMessage(codes, note)

    if (!message) {
      return NextResponse.json(
        { error: 'Select at least one reason, or write a note explaining the hold' },
        { status: 400 }
      )
    }

    if (review.existingPayoutRequestId) {
      await db
        .from('payout_requests')
        .update({
          status: 'rejected',
          admin_notes: message,
          reviewed_by: gate.admin.userId,
          processed_at: new Date().toISOString(),
        })
        .eq('id', review.existingPayoutRequestId)
        .eq('status', 'pending')
    }

    await createNotification({
      userId: review.organiser.id,
      type: 'payment_failed',
      title: 'Your payout is on hold',
      message:
        `We have not released your ${formatMoneyExact(review.balances.payoutNowRands)} from ` +
        `${review.eventTitle} yet. Here is why:\n\n${message}\n\n` +
        'Your money is safe and stays in your Ziyawa balance.',
      link: '/earnings',
      eventId,
      sendEmail: true,
    }).catch((error) => console.error('Decline notification failed', { eventId, error }))

    await audit('payout_declined', { reason: message, codes, amountRands: review.balances.payoutNowRands })

    return NextResponse.json({
      success: true,
      decision: 'declined',
      message: 'Payout declined. The organiser has been told why, and their funds stay put.',
    })
  }

  // ── Approve ──────────────────────────────────────────────────────────────
  if (!review.canPayOut) {
    return NextResponse.json(
      {
        error: 'This payout is blocked',
        blockers: review.flags.filter((f) => f.level === 'blocker').map((f) => f.title),
      },
      { status: 400 }
    )
  }

  const released = await releaseEligibleHeldFunds({ eventId, bypassHold: true })
  const enqueueOutcome = await enqueuePayoutRequest(review.organiser.id)

  const { data: queued } = await db
    .from('payout_requests')
    .select('id, amount')
    .eq('user_id', review.organiser.id)
    .in('status', ['pending'])
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!queued) {
    return NextResponse.json(
      {
        error: 'Funds were released but no payout could be queued',
        reason: enqueueOutcome,
        released: released.released,
      },
      { status: 409 }
    )
  }

  await audit('payout_approved_from_event', {
    released: released.released,
    payoutRequestId: queued.id,
    amountRands: Number(queued.amount),
  })

  // The caller now sends the transfer through the payouts route, which is the
  // only code that touches Paystack.
  return NextResponse.json({
    success: true,
    decision: 'approved',
    payoutRequestId: queued.id,
    amountRands: Number(queued.amount),
    released: released.released,
  })
}
