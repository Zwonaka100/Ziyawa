import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'
import { sendBookingRequestEmail } from '@/lib/email'
import { formatDate } from '@/lib/helpers'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const eventId = String(body.eventId || '')
    const artistId = String(body.artistId || '')
    const notes = String(body.notes || '').trim()
    const offeredAmount = Number(body.offeredAmount)

    if (!eventId || !artistId || !Number.isFinite(offeredAmount) || offeredAmount <= 0) {
      return NextResponse.json({ error: 'eventId, artistId and a valid offeredAmount are required' }, { status: 400 })
    }

    const { data: organizerProfile } = await supabase
      .from('profiles')
      .select('id, full_name, is_organizer')
      .eq('id', user.id)
      .single()

    if (!organizerProfile?.is_organizer) {
      return NextResponse.json({ error: 'Only event organizers can book artists' }, { status: 403 })
    }

    const today = new Date().toISOString().split('T')[0]

    const { data: event } = await supabase
      .from('events')
      .select('id, title, venue, event_date, organizer_id, is_published')
      .eq('id', eventId)
      .eq('organizer_id', user.id)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!event.is_published || event.event_date < today) {
      return NextResponse.json({ error: 'Bookings are only allowed for upcoming published events' }, { status: 400 })
    }

    const { data: artist } = await supabase
      .from('artists')
      .select(`
        id,
        stage_name,
        profile_id,
        is_available,
        base_price,
        profiles:profile_id (
          id,
          full_name,
          email
        )
      `)
      .eq('id', artistId)
      .single()

    if (!artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }

    if (!artist.is_available) {
      return NextResponse.json({ error: 'This artist is currently unavailable for bookings' }, { status: 400 })
    }

    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id, state')
      .eq('event_id', eventId)
      .eq('artist_id', artistId)
      .maybeSingle()

    if (existingBooking) {
      return NextResponse.json({
        error: `This artist already has a booking request for this event (${existingBooking.state}).`,
      }, { status: 409 })
    }

    const { data: newBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        event_id: eventId,
        artist_id: artistId,
        organizer_id: user.id,
        offered_amount: offeredAmount,
        organizer_notes: notes || null,
        state: 'pending',
      })
      .select('id')
      .single()

    if (bookingError || !newBooking) {
      console.error('Booking creation error:', bookingError)
      return NextResponse.json({ error: 'Failed to create booking request' }, { status: 500 })
    }

    const artistProfile = Array.isArray(artist.profiles) ? artist.profiles[0] : artist.profiles
    const artistProfileId = artistProfile?.id

    let conversationId: string | null = null
    if (artistProfileId) {
      const { data: existingConvo } = await supabase
        .from('conversations')
        .select('id, is_closed')
        .or(
          `and(participant_one.eq.${user.id},participant_two.eq.${artistProfileId}),` +
          `and(participant_one.eq.${artistProfileId},participant_two.eq.${user.id})`
        )
        .maybeSingle()

      if (existingConvo) {
        conversationId = existingConvo.id
        if (existingConvo.is_closed) {
          await supabase
            .from('conversations')
            .update({
              is_closed: false,
              closed_at: null,
              closed_reason: null,
              context_type: 'booking',
              context_id: newBooking.id,
            })
            .eq('id', existingConvo.id)
        }
      } else {
        const now = new Date().toISOString()
        const { data: newConvo, error: convoError } = await supabase
          .from('conversations')
          .insert({
            participant_one: user.id,
            participant_two: artistProfileId,
            context_type: 'booking',
            context_id: newBooking.id,
            initiated_by_booking: true,
            last_message_at: now,
            participant_one_last_read: now,
            participant_two_last_read: now,
            participant_one_unread: 0,
            participant_two_unread: 0,
          })
          .select('id')
          .single()

        if (convoError || !newConvo) {
          console.error('Conversation creation error:', convoError)
        } else {
          conversationId = newConvo.id
        }
      }

      try {
        await createNotification({
          userId: artistProfileId,
          type: 'booking_request',
          title: 'New Booking Request',
          message: `${organizerProfile.full_name || 'An organizer'} requested to book you for "${event.title}".`,
          link: '/dashboard/artist',
          bookingId: newBooking.id,
          eventId: event.id,
          sendEmail: false,
        })
      } catch (notificationError) {
        console.warn('Artist booking request notification skipped:', notificationError)
      }

      try {
        if (artistProfile?.email) {
          await sendBookingRequestEmail(artistProfile.email, {
            recipientName: artistProfile.full_name || artist.stage_name || 'Artist',
            clientName: organizerProfile.full_name || 'Organizer',
            eventName: event.title,
            eventDate: formatDate(event.event_date),
            eventLocation: event.venue || 'Venue to be confirmed',
            amount: offeredAmount.toFixed(2),
            message: notes || undefined,
            bookingId: newBooking.id,
          })
        }
      } catch (emailError) {
        console.warn('Artist booking request email skipped:', emailError)
      }
    }

    return NextResponse.json({
      success: true,
      bookingId: newBooking.id,
      conversationId,
      message: 'Booking request sent! The artist can now review and respond.',
    })
  } catch (error) {
    console.error('Artist booking request error:', error)
    return NextResponse.json({ error: 'Failed to send booking request' }, { status: 500 })
  }
}
