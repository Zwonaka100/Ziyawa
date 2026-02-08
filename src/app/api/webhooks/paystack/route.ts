/**
 * PAYSTACK WEBHOOK HANDLER
 * POST /api/webhooks/paystack
 * 
 * Handles all Paystack webhook events:
 * - charge.success: Payment completed
 * - transfer.success: Payout completed
 * - transfer.failed: Payout failed
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyWebhookSignature, verifyPayment, generateTicketCode } from '@/lib/paystack';

// Use service role for webhooks (no user context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const payload = await request.text();
    const signature = request.headers.get('x-paystack-signature') || '';

    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event = JSON.parse(payload);
    console.log('Paystack webhook received:', event.event);

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
        console.log('Unhandled webhook event:', event.event);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
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

  // Already processed?
  if (transaction.state !== 'initiated') {
    console.log('Transaction already processed:', reference);
    return;
  }

  const paymentType = metadata.type as string;

  // Handle based on payment type
  switch (paymentType) {
    case 'ticket_purchase':
      await processTicketPurchase(transaction, verification.data, metadata);
      break;
    
    case 'wallet_deposit':
      await processWalletDeposit(transaction, verification.data, metadata);
      break;
    
    case 'booking_payment':
      await processBookingPayment(transaction, verification.data, metadata);
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
  const quantity = (metadata.quantity as number) || 1;

  // Start a pseudo-transaction (Supabase doesn't support true transactions in client)
  try {
    // 1. Update transaction state
    await supabase
      .from('transactions')
      .update({
        state: 'authorized',
        gateway_response: paystackData,
        authorized_at: new Date().toISOString(),
      })
      .eq('id', transaction.id);

    // 2. Create tickets
    const tickets = [];
    for (let i = 0; i < quantity; i++) {
      tickets.push({
        event_id: eventId,
        user_id: userId,
        transaction_id: transaction.id,
        ticket_code: generateTicketCode(),
        ticket_type: 'general',
        price_paid: (transaction.amount as number) / quantity / 100, // Convert back to Rands
      });
    }

    const { error: ticketError } = await supabase
      .from('tickets')
      .insert(tickets);

    if (ticketError) {
      console.error('Ticket creation failed:', ticketError);
      throw ticketError;
    }

    // 3. Update event tickets_sold count
    const { data: event } = await supabase
      .from('events')
      .select('tickets_sold, total_revenue')
      .eq('id', eventId)
      .single();

    await supabase
      .from('events')
      .update({
        tickets_sold: (event?.tickets_sold || 0) + quantity,
        total_revenue: (event?.total_revenue || 0) + (transaction.net_amount as number) / 100,
      })
      .eq('id', eventId);

    // 4. Move transaction to "held" state (escrow until event completes)
    await supabase
      .from('transactions')
      .update({
        state: 'held',
        held_at: new Date().toISOString(),
      })
      .eq('id', transaction.id);

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
    await supabase
      .from('transactions')
      .update({
        state: 'settled', // Deposits settle immediately
        gateway_response: paystackData,
        authorized_at: new Date().toISOString(),
        settled_at: new Date().toISOString(),
      })
      .eq('id', transaction.id);

    // 2. Update user wallet balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .single();

    await supabase
      .from('profiles')
      .update({
        wallet_balance: (profile?.wallet_balance || 0) + depositAmount,
      })
      .eq('id', userId);

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
    // 1. Update transaction state
    await supabase
      .from('transactions')
      .update({
        state: 'held', // Booking payments are held until event completion
        gateway_response: paystackData,
        authorized_at: new Date().toISOString(),
        held_at: new Date().toISOString(),
      })
      .eq('id', transaction.id);

    // 2. Update booking state to confirmed
    const tableName = bookingType === 'vendor' ? 'provider_bookings' : 'bookings';
    
    await supabase
      .from(tableName)
      .update({
        state: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    console.log(`✅ Booking payment completed: ${bookingType} booking ${bookingId}`);

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

/**
 * Handle successful transfer (payout)
 */
async function handleTransferSuccess(data: { reference: string }) {
  const { reference } = data;

  await supabase
    .from('transactions')
    .update({
      state: 'settled',
      settled_at: new Date().toISOString(),
    })
    .eq('reference', reference);

  console.log(`✅ Transfer completed: ${reference}`);
}

/**
 * Handle failed transfer
 */
async function handleTransferFailed(data: { reference: string; reason: string }) {
  const { reference, reason } = data;

  await supabase
    .from('transactions')
    .update({
      state: 'failed',
      failed_at: new Date().toISOString(),
      failure_reason: reason,
    })
    .eq('reference', reference);

  console.log(`❌ Transfer failed: ${reference} - ${reason}`);
}

/**
 * Handle reversed transfer
 */
async function handleTransferReversed(data: { reference: string }) {
  const { reference } = data;

  await supabase
    .from('transactions')
    .update({
      state: 'refunded',
      refunded_at: new Date().toISOString(),
    })
    .eq('reference', reference);

  console.log(`↩️ Transfer reversed: ${reference}`);
}
