import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

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

    const emailResult = await sendEmail({
      to: organizer.email,
      subject: `New attendee message about ${event.title}`,
      replyTo: email,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin-bottom: 12px;">New attendee message</h2>
          <p>You received a message from a ticket holder for <strong>${event.title}</strong>.</p>
          <div style="margin: 16px 0; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br/>')}</p>
          </div>
          <p>You can reply directly to this email to respond to the attendee.</p>
        </div>
      `,
      text: `New attendee message for ${event.title}\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || 'Not provided'}\n\nMessage:\n${message}`,
      tags: [{ name: 'category', value: 'contact-organizer' }],
    })

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
