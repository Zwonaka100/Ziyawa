/**
 * TICKET ORDER FULFILMENT
 *
 * Turns an authorized ticket order into real tickets: creates the ticket
 * rows, bumps event and tier counts, moves the transaction on, and sends the
 * buyer and any other ticket holders their notifications and emails.
 *
 * Shared by the Paystack webhook (paid orders) and the ticket API (free
 * orders), so both issue tickets the same way.
 */

import { createClient } from '@supabase/supabase-js';
import { generateTicketCode } from '@/lib/paystack';
import { adjustProfileBalanceBuckets } from '@/lib/payments/escrow';
import { createNotification } from '@/lib/notifications';
import { sendTicketAssignedEmail, sendTicketPurchasedEmail } from '@/lib/email';

// Service role: fulfilment runs outside the buyer's session (webhook) or
// updates rows the buyer's session cannot (transactions, event counts).
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export function formatZarFromCents(amount: number) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format((amount || 0) / 100);
}

export function formatEventDate(date?: string | null) {
  if (!date) return 'TBA';

  try {
    return new Date(date).toLocaleDateString('en-ZA', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return date;
  }
}

/**
 * Issue the tickets for an order whose transaction is already `authorized`.
 *
 * Paid orders reach this from the Paystack webhook once the charge is
 * verified. Free (R0) orders reach it straight from the ticket API, because
 * there is no charge to wait for. Both get the same tickets, counts,
 * notifications and emails.
 *
 * Returns true when the tickets were issued. On failure the transaction is
 * marked failed and false is returned.
 */
export async function fulfilTicketOrder(
  transaction: Record<string, unknown>,
  metadata: Record<string, unknown>
): Promise<boolean> {
  const eventId = metadata.event_id as string;
  const userId = metadata.user_id as string;
  const quantity = Number(metadata.quantity || 1);
  const ticketTypeId = (metadata.ticket_type_id as string) || null;
  const ticketTypeName = (metadata.ticket_type_name as string) || 'General Admission';
  const existingGatewayResponse = ((transaction.gateway_response as Record<string, unknown> | null) || {});
  const buyerName = String(metadata.buyer_name || existingGatewayResponse.buyer_name || metadata.user_name || 'Ticket Buyer');
  const buyerEmail = String(metadata.buyer_email || existingGatewayResponse.buyer_email || '').trim().toLowerCase();
  const isFreeOrder = Number(transaction.amount || 0) === 0;
  const rawAttendees = Array.isArray(metadata.attendees)
    ? metadata.attendees
    : Array.isArray(existingGatewayResponse.attendees)
      ? existingGatewayResponse.attendees
      : [];

  // Start a pseudo-transaction (Supabase doesn't support true transactions in client)
  try {
    const { data: event } = await supabase
      .from('events')
      .select('id, title, event_date, venue, tickets_sold, total_revenue')
      .eq('id', eventId)
      .single();

    // 1. Create tickets
    const tickets = Array.from({ length: quantity }, (_, index) => {
      const attendee = ((rawAttendees[index] as Record<string, unknown> | undefined) || {});
      const attendeeName = String(attendee.fullName || buyerName || `Ticket Holder ${index + 1}`).trim();
      const attendeeEmail = String(attendee.email || buyerEmail || '').trim().toLowerCase();
      const attendeePhone = String(attendee.phone || '').trim();
      const needsClaim = Boolean(attendeeEmail) && Boolean(buyerEmail) && attendeeEmail !== buyerEmail;

      return {
        event_id: eventId,
        user_id: userId,
        transaction_id: transaction.id,
        ticket_code: generateTicketCode(),
        ticket_type: ticketTypeName,
        price_paid: (transaction.amount as number) / quantity / 100,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        attendee_name: attendeeName,
        attendee_email: attendeeEmail || buyerEmail,
        attendee_phone: attendeePhone || null,
        claim_token: needsClaim ? crypto.randomUUID() : null,
        delivery_status: needsClaim ? 'sent' : 'owner',
      };
    });

    let insertedTickets: Array<Record<string, unknown>> = [];

    const { data: insertedWithRecipientFields, error: ticketError } = await supabase
      .from('tickets')
      .insert(tickets)
      .select('id, ticket_code, attendee_name, attendee_email, claim_token');

    if (ticketError) {
      const legacyInsertPayload = tickets.map((ticket) => ({
        event_id: ticket.event_id,
        user_id: ticket.user_id,
        transaction_id: ticket.transaction_id,
        ticket_code: ticket.ticket_code,
        ticket_type: ticket.ticket_type,
        price_paid: ticket.price_paid,
      }));

      const { data: legacyTickets, error: legacyTicketError } = await supabase
        .from('tickets')
        .insert(legacyInsertPayload)
        .select('id, ticket_code');

      if (legacyTicketError) {
        console.error('Ticket creation failed:', legacyTicketError);
        throw legacyTicketError;
      }

      insertedTickets = (legacyTickets || []).map((ticket, index) => ({
        ...ticket,
        attendee_name: tickets[index].attendee_name,
        attendee_email: tickets[index].attendee_email,
        claim_token: tickets[index].claim_token,
      }));
    } else {
      insertedTickets = insertedWithRecipientFields || [];
    }

    // 2. Update event tickets_sold count
    await supabase
      .from('events')
      .update({
        tickets_sold: (event?.tickets_sold || 0) + quantity,
        total_revenue: (event?.total_revenue || 0) + (transaction.net_amount as number) / 100,
      })
      .eq('id', eventId);

    if (ticketTypeId) {
      const { data: tierRow } = await supabase
        .from('event_ticket_types')
        .select('sold_count')
        .eq('id', ticketTypeId)
        .single();

      await supabase
        .from('event_ticket_types')
        .update({
          sold_count: Number(tierRow?.sold_count || 0) + quantity,
        })
        .eq('id', ticketTypeId);
    }

    // 3. Move transaction to "held" state (escrow until event completes)
    await supabase
      .from('transactions')
      .update({
        state: 'held',
        held_at: new Date().toISOString(),
      })
      .eq('id', transaction.id);

    if (isFreeOrder) {
      // Nothing was paid, so there is nothing to hold for the organiser or
      // release later. Walk the order to its final state now, so it never
      // shows up in escrow sweeps as a R0.00 "earnings ready" payout.
      await supabase
        .from('transactions')
        .update({ state: 'released', released_at: new Date().toISOString() })
        .eq('id', transaction.id);
      await supabase
        .from('transactions')
        .update({ state: 'settled', settled_at: new Date().toISOString() })
        .eq('id', transaction.id);
    } else if (transaction.recipient_id) {
      await adjustProfileBalanceBuckets(
        transaction.recipient_id as string,
        {
          heldDelta: ((transaction.net_amount as number) || 0) / 100,
        },
        {
          reasonCode: 'ticket_revenue_held',
          referenceType: 'transaction',
          referenceId: String(transaction.id),
          metadata: {
            eventId,
            reference: String(transaction.reference || ''),
          },
        }
      );
    }

    if (userId) {
      await createNotification({
        userId,
        type: 'ticket_purchased',
        title: 'Tickets confirmed 🎟️',
        message: `${quantity} ${ticketTypeName} ticket${quantity > 1 ? 's are' : ' is'} ready for ${event?.title || 'your event'}.`,
        link: '/dashboard/tickets',
        eventId,
        sendEmail: false,
      });
    }

    if (buyerEmail && event?.title) {
      await sendTicketPurchasedEmail(buyerEmail, {
        recipientName: buyerName,
        eventName: event.title,
        eventDate: formatEventDate(event.event_date),
        eventLocation: event.venue || 'Venue to be confirmed',
        ticketType: ticketTypeName,
        quantity,
        totalAmount: isFreeOrder ? 'Free' : formatZarFromCents(Number(transaction.amount || 0)),
      });
    }

    for (const ticket of insertedTickets) {
      const recipientEmail = String(ticket.attendee_email || '').trim().toLowerCase();
      const ticketOwnerCode = String(ticket.ticket_code || '');
      const recipientName = String(ticket.attendee_name || 'there');
      const claimToken = ticket.claim_token ? String(ticket.claim_token) : null;

      if (!recipientEmail || (buyerEmail && recipientEmail === buyerEmail && !claimToken)) {
        continue;
      }

      await sendTicketAssignedEmail(recipientEmail, {
        recipientName,
        eventName: event?.title || 'your event',
        eventDate: formatEventDate(event?.event_date as string | null),
        eventLocation: event?.venue || 'Venue to be confirmed',
        ticketType: ticketTypeName,
        ticketCode: ticketOwnerCode,
        senderName: buyerName,
        claimToken,
      });
    }

    console.log(`✅ Ticket purchase completed: ${quantity} tickets for event ${eventId}`);
    return true;

  } catch (error) {
    console.error('Ticket purchase processing failed:', error);
    
    // Mark transaction as failed
    await supabase
      .from('transactions')
      .update({
        state: 'failed',
        failed_at: new Date().toISOString(),
        failure_reason: String(error),
      })
      .eq('id', transaction.id);

    return false;
  }
}
