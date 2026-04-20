import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { sendTicketAssignedEmail } from '@/lib/email'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function formatEventDate(date?: string | null) {
  if (!date) return 'TBA'

  try {
    return new Date(date).toLocaleDateString('en-ZA', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return date
  }
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: ticket, error } = await supabaseAdmin
      .from('tickets')
      .select(`
        id,
        user_id,
        original_owner_id,
        ticket_code,
        ticket_type,
        attendee_name,
        attendee_email,
        buyer_name,
        buyer_email,
        claim_token,
        claimed_at,
        events (
          id,
          title,
          event_date,
          venue,
          organizer_id
        )
      `)
      .eq('id', id)
      .single()

    if (error || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const event = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events
    const isAuthorized = ticket.user_id === user.id || ticket.original_owner_id === user.id || event?.organizer_id === user.id

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Not allowed to resend this ticket' }, { status: 403 })
    }

    const recipientEmail = String(ticket.attendee_email || ticket.buyer_email || '').trim().toLowerCase()
    if (!recipientEmail) {
      return NextResponse.json({ error: 'No email address is attached to this ticket yet' }, { status: 400 })
    }

    const shouldClaim = Boolean(ticket.attendee_email) && String(ticket.attendee_email).trim().toLowerCase() !== String(ticket.buyer_email || '').trim().toLowerCase()
    const claimToken = shouldClaim && !ticket.claimed_at
      ? (ticket.claim_token || crypto.randomUUID())
      : null

    if (claimToken && claimToken !== ticket.claim_token) {
      await supabaseAdmin
        .from('tickets')
        .update({
          claim_token: claimToken,
          delivery_status: 'resent',
        })
        .eq('id', id)
    }

    const emailResult = await sendTicketAssignedEmail(recipientEmail, {
      recipientName: String(ticket.attendee_name || 'there'),
      eventName: event?.title || 'your event',
      eventDate: formatEventDate(event?.event_date),
      eventLocation: event?.venue || 'Venue to be confirmed',
      ticketType: String(ticket.ticket_type || 'General Admission'),
      ticketCode: String(ticket.ticket_code || ''),
      senderName: String(ticket.buyer_name || 'Your friend'),
      claimToken: shouldClaim && !ticket.claimed_at ? String(claimToken) : null,
    })

    if (!emailResult.success) {
      return NextResponse.json({ error: emailResult.error || 'Failed to resend ticket email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `Ticket email sent to ${recipientEmail}` })
  } catch (error) {
    console.error('Ticket resend error:', error)
    return NextResponse.json({ error: 'Unable to resend ticket email' }, { status: 500 })
  }
}