import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'
import { sendBookingResponseEmail } from '@/lib/email'

type ArtistBookingAction = 'accept' | 'decline' | 'counter'

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

    const body = await request.json().catch(() => ({})) as {
      action?: ArtistBookingAction
      notes?: string
      counterAmount?: number
    }

    const action = body.action
    const notes = String(body.notes || '').trim()
    const counterAmount = Number(body.counterAmount)

    if (!action || !['accept', 'decline', 'counter'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, state, organizer_id, artist_id, offered_amount, final_amount, event_id')
      .eq('id', id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const { data: artist } = await supabase
      .from('artists')
      .select('id, stage_name, profile_id')
      .eq('id', booking.artist_id)
      .single()

    if (!artist || artist.profile_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (booking.state !== 'pending') {
      return NextResponse.json({ error: `Booking is no longer pending (${booking.state})` }, { status: 400 })
    }

    if (action === 'counter' && (!Number.isFinite(counterAmount) || counterAmount <= 0)) {
      return NextResponse.json({ error: 'Please provide a valid counter amount' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}

    if (action === 'accept') {
      updates.state = 'accepted'
      updates.artist_notes = notes || 'Booking accepted!'
    }

    if (action === 'decline') {
      updates.state = 'declined'
      updates.artist_notes = notes || 'Booking declined.'
    }

    if (action === 'counter') {
      updates.state = 'pending'
      updates.final_amount = counterAmount
      updates.artist_notes = notes || `Counter-offer: R${counterAmount.toFixed(2)}`
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', booking.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
    }

    const { data: event } = await supabase
      .from('events')
      .select('title')
      .eq('id', booking.event_id)
      .single()

    const { data: organizerProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', booking.organizer_id)
      .maybeSingle()

    try {
      if (action === 'accept') {
        await createNotification({
          userId: booking.organizer_id,
          type: 'booking_accepted',
          title: 'Booking accepted! 🎉',
          message: `${artist.stage_name} accepted your booking for "${event?.title || 'your event'}". You can now complete payment.`,
          link: `/dashboard/organizer/events/${booking.event_id}/bookings`,
          bookingId: booking.id,
          eventId: booking.event_id,
          sendEmail: false,
        })
      } else if (action === 'decline') {
        await createNotification({
          userId: booking.organizer_id,
          type: 'booking_declined',
          title: 'Booking declined',
          message: `${artist.stage_name} declined your booking request for "${event?.title || 'your event'}".`,
          link: `/dashboard/organizer/events/${booking.event_id}/bookings`,
          bookingId: booking.id,
          eventId: booking.event_id,
          sendEmail: false,
        })
      } else {
        await createNotification({
          userId: booking.organizer_id,
          type: 'message_received',
          title: 'Counter-offer received',
          message: `${artist.stage_name} proposed a new amount for "${event?.title || 'your event'}": R${counterAmount.toFixed(2)}.`,
          link: `/dashboard/organizer/events/${booking.event_id}/bookings`,
          bookingId: booking.id,
          eventId: booking.event_id,
          metadata: { counterAmount },
          sendEmail: false,
        })
      }
    } catch (notificationError) {
      console.warn('Booking response notification skipped:', notificationError)
    }

    try {
      if (organizerProfile?.email) {
        await sendBookingResponseEmail(organizerProfile.email, {
          recipientName: organizerProfile.full_name || 'there',
          responderName: artist.stage_name,
          eventName: event?.title || 'your event',
          responseType: action === 'counter' ? 'countered' : action === 'accept' ? 'accepted' : 'declined',
          amount: action === 'counter' ? `R${counterAmount.toFixed(2)}` : undefined,
          note: notes || undefined,
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.ziyawa.com'}/dashboard/organizer/events/${booking.event_id}/bookings`,
        })
      }
    } catch (emailError) {
      console.warn('Booking response email skipped:', emailError)
    }

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      state: updates.state || booking.state,
    })
  } catch (error) {
    console.error('Artist booking response error:', error)
    return NextResponse.json({ error: 'Failed to process booking response' }, { status: 500 })
  }
}
