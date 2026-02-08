/**
 * PAYMENT VERIFICATION API
 * GET /api/payments/verify
 * 
 * Verifies a payment with Paystack and returns transaction details
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyPayment } from '@/lib/paystack';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json(
        { error: 'Payment reference is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Verify with Paystack
    const paystackResult = await verifyPayment(reference);
    
    if (!paystackResult.status) {
      return NextResponse.json(
        { error: 'Payment verification failed with Paystack' },
        { status: 400 }
      );
    }

    const paystackData = paystackResult.data;

    // Get our transaction record with related data
    const { data: transaction, error: txnError } = await supabase
      .from('transactions')
      .select(`
        *,
        events (
          id,
          title
        )
      `)
      .eq('reference', reference)
      .single();

    if (txnError) {
      console.error('Transaction lookup error:', txnError);
    }

    // If user is logged in, verify they own this transaction
    if (user && transaction && transaction.payer_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Build response based on payment type
    const paymentType = paystackData.metadata?.type as string;
    const response: Record<string, unknown> = {
      status: paystackData.status,
      reference: reference,
      amount: paystackData.amount,
      type: paymentType,
    };

    // Add type-specific data
    if (paymentType === 'ticket_purchase' && transaction) {
      response.eventName = transaction.events?.title;
      response.quantity = paystackData.metadata?.quantity;

      // Get ticket codes if payment was successful
      if (paystackData.status === 'success') {
        const { data: tickets } = await supabase
          .from('tickets')
          .select('ticket_code')
          .eq('transaction_id', transaction.id);

        response.ticketCodes = tickets?.map((t: { ticket_code: string }) => t.ticket_code) || [];
      }
    }

    return NextResponse.json({
      payment: response,
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Payment verification failed' },
      { status: 500 }
    );
  }
}
