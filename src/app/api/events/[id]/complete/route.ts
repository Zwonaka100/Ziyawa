import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateHoldUntil, releaseEligibleHeldFunds } from '@/lib/payments/escrow'

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

    const releaseResult = await releaseEligibleHeldFunds({ eventId: id })

    return NextResponse.json({
      success: true,
      eventId: id,
      releaseResult,
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
