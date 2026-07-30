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

    let bookingResult = await supabase
      .from('bookings')
      .select('id, state, organizer_id, artist_id, offered_amount, final_amount, event_id')
      .eq('id', id)
      .single()

    let booking = bookingResult.data as {
      id: string
      state?: string
      status?: string
      organizer_id: string
      artist_id: string
      offered_amount: number
      final_amount: number | null
      event_id: string
    } | null
    let bookingError = bookingResult.error

    if (bookingError && String(bookingError.message || '').toLowerCase().includes('state')) {
      bookingResult = await supabase
        .from('bookings')
        .select('id, status, organizer_id, artist_id, offered_amount, final_amount, event_id')
        .eq('id', id)
        .single()
      booking = bookingResult.data as typeof booking
      bookingError = bookingResult.error
    }

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (booking.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const bookingState = booking.state || booking.status

    if (bookingState !== 'pending') {
      return NextResponse.json({ error: `Booking is no longer pending (${bookingState})` }, { status: 400 })
    }

    const counterAmount = Number(booking.final_amount)
    if (!Number.isFinite(counterAmount) || counterAmount <= 0 || counterAmount === Number(booking.offered_amount)) {
      return NextResponse.json({ error: 'No valid counter-offer found to accept' }, { status: 400 })
    }

    let updateResult = await supabase
      .from('bookings')
      .update({ state: 'accepted' })
      .eq('id', booking.id)

    if (updateResult.error && String(updateResult.error.message || '').toLowerCase().includes('state')) {
      updateResult = await supabase
        .from('bookings')
        .update({ status: 'accepted' })
        .eq('id', booking.id)
    }

    const updateError = updateResult.error

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
