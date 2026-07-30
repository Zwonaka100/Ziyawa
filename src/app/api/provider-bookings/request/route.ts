import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'
import { sendProviderBookingRequestEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const eventId = String(body.eventId || '')
    const providerId = String(body.providerId || '')
    const serviceId = String(body.serviceId || '')
    const quantity = Number(body.quantity || 1)
    const offeredAmount = Number(body.offeredAmount)
    const notes = String(body.notes || '').trim()

    if (!eventId || !providerId || !serviceId || !Number.isFinite(offeredAmount) || offeredAmount <= 0) {
      return NextResponse.json({ error: 'eventId, providerId, serviceId and a valid offeredAmount are required' }, { status: 400 })
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 })
    }

    const { data: organizerProfile } = await supabase
      .from('profiles')
      .select('id, full_name, is_organizer')
      .eq('id', user.id)
      .single()

    if (!organizerProfile?.is_organizer) {
      return NextResponse.json({ error: 'Only event organizers can book services' }, { status: 403 })
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

    const { data: provider } = await supabase
      .from('providers')
      .select('id, business_name, profile_id, is_available')
      .eq('id', providerId)
      .single()

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    if (!provider.is_available) {
      return NextResponse.json({ error: 'This provider is currently unavailable' }, { status: 400 })
    }

    const { data: service } = await supabase
      .from('provider_services')
      .select('id, provider_id, service_name, is_available')
      .eq('id', serviceId)
      .eq('provider_id', providerId)
      .single()

    if (!service || !service.is_available) {
      return NextResponse.json({ error: 'Service not found or unavailable' }, { status: 404 })
    }

    const { data: existingBooking } = await supabase
      .from('provider_bookings')
      .select('id, state')
      .eq('event_id', eventId)
      .eq('provider_id', providerId)
      .eq('service_id', serviceId)
      .maybeSingle()

    if (existingBooking) {
      return NextResponse.json({
        error: `This service already has a booking request for this event (${existingBooking.state}).`,
      }, { status: 409 })
    }

    const { data: newBooking, error: insertError } = await supabase
      .from('provider_bookings')
      .insert({
        event_id: eventId,
        provider_id: providerId,
        service_id: serviceId,
        organizer_id: user.id,
        offered_amount: offeredAmount,
        service_date: event.event_date,
        quantity,
        special_requirements: notes || null,
        organizer_notes: notes || null,
        state: 'pending',
      })
      .select('id')
      .single()

    if (insertError || !newBooking) {
      console.error('Provider booking insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create provider booking request' }, { status: 500 })
    }

    let conversationId: string | null = null
    if (provider.profile_id) {
      const { data: existingConvo } = await supabase
        .from('conversations')
        .select('id, is_closed')
        .or(
          `and(participant_one.eq.${user.id},participant_two.eq.${provider.profile_id}),` +
          `and(participant_one.eq.${provider.profile_id},participant_two.eq.${user.id})`
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
              context_type: 'provider_booking',
              context_id: newBooking.id,
            })
            .eq('id', existingConvo.id)
        }
      } else {
        const now = new Date().toISOString()
        const { data: createdConvo } = await supabase
          .from('conversations')
          .insert({
            participant_one: user.id,
            participant_two: provider.profile_id,
            context_type: 'provider_booking',
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

        conversationId = createdConvo?.id || null
      }

      try {
        await createNotification({
          userId: provider.profile_id,
          type: 'booking_request',
          title: 'New Service Booking Request',
          message: `${organizerProfile.full_name || 'An organizer'} requested "${service.service_name}" for "${event.title}".`,
          link: '/dashboard/provider',
          eventId: event.id,
          bookingId: newBooking.id,
          sendEmail: false,
        })
      } catch (notificationError) {
        console.warn('Provider booking request notification skipped:', notificationError)
      }

      const { data: providerProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', provider.profile_id)
        .maybeSingle()

      try {
        if (providerProfile?.email) {
          await sendProviderBookingRequestEmail(providerProfile.email, {
            recipientName: providerProfile.full_name || provider.business_name || 'there',
            organizerName: organizerProfile.full_name || 'Organizer',
            eventName: event.title,
            eventDate: new Date(event.event_date).toLocaleDateString('en-ZA', {
              weekday: 'short',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }),
            eventLocation: event.venue || 'Venue to be confirmed',
            serviceName: service.service_name,
            amount: `R${offeredAmount.toFixed(2)}`,
            quantity,
            notes: notes || undefined,
            actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.ziyawa.com'}/dashboard/provider`,
          })
        }
      } catch (emailError) {
        console.warn('Provider booking request email skipped:', emailError)
      }
    }

    return NextResponse.json({
      success: true,
      bookingId: newBooking.id,
      conversationId,
      message: 'Booking request sent! Provider can now review and respond.',
    })
  } catch (error) {
    console.error('Provider booking request error:', error)
    return NextResponse.json({ error: 'Failed to send booking request' }, { status: 500 })
  }
}
