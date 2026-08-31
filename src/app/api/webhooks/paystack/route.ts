/**
 * PAYSTACK WEBHOOK HANDLER
 * POST /api/webhooks/paystack
 * 
 * Handles all Paystack webhook events:
 * - charge.success: Payment completed
 * - transfer.success: Payout landed
 * - transfer.failed: Payout failed, funds restored
 * - transfer.reversed: Payout came back after the fact, funds restored
 *
 * Each transfer outcome closes out three things: the `transactions` row, the
 * recipient's balance buckets, and the `payout_requests` row that the admin
 * approved. The last of those is easy to forget and the most damaging to miss —
 * see settlePayoutRequest() below.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyWebhookSignature, verifyPayment, generateTicketCode } from '@/lib/paystack';
import { adjustProfileBalanceBuckets } from '@/lib/payments/escrow';
import { createNotification } from '@/lib/notifications';
import { sendBookingPaymentConfirmedEmail, sendPayoutStatusEmail, sendTicketAssignedEmail, sendTicketPurchasedEmail } from '@/lib/email';
import { captureServerError, logOpsEvent } from '@/lib/monitoring';
import { SITE_URL } from '@/lib/constants';

// Use service role for webhooks (no user context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function formatZarFromCents(amount: number) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format((amount || 0) / 100);
}

function formatEventDate(date?: string | null) {
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

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const payload = await request.text();
    const signature = request.headers.get('x-paystack-signature') || '';

    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature)) {
      logOpsEvent('paystack-webhook', 'warn', 'Invalid webhook signature received', {
        hasSignature: Boolean(signature),
      });
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event = JSON.parse(payload);
    logOpsEvent('paystack-webhook', 'info', 'Webhook received', { event: event.event });

    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data);
        break;
      
      case 'transfer.success':
        await handleTransferSuccess(event.data);
        break;
      
      case 'transfer.failed':
        await handleTransferFailed(event.data);
        break;
      
      case 'transfer.reversed':
        await handleTransferReversed(event.data);
        break;

      default:
        logOpsEvent('paystack-webhook', 'info', 'Unhandled webhook event', { event: event.event });
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    captureServerError('paystack-webhook', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful payment (charge.success)
 */
async function handleChargeSuccess(data: {
  reference: string;
  amount: number;
  metadata: Record<string, unknown>;
}) {
  const { reference, metadata } = data;

  // Verify the payment with Paystack
  const verification = await verifyPayment(reference);
  
  if (verification.data.status !== 'success') {
    console.error('Payment verification failed:', verification);
    return;
  }

  // Get our transaction record
  const { data: transaction, error: txnError } = await supabase
    .from('transactions')
    .select('*')
    .eq('reference', reference)
    .single();

  if (txnError || !transaction) {
    console.error('Transaction not found:', reference);
    return;
  }

  // Atomically claim the transaction from initiated -> authorized to avoid duplicate processing.
  const existingGatewayResponse = ((transaction.gateway_response as Record<string, unknown> | null) || {})
  const { data: claimedTransaction, error: claimError } = await supabase
    .from('transactions')
    .update({
      state: 'authorized',
      gateway_response: {
        ...existingGatewayResponse,
        paystack: verification.data,
      },
      authorized_at: new Date().toISOString(),
      failure_reason: null,
    })
    .eq('id', transaction.id)
    .eq('state', 'initiated')
    .select('*')
    .single()

  if (claimError || !claimedTransaction) {
    console.log('Transaction already claimed or processed:', reference)
    return
  }

  const paymentType = metadata.type as string;

  // Handle based on payment type
  switch (paymentType) {
    case 'ticket_purchase':
      await processTicketPurchase(claimedTransaction, verification.data, metadata);
      break;
    
    case 'wallet_deposit':
      await processWalletDeposit(claimedTransaction, verification.data, metadata);
      break;
    
    case 'booking_payment':
      await processBookingPayment(claimedTransaction, verification.data, metadata);
      break;

    default:
      console.log('Unknown payment type:', paymentType);
  }
}

/**
 * Process completed ticket purchase
 */
async function processTicketPurchase(
  transaction: Record<string, unknown>,
  paystackData: Record<string, unknown>,
  metadata: Record<string, unknown>
) {
  const eventId = metadata.event_id as string;
  const userId = metadata.user_id as string;
  const quantity = Number(metadata.quantity || 1);
  const ticketTypeId = (metadata.ticket_type_id as string) || null;
  const ticketTypeName = (metadata.ticket_type_name as string) || 'General Admission';
  const existingGatewayResponse = ((transaction.gateway_response as Record<string, unknown> | null) || {});
  const buyerName = String(metadata.buyer_name || existingGatewayResponse.buyer_name || metadata.user_name || 'Ticket Buyer');
  const buyerEmail = String(metadata.buyer_email || existingGatewayResponse.buyer_email || '').trim().toLowerCase();
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

    if (transaction.recipient_id) {
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
        totalAmount: formatZarFromCents(Number(transaction.amount || 0)),
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
  }
}

/**
 * Process wallet deposit
 */
async function processWalletDeposit(
  transaction: Record<string, unknown>,
  paystackData: Record<string, unknown>,
  metadata: Record<string, unknown>
) {
  const userId = metadata.user_id as string;
  const depositAmount = (metadata.deposit_amount as number) / 100; // Convert cents to Rands

  try {
    // 1. Update transaction state
    const existingGatewayResponse = ((transaction.gateway_response as Record<string, unknown> | null) || {})
    await supabase
      .from('transactions')
      .update({
        state: 'settled', // Deposits settle immediately
        gateway_response: {
          ...existingGatewayResponse,
          paystack: paystackData,
        },
        settled_at: new Date().toISOString(),
      })
      .eq('id', transaction.id);

    // 2. Update user wallet balance
    await adjustProfileBalanceBuckets(
      userId,
      { walletDelta: depositAmount },
      {
        reasonCode: 'wallet_deposit_settled',
        referenceType: 'transaction',
        referenceId: String(transaction.id),
        metadata: {
          depositAmount,
        },
      }
    )

    console.log(`✅ Wallet deposit completed: R${depositAmount} for user ${userId}`);

  } catch (error) {
    console.error('Wallet deposit processing failed:', error);
    
    await supabase
      .from('transactions')
      .update({
        state: 'failed',
        failed_at: new Date().toISOString(),
        failure_reason: String(error),
      })
      .eq('id', transaction.id);
  }
}

/**
 * Process booking payment (artist/vendor)
 */
async function processBookingPayment(
  transaction: Record<string, unknown>,
  paystackData: Record<string, unknown>,
  metadata: Record<string, unknown>
) {
  const bookingId = metadata.booking_id as string;
  const bookingType = metadata.booking_type as string; // 'artist' or 'vendor'

  try {
    // 1. Update transaction state + link provider_booking_id for crew bookings
    const txnUpdate: Record<string, unknown> = {
      state: 'held', // Booking payments are held until event completion
      gateway_response: paystackData,
      authorized_at: new Date().toISOString(),
      held_at: new Date().toISOString(),
    }
    if (bookingType === 'vendor') {
      txnUpdate.provider_booking_id = bookingId
    }

    await supabase
      .from('transactions')
      .update(txnUpdate)
      .eq('id', transaction.id);

    if (transaction.recipient_id) {
      await adjustProfileBalanceBuckets(
        transaction.recipient_id as string,
        {
          heldDelta: ((transaction.net_amount as number) || 0) / 100,
        },
        {
          reasonCode: 'booking_payment_held',
          referenceType: 'transaction',
          referenceId: String(transaction.id),
          metadata: {
            bookingId,
            bookingType,
          },
        }
      );
    }

    // 2. Update booking state to confirmed (= payment received)
    const tableName = bookingType === 'vendor' ? 'provider_bookings' : 'bookings';

    await supabase
      .from(tableName)
      .update({
        state: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    // 3. Send notification to recipient
    if (transaction.recipient_id) {
      const amount = ((transaction.net_amount as number) || 0) / 100
      const formattedAmount = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)
      await createNotification({
        userId: transaction.recipient_id as string,
        type: 'payment_received',
        title: 'Booking payment received',
        message: `${formattedAmount} has been held in escrow for your booking. It will be released once the booking is marked complete by both parties.`,
        link: '/earnings',
        sendEmail: false,
      })

      const { data: recipientProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', transaction.recipient_id as string)
        .maybeSingle()

      if (recipientProfile?.email) {
        const bookingDetails = bookingType === 'vendor'
          ? await supabase
              .from('provider_bookings')
              .select('event_id, events(title, event_date, venue)')
              .eq('id', bookingId)
              .single()
          : await supabase
              .from('bookings')
              .select('event_id, events(title, event_date, venue)')
              .eq('id', bookingId)
              .single()

        const eventRecord = Array.isArray(bookingDetails.data?.events)
          ? bookingDetails.data?.events[0]
          : bookingDetails.data?.events

        await sendBookingPaymentConfirmedEmail(recipientProfile.email, {
          recipientName: recipientProfile.full_name || 'there',
          eventName: eventRecord?.title || 'your booking',
          eventDate: formatEventDate(eventRecord?.event_date as string | null),
          eventLocation: (eventRecord?.venue as string | null) || 'Venue to be confirmed',
          amount: formattedAmount,
          bookingRoleLabel: bookingType === 'vendor' ? 'service' : 'artist',
          actionUrl: `${SITE_URL}/${bookingType === 'vendor' ? 'dashboard/provider' : 'dashboard/artist'}`,
        })
      }
    }

    logOpsEvent('paystack-webhook', 'info', `Booking payment processed: ${bookingType} ${bookingId}`, { bookingId, bookingType });

  } catch (error) {
    console.error('Booking payment processing failed:', error);
    
    await supabase
      .from('transactions')
      .update({
        state: 'failed',
        failed_at: new Date().toISOString(),
        failure_reason: String(error),
      })
      .eq('id', transaction.id);
  }
}

/** The statuses a payout request can still be moved out of. */
const OPEN_PAYOUT_STATUSES = ['pending', 'approved', 'processing'] as const

/**
 * Move a payout request to its terminal state once Paystack confirms what
 * actually happened to the transfer.
 *
 * This is not just bookkeeping. enqueuePayoutRequest() refuses to queue anyone
 * who already has a request in ('pending','approved','processing'), so a
 * request left at 'processing' would block that person from ever being queued
 * again — every later release would land in their available balance and never
 * reach the admin queue. Closing the request is what makes them payable next
 * time.
 *
 * `settleFrom` names which prior statuses this outcome is allowed to overwrite.
 * Normally that is only the open ones, so a replayed or out-of-order webhook
 * cannot reopen a settled payout or overwrite an admin's rejection. A reversal
 * is the exception: it may also overturn a request already marked 'completed',
 * because money coming back is a genuine later event, not a replay. Replays of
 * the reversal itself are still no-ops, since 'failed' is never in the list.
 *
 * Never throws: the money has already moved and `transactions` is the record of
 * that. Failing the webhook over this row would make Paystack retry an event
 * that already succeeded, which is worse than a stale status we can see and fix.
 */
async function settlePayoutRequest(
  reference: string,
  outcome: {
    status: 'completed' | 'failed'
    failureReason?: string
    settleFrom?: readonly string[]
  }
) {
  try {
    const update: Record<string, unknown> = { status: outcome.status }

    if (outcome.status === 'completed') {
      update.completed_at = new Date().toISOString()
    } else {
      update.failure_reason = outcome.failureReason || 'Transfer did not complete'
    }

    const { data: settled, error } = await supabase
      .from('payout_requests')
      .update(update)
      .eq('reference', reference)
      .in('status', outcome.settleFrom ?? OPEN_PAYOUT_STATUSES)
      .select('id, status')

    if (error) {
      logOpsEvent('paystack-webhook', 'error', 'Could not settle payout request', {
        reference,
        status: outcome.status,
        error: error.message,
      });
      return;
    }

    if (!settled?.length) {
      // Either a replay of an event we already settled, or a transfer with no
      // payout request behind it. Worth a line either way — a payout that left
      // the platform without a queue entry is something to look at.
      logOpsEvent('paystack-webhook', 'info', 'No open payout request matched this transfer', {
        reference,
        status: outcome.status,
      });
      return;
    }

    logOpsEvent('paystack-webhook', 'info', 'Payout request settled', {
      reference,
      status: outcome.status,
    });
  } catch (error) {
    logOpsEvent('paystack-webhook', 'error', 'Settling the payout request threw', {
      reference,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Handle successful transfer (payout)
 */
async function handleTransferSuccess(data: { reference: string }) {
  const { reference } = data;

  const { data: transaction } = await supabase
    .from('transactions')
    .select('id, type, payer_id, amount, state')
    .eq('reference', reference)
    .single();

  if (!transaction || transaction.type !== 'payout') {
    logOpsEvent('paystack-webhook', 'warn', 'Transfer success without matching payout transaction', { reference });
    return;
  }

  if (transaction.state === 'settled') {
    logOpsEvent('paystack-webhook', 'info', 'Ignoring duplicate transfer success', { reference, state: transaction.state });
    return;
  }

  if (['failed', 'refunded'].includes(transaction.state)) {
    logOpsEvent('paystack-webhook', 'warn', 'Ignoring late transfer success after wallet restoration', { reference, state: transaction.state });
    return;
  }

  if (transaction.payer_id) {
    await adjustProfileBalanceBuckets(
      transaction.payer_id,
      {
        pendingPayoutDelta: -(((transaction.amount as number) || 0) / 100),
      },
      {
        reasonCode: 'payout_settled',
        referenceType: 'transaction',
        referenceId: String(transaction.id),
        metadata: { reference },
      }
    );
  }

  await supabase
    .from('transactions')
    .update({
      state: 'settled',
      settled_at: new Date().toISOString(),
    })
    .eq('reference', reference);

  await settlePayoutRequest(reference, { status: 'completed' });

  if (transaction.payer_id) {
    await createNotification({
      userId: transaction.payer_id,
      type: 'payout_completed',
      title: 'Payout completed',
      message: `Your payout of ${formatZarFromCents((transaction.amount as number) || 0)} has been completed successfully.`,
      link: '/earnings',
      transactionId: transaction.id,
      sendEmail: false,
    })

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', transaction.payer_id)
      .maybeSingle()

    if (profile?.email) {
      await sendPayoutStatusEmail(profile.email, {
        recipientName: profile.full_name || 'there',
        amount: formatZarFromCents((transaction.amount as number) || 0),
        status: 'completed',
        actionUrl: `${SITE_URL}/earnings`,
      })
    }
  }

  logOpsEvent('paystack-webhook', 'info', 'Transfer completed', { reference });
}

/**
 * Handle failed transfer
 */
async function handleTransferFailed(data: { reference: string; reason: string }) {
  const { reference, reason } = data;

  const { data: transaction } = await supabase
    .from('transactions')
    .select('id, type, payer_id, amount, state')
    .eq('reference', reference)
    .single();

  if (!transaction || transaction.type !== 'payout') {
    logOpsEvent('paystack-webhook', 'warn', 'Transfer failure without matching payout transaction', { reference, reason });
    return;
  }

  if (['failed', 'refunded'].includes(transaction.state)) {
    logOpsEvent('paystack-webhook', 'info', 'Ignoring duplicate transfer failure', { reference, state: transaction.state });
    return;
  }

  if (transaction.state === 'settled') {
    logOpsEvent('paystack-webhook', 'warn', 'Ignoring transfer failure after settlement', { reference, state: transaction.state });
    return;
  }

  const refundAmount = ((transaction.amount as number) || 0) / 100;

  if (transaction.payer_id) {
    await adjustProfileBalanceBuckets(
      transaction.payer_id,
      {
        walletDelta: refundAmount,
        pendingPayoutDelta: -refundAmount,
      },
      {
        reasonCode: 'payout_failed_restore',
        referenceType: 'transaction',
        referenceId: String(transaction.id),
        metadata: { reason },
      }
    );

    await createNotification({
      userId: transaction.payer_id,
      type: 'payment_failed',
      title: 'Payout failed',
      message: `Your payout of ${formatZarFromCents((transaction.amount as number) || 0)} could not be completed. The funds have been returned to your wallet.`,
      link: '/earnings',
      transactionId: transaction.id,
      sendEmail: false,
    });

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', transaction.payer_id)
      .maybeSingle()

    if (profile?.email) {
      await sendPayoutStatusEmail(profile.email, {
        recipientName: profile.full_name || 'there',
        amount: formatZarFromCents((transaction.amount as number) || 0),
        status: 'failed',
        actionUrl: `${SITE_URL}/earnings`,
      })
    }
  }

  await supabase
    .from('transactions')
    .update({
      state: 'failed',
      failed_at: new Date().toISOString(),
      failure_reason: reason,
    })
    .eq('reference', reference);

  // Closes the request so the restored balance can be queued again, rather than
  // stranding the recipient behind a row that never clears.
  await settlePayoutRequest(reference, { status: 'failed', failureReason: reason });

  logOpsEvent('paystack-webhook', 'warn', 'Transfer failed and funds restored', { reference, reason });
}

/**
 * Handle reversed transfer
 */
async function handleTransferReversed(data: { reference: string }) {
  const { reference } = data;

  const { data: transaction } = await supabase
    .from('transactions')
    .select('id, type, payer_id, amount, state')
    .eq('reference', reference)
    .single();

  if (!transaction || transaction.type !== 'payout') {
    logOpsEvent('paystack-webhook', 'warn', 'Transfer reversal without matching payout transaction', { reference });
    return;
  }

  if (transaction.state === 'refunded') {
    logOpsEvent('paystack-webhook', 'info', 'Ignoring duplicate transfer reversal', { reference, state: transaction.state });
    return;
  }

  const refundAmount = ((transaction.amount as number) || 0) / 100;

  if (transaction.payer_id && transaction.state !== 'failed') {
    await adjustProfileBalanceBuckets(
      transaction.payer_id,
      {
        walletDelta: refundAmount,
        pendingPayoutDelta: ['initiated', 'released'].includes(transaction.state) ? -refundAmount : 0,
      },
      {
        reasonCode: 'payout_reversed_restore',
        referenceType: 'transaction',
        referenceId: String(transaction.id),
        metadata: { reference },
      }
    );

    await createNotification({
      userId: transaction.payer_id,
      type: 'refund_issued',
      title: 'Payout reversed',
      message: `Paystack reversed your payout of ${formatZarFromCents((transaction.amount as number) || 0)}. The funds are now back in your wallet.`,
      link: '/earnings',
      transactionId: transaction.id,
      sendEmail: false,
    });

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', transaction.payer_id)
      .maybeSingle()

    if (profile?.email) {
      await sendPayoutStatusEmail(profile.email, {
        recipientName: profile.full_name || 'there',
        amount: formatZarFromCents((transaction.amount as number) || 0),
        status: 'reversed',
        actionUrl: `${SITE_URL}/earnings`,
      })
    }
  }

  await supabase
    .from('transactions')
    .update({
      state: 'refunded',
      refunded_at: new Date().toISOString(),
      failure_reason: 'Transfer reversed by Paystack',
    })
    .eq('reference', reference);

  // A reversal is a payout that did not stick, so the request ends as failed
  // rather than completed — and the recipient becomes queueable again. This is
  // the one outcome allowed to overturn an already-'completed' request, since a
  // reversal can legitimately arrive after transfer.success.
  await settlePayoutRequest(reference, {
    status: 'failed',
    failureReason: 'Transfer reversed by Paystack',
    settleFrom: [...OPEN_PAYOUT_STATUSES, 'completed'],
  });

  logOpsEvent('paystack-webhook', 'warn', 'Transfer reversed and balance updated', { reference, previousState: transaction.state });
}
