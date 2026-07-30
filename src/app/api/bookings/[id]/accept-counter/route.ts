import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, state, organizer_id, artist_id, offered_amount, final_amount, event_id')
      .eq('id', id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (booking.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (booking.state !== 'pending') {
      return NextResponse.json({ error: `Booking is no longer pending (${booking.state})` }, { status: 400 })
    }

    const counterAmount = Number(booking.final_amount)
    if (!Number.isFinite(counterAmount) || counterAmount <= 0 || counterAmount === Number(booking.offered_amount)) {
      return NextResponse.json({ error: 'No valid counter-offer found to accept' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        state: 'accepted',
        accepted_at: now,
      })
      .eq('id', booking.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to accept counter-offer' }, { status: 500 })
    }

    const [{ data: artist }, { data: event }] = await Promise.all([
      supabase
        .from('artists')
        .select('profile_id, stage_name')
        .eq('id', booking.artist_id)
        .single(),
      supabase
        .from('events')
        .select('title')
        .eq('id', booking.event_id)
        .single(),
    ])

    if (artist?.profile_id) {
      await createNotification({
        userId: artist.profile_id,
        type: 'booking_accepted',
        title: 'Counter-offer accepted',
        message: `Your counter-offer for "${event?.title || 'the event'}" was accepted. Awaiting payment from the organizer.`,
        link: '/dashboard/artist',
        bookingId: booking.id,
        eventId: booking.event_id,
        metadata: { finalAmount: counterAmount },
        sendEmail: false,
      })
    }

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      state: 'accepted',
      finalAmount: counterAmount,
    })
  } catch (error) {
    console.error('Accept counter-offer error:', error)
    return NextResponse.json({ error: 'Failed to accept counter-offer' }, { status: 500 })
  }
}
