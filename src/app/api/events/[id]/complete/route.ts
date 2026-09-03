import { after, NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateHoldUntil, releaseEligibleHeldFunds } from '@/lib/payments/escrow'
import { notifyEventCompleted } from '@/lib/events/completion-notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, admin_role')
      .eq('id', user.id)
      .single()

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, organizer_id, state, event_date, completed_at, organizer_completed_at, admin_completed_at, payout_hold_until, completion_notes')
      .eq('id', id)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const isAdmin = Boolean(profile?.is_admin || profile?.admin_role === 'super_admin')
    const isOwner = event.organizer_id === user.id

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const eventDate = new Date(event.event_date)
    if (!isAdmin && eventDate.getTime() > Date.now()) {
      return NextResponse.json(
        { error: 'You can only complete an event after it has happened' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({})) as { notes?: string }
    const now = new Date().toISOString()
    const updates: Record<string, string> = {
      state: 'completed',
      completed_at: event.completed_at || now,
      payout_hold_until: event.payout_hold_until || calculateHoldUntil(event.completed_at || now, Number(process.env.PAYOUT_HOLD_HOURS || '48')),
      completion_notes: body.notes || event.completion_notes || '',
    }

    if (isAdmin) {
      updates.admin_completed_at = now
    } else {
      updates.organizer_completed_at = now
    }

    const { error: updateError } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      // The reason used to be discarded here, which is how a database trigger
      // rejecting published -> completed went unnoticed: every organiser saw
      // "Failed to update event status" and nothing said why.
      console.error('Event completion failed', {
        eventId: id,
        userId: user.id,
        fromState: event.state,
        toState: 'completed',
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
      })

      return NextResponse.json(
        {
          error: 'Could not complete this event. Our team has been notified.',
          reason: updateError.message,
        },
        { status: 500 }
      )
    }

    // Release runs after the response, not inside it.
    //
    // canReleaseEventTransaction() refuses to release until payout_hold_until
    // has passed, and the line above sets that to completed_at + 48h. So at
    // this moment the sweep can never release anything — it walks the held
    // transactions for this event, skips every one, and charges the organiser
    // several round trips to Ireland for the privilege. The nightly
    // /api/payments/release cron is what actually settles them.
    //
    // Kept rather than deleted because the hold is configurable: with
    // PAYOUT_HOLD_HOURS=0 this call is the thing that releases. after() gives
    // both — it still runs on the same invocation, just once the organiser
    // already has their answer.
    after(async () => {
      try {
        const releaseResult = await releaseEligibleHeldFunds({ eventId: id })
        if (releaseResult.failures.length > 0) {
          console.error('Post-completion release reported failures', {
            eventId: id,
            failures: releaseResult.failures,
          })
        }
      } catch (releaseError) {
        // Never surfaces to the organiser: their event is already completed and
        // committed. The cron will pick these transactions up regardless.
        console.error('Post-completion release failed', {
          eventId: id,
          message: releaseError instanceof Error ? releaseError.message : String(releaseError),
        })
      }

      // Tell the organiser what just happened to their money, and tell admin
      // there is money to settle. Runs after release so the notification
      // reflects the final state. It swallows its own errors — the event is
      // already completed and committed.
      await notifyEventCompleted({
        eventId: id,
        completedByAdmin: isAdmin,
        payoutHoldUntil: updates.payout_hold_until,
      })
    })

    return NextResponse.json({
      success: true,
      eventId: id,
      payoutHoldUntil: updates.payout_hold_until,
    })
  } catch (error) {
    console.error('Event completion error:', error)
    return NextResponse.json(
      {
        error: 'Could not complete this event. Our team has been notified.',
        reason: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
