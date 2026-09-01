import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createBulkNotifications, createNotification } from '@/lib/notifications'
import { sendEventCancelledEmail } from '@/lib/email'
import { getEventEmailAudience } from '@/lib/event-email-audience'
import { SITE_URL } from '@/lib/constants'

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

    const body = await request.json().catch(() => ({})) as { reason?: string }
    const providedReason = String(body.reason || '').trim()

    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, title, organizer_id, state, tickets_sold')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (event.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const soldTickets = Number(event.tickets_sold || 0)
    if (soldTickets > 0 && !providedReason) {
      return NextResponse.json({ error: 'Cancellation reason is required after ticket sales begin' }, { status: 400 })
    }

    const reason = providedReason || 'Cancelled by organizer'

    if (event.state === 'cancelled') {
      return NextResponse.json({ success: true, alreadyCancelled: true })
    }

    if (event.state === 'completed') {
      return NextResponse.json({ error: 'Completed events cannot be cancelled' }, { status: 400 })
    }

    const now = new Date().toISOString()

    const { error: updateError } = await supabaseAdmin
      .from('events')
      .update({
        state: 'cancelled',
        cancelled_at: now,
        cancellation_reason: reason,
      })
      .eq('id', eventId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to cancel event' }, { status: 500 })
    }

    const { data: ticketTransactions, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('id, payer_id, amount, gateway_response')
      .eq('event_id', eventId)
      .eq('type', 'ticket_purchase')
      .in('state', ['authorized', 'held', 'released', 'settled'])

    if (txError) {
      return NextResponse.json({ error: 'Event cancelled, but failed to create refund work queue' }, { status: 500 })
    }

    /**
     * Refund the ticket price, never the booking fee.
     *
     * `txn.amount` is what the buyer was charged — ticket price PLUS booking
     * fee. The booking fee is non-refundable: it is what already paid Paystack
     * to process the charge, and Paystack does not give that back when we
     * reverse it. Refunding it would put Ziyawa out of pocket on every single
     * cancelled ticket.
     */
    const refundableCents = (txn: { amount: number | null; gateway_response: unknown }) => {
      const response = (txn.gateway_response || {}) as {
        ticket_price_cents?: number
        quantity?: number
        booking_fee_cents?: number
      }

      const ticketPrice = Number(response.ticket_price_cents || 0)
      const quantity = Math.max(1, Number(response.quantity || 1))

      if (ticketPrice > 0) return ticketPrice * quantity

      // Older charges predate the stored breakdown. Back it out of the total
      // instead of falling back to the full amount, which would refund the fee.
      const bookingFee = Number(response.booking_fee_cents || 0)
      return Math.max(0, Number(txn.amount || 0) - bookingFee * quantity)
    }

    const refundRows = (ticketTransactions || [])
      .map((txn) => ({ txn, amount_cents: refundableCents(txn) }))
      .filter(({ txn, amount_cents }) => txn.payer_id && amount_cents > 0)
      .map(({ txn, amount_cents }) => ({
        event_id: eventId,
        source_transaction_id: txn.id,
        user_id: txn.payer_id,
        amount_cents,
        reason_code: 'event_cancelled',
        status: 'new',
        requested_by: user.id,
        metadata: {
          source: 'organizer_event_cancel',
          reason,
          charged_cents: Number(txn.amount || 0),
          booking_fee_retained_cents: Number(txn.amount || 0) - amount_cents,
        },
      }))

    if (refundRows.length > 0) {
      const { error: queueError } = await supabaseAdmin
        .from('refund_work_items')
        .upsert(refundRows, { onConflict: 'source_transaction_id', ignoreDuplicates: true })

      // Previously discarded. A silent failure here means the event is
      // cancelled and nobody is ever refunded, which is the worst outcome
      // available, so it has to be loud.
      if (queueError) {
        console.error('Failed to queue refunds for cancelled event:', { eventId, error: queueError })
        return NextResponse.json(
          {
            error: 'The event was cancelled, but the refunds could not be queued. ' +
              'Contact an admin before notifying ticket holders.',
          },
          { status: 500 }
        )
      }
    }

    const { data: admins } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .or('is_admin.eq.true,admin_role.eq.admin,admin_role.eq.super_admin')

    for (const admin of admins || []) {
      await createNotification({
        userId: admin.id,
        type: 'event_cancelled',
        title: 'Event cancelled - refunds queued for review',
        message: `${event.title} was cancelled by organizer. ${refundRows.length} refund work item(s) were created for admin review.`,
        link: '/admin/finance/refunds',
        eventId,
        metadata: {
          refundWorkItems: refundRows.length,
        },
        sendEmail: false,
      })
    }

    const audience = await getEventEmailAudience(eventId)
    const eventDate = new Date(now).toLocaleDateString('en-ZA', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const directEmails = [
      ...audience.attendees.map((recipient) => sendEventCancelledEmail(recipient.email, {
        recipientName: recipient.name.split(' ')[0] || recipient.name,
        eventName: event.title,
        eventDate,
        reason,
        roleLabel: 'attendee' as const,
        actionLabel: 'Open My Tickets',
        actionUrl: `${SITE_URL}/dashboard/tickets`,
      })),
      ...audience.artists.map((recipient) => sendEventCancelledEmail(recipient.email, {
        recipientName: recipient.name.split(' ')[0] || recipient.name,
        eventName: event.title,
        eventDate,
        reason,
        roleLabel: 'artist' as const,
        actionLabel: 'Open Artist Dashboard',
        actionUrl: `${SITE_URL}/dashboard/artist`,
      })),
      ...audience.providers.map((recipient) => sendEventCancelledEmail(recipient.email, {
        recipientName: recipient.name.split(' ')[0] || recipient.name,
        eventName: event.title,
        eventDate,
        reason,
        roleLabel: 'provider' as const,
        actionLabel: 'Open Crew Dashboard',
        actionUrl: `${SITE_URL}/dashboard/provider`,
      })),
      ...audience.crew.map((recipient) => sendEventCancelledEmail(recipient.email, {
        recipientName: recipient.name.split(' ')[0] || recipient.name,
        eventName: event.title,
        eventDate,
        reason,
        roleLabel: 'crew' as const,
        actionLabel: 'Open Crew Dashboard',
        actionUrl: `${SITE_URL}/dashboard/event-work`,
      })),
    ]

    await Promise.all(directEmails)

    const recipientNotifications = [
      ...audience.attendees,
      ...audience.artists,
      ...audience.providers,
      ...audience.crew,
    ]
      .filter((recipient) => recipient.userId)
      .map((recipient) => ({
        userId: recipient.userId!,
        type: 'event_cancelled' as const,
        title: `Event cancelled: ${event.title}`,
        message: `${event.title} has been cancelled. ${recipient.role === 'attendee' ? 'Refund processing will follow where applicable.' : 'Please review your dashboard for next steps.'}`,
        link: recipient.role === 'attendee' ? '/dashboard/tickets' : recipient.role === 'artist' ? '/dashboard/artist' : recipient.role === 'provider' ? '/dashboard/provider' : '/dashboard/event-work',
        eventId,
        sendEmail: false,
      }))

    if (recipientNotifications.length > 0) {
      await createBulkNotifications(recipientNotifications)
    }

    return NextResponse.json({
      success: true,
      eventId,
      refundWorkItemsCreated: refundRows.length,
    })
  } catch (error) {
    console.error('Event cancellation error:', error)
    return NextResponse.json({ error: 'Failed to cancel event' }, { status: 500 })
  }
}
