/**
 * Release a completed event's held funds now, without waiting out the
 * settlement window, and queue the payout.
 *
 * The 48-hour window exists to catch problems with money nobody has examined.
 * An admin who has opened the event, seen the organiser is verified and decided
 * to pay is a stronger check than a timer — so this exists to skip it. The
 * timer stays as the default for everything an admin never touches.
 *
 * It only shortens the wait. Everything that makes a payout valid still
 * applies: the event must be completed, and enqueuePayoutRequest still refuses
 * an unverified organiser or one with no Paystack recipient.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi, createAdminServiceClient } from '@/lib/admin-auth'
import { enqueuePayoutRequest, releaseEligibleHeldFunds } from '@/lib/payments/escrow'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  const { id: eventId } = await params
  const db = createAdminServiceClient()

  const { data: event } = await db
    .from('events')
    .select('id, title, state, organizer_id')
    .eq('id', eventId)
    .maybeSingle()

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  if (event.state !== 'completed') {
    return NextResponse.json(
      { error: 'Only a completed event can have its funds released' },
      { status: 400 }
    )
  }

  const result = await releaseEligibleHeldFunds({ eventId, bypassHold: true })

  // releaseEligibleHeldFunds enqueues on its own for anything it releases, but
  // call it again for the case where the funds were already released earlier
  // and only the queueing failed — the reason is what the admin needs back.
  const enqueueOutcome = event.organizer_id
    ? await enqueuePayoutRequest(event.organizer_id)
    : 'no_balance'

  await db.from('admin_audit_logs').insert({
    admin_id: gate.admin.userId,
    action: 'release_event_funds_early',
    target_type: 'event',
    target_id: eventId,
    details: {
      eventTitle: event.title,
      released: result.released,
      skipped: result.skipped,
      enqueueOutcome,
    },
  }).then(undefined, (error) => {
    console.error('Could not audit early release', { eventId, error })
  })

  const explain: Record<string, string> = {
    queued: 'Released and queued for approval.',
    already_queued: 'Released. A payout for this organiser was already queued.',
    not_verified: 'Released, but not queued: the organiser is not verified yet.',
    no_payout_account: 'Released, but not queued: the organiser has no bank account on file.',
    no_balance: 'Nothing was available to release.',
    error: 'Released, but queueing the payout failed. Check the logs.',
  }

  return NextResponse.json({
    success: true,
    released: result.released,
    skipped: result.skipped,
    blockedByObligations: result.blockedByObligations,
    enqueueOutcome,
    message: explain[enqueueOutcome] ?? 'Done.',
  })
}
