import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendAttendeeContactOrganizerEmail } from '@/lib/email'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim()
    const phone = String(body.phone || '').trim()
    const message = String(body.message || '').trim()

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email, and message are required' }, { status: 400 })
    }

    const { data: ownedTicket } = await supabase
      .from('tickets')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .limit(1)
      .maybeSingle()

    if (!ownedTicket) {
      return NextResponse.json({ error: 'You can only contact organisers for events you have a ticket for' }, { status: 403 })
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, organizer_id')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const { data: organizer, error: organizerError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', event.organizer_id)
      .single()

    if (organizerError || !organizer?.email) {
      return NextResponse.json({ error: 'Organiser contact is not available right now' }, { status: 404 })
    }

    const emailResult = await sendAttendeeContactOrganizerEmail(
      organizer.email,
      {
        organizerName: organizer.full_name || 'Organizer',
        eventName: event.title,
        attendeeName: name,
        attendeeEmail: email,
        attendeePhone: phone || undefined,
        message,
      },
      email,
    )

    if (!emailResult.success) {
      return NextResponse.json({ error: emailResult.error || 'Failed to send message' }, { status: 500 })
    }

    await supabase.from('notifications').insert({
      user_id: organizer.id,
      type: 'message',
      title: 'New attendee enquiry',
      message: `${name} sent you a message about ${event.title}`,
      link: `/dashboard/organizer/events/${event.id}/manage`,
      read: false,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact organizer error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
