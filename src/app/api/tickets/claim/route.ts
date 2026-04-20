import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Claim token is required' }, { status: 400 })
    }

    const { data: ticket, error } = await supabaseAdmin
      .from('tickets')
      .select(`
        id,
        attendee_name,
        attendee_email,
        ticket_code,
        ticket_type,
        delivery_status,
        events (
          id,
          title,
          event_date,
          venue
        )
      `)
      .eq('claim_token', token)
      .single()

    if (error || !ticket) {
      return NextResponse.json({ error: 'This claim link is no longer valid' }, { status: 404 })
    }

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        attendeeName: ticket.attendee_name,
        attendeeEmail: ticket.attendee_email,
        ticketCode: ticket.ticket_code,
        ticketType: ticket.ticket_type,
        deliveryStatus: ticket.delivery_status,
        event: Array.isArray(ticket.events) ? ticket.events[0] : ticket.events,
      },
    })
  } catch (error) {
    console.error('Ticket claim preview error:', error)
    return NextResponse.json({ error: 'Unable to load ticket claim' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: 'Please sign in to claim this ticket' }, { status: 401 })
    }

    const body = await request.json()
    const token = String(body.token || '').trim()

    if (!token) {
      return NextResponse.json({ error: 'Claim token is required' }, { status: 400 })
    }

    const { data: ticket, error } = await supabaseAdmin
      .from('tickets')
      .select('id, user_id, original_owner_id, attendee_email, claimed_at')
      .eq('claim_token', token)
      .single()

    if (error || !ticket) {
      return NextResponse.json({ error: 'This claim link is no longer valid' }, { status: 404 })
    }

    if (ticket.attendee_email && user.email.toLowerCase() !== String(ticket.attendee_email).toLowerCase()) {
      return NextResponse.json(
        { error: `Please sign in with ${ticket.attendee_email} to claim this ticket.` },
        { status: 403 }
      )
    }

    if (ticket.claimed_at && ticket.user_id === user.id) {
      return NextResponse.json({ success: true, message: 'Ticket already claimed' })
    }

    const { error: updateError } = await supabaseAdmin
      .from('tickets')
      .update({
        user_id: user.id,
        original_owner_id: ticket.original_owner_id || ticket.user_id,
        claimed_at: new Date().toISOString(),
        claim_token: null,
        delivery_status: 'claimed',
      })
      .eq('id', ticket.id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ success: true, message: 'Ticket claimed successfully' })
  } catch (error) {
    console.error('Ticket claim error:', error)
    return NextResponse.json({ error: 'Unable to claim this ticket' }, { status: 500 })
  }
}