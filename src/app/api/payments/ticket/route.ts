/**
 * TICKET PURCHASE API
 * POST /api/payments/ticket
 * 
 * Initializes a Paystack payment for ticket purchase
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { initializePayment, generatePaymentReference } from '@/lib/paystack';
import { calculateTicketSaleBreakdown } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { eventId, quantity = 1 } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, ticket_price, capacity, tickets_sold, state, organizer_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Validate event state
    if (!['published', 'locked'].includes(event.state)) {
      return NextResponse.json(
        { error: 'Event is not available for ticket sales' },
        { status: 400 }
      );
    }

    // Check capacity
    if (event.tickets_sold + quantity > event.capacity) {
      return NextResponse.json(
        { error: 'Not enough tickets available' },
        { status: 400 }
      );
    }

    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    if (!profile?.email) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 400 }
      );
    }

    // Calculate fees (ticket_price is stored in cents)
    const ticketPriceCents = event.ticket_price * 100;
    const breakdown = calculateTicketSaleBreakdown(ticketPriceCents);
    const totalAmount = breakdown.buyerTotal * quantity;

    // Generate unique reference
    const reference = generatePaymentReference('TKT');

    // Create pending transaction record
    const { data: transaction, error: txnError } = await supabase
      .from('transactions')
      .insert({
        reference,
        type: 'ticket_purchase',
        state: 'initiated',
        amount: totalAmount,
        platform_fee: (breakdown.ticketingCommission + breakdown.platformFee + breakdown.bookingFee) * quantity,
        net_amount: breakdown.organizerNet * quantity,
        payer_id: user.id,
        recipient_id: event.organizer_id,
        recipient_type: 'organizer',
        event_id: eventId,
        gateway_provider: 'paystack',
        gateway_response: {
          quantity,
          ticket_price_cents: ticketPriceCents,
          booking_fee_cents: breakdown.bookingFee,
          breakdown,
        },
      })
      .select()
      .single();

    if (txnError) {
      console.error('Transaction creation error:', txnError);
      return NextResponse.json(
        { error: 'Failed to create transaction' },
        { status: 500 }
      );
    }

    // Initialize Paystack payment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const paystackResponse = await initializePayment({
      email: profile.email,
      amount: totalAmount,
      reference,
      callback_url: `${appUrl}/payments/callback?type=ticket`,
      metadata: {
        transaction_id: transaction.id,
        event_id: eventId,
        event_title: event.title,
        user_id: user.id,
        user_name: profile.full_name,
        quantity,
        ticket_price: ticketPriceCents,
        booking_fee: breakdown.bookingFee,
        type: 'ticket_purchase',
      },
    });

    // Update transaction with Paystack reference
    await supabase
      .from('transactions')
      .update({
        gateway_reference: paystackResponse.data.access_code,
      })
      .eq('id', transaction.id);

    return NextResponse.json({
      success: true,
      data: {
        authorization_url: paystackResponse.data.authorization_url,
        access_code: paystackResponse.data.access_code,
        reference,
        transaction_id: transaction.id,
        breakdown: {
          ticketPrice: ticketPriceCents / 100,
          bookingFee: breakdown.bookingFee / 100,
          quantity,
          total: totalAmount / 100,
        },
      },
    });

  } catch (error) {
    console.error('Ticket payment error:', error);
    return NextResponse.json(
      { error: 'Payment initialization failed' },
      { status: 500 }
    );
  }
}
