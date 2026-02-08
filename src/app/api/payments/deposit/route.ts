/**
 * WALLET DEPOSIT API
 * POST /api/payments/deposit
 * 
 * Add funds to wallet via Paystack
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { initializePayment, generatePaymentReference } from '@/lib/paystack';
import { calculateDepositFee } from '@/lib/constants';

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
    const { amount } = body; // Amount in Rands

    if (!amount || amount < 50) {
      return NextResponse.json(
        { error: 'Minimum deposit is R50' },
        { status: 400 }
      );
    }

    // Get user profile
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

    // Calculate fees (convert to cents)
    const amountCents = amount * 100;
    const { fee, totalToPay } = calculateDepositFee(amountCents);

    // Generate unique reference
    const reference = generatePaymentReference('DEP');

    // Create pending transaction record
    const { data: transaction, error: txnError } = await supabase
      .from('transactions')
      .insert({
        reference,
        type: 'wallet_deposit',
        state: 'initiated',
        amount: totalToPay,
        platform_fee: fee,
        net_amount: amountCents, // This is what goes into wallet
        payer_id: user.id,
        recipient_id: user.id,
        recipient_type: 'organizer', // Could be any role
        gateway_provider: 'paystack',
        gateway_response: {
          deposit_amount_cents: amountCents,
          fee_cents: fee,
          total_cents: totalToPay,
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
      amount: totalToPay,
      reference,
      callback_url: `${appUrl}/payments/callback?type=deposit`,
      metadata: {
        transaction_id: transaction.id,
        user_id: user.id,
        user_name: profile.full_name,
        deposit_amount: amountCents,
        fee: fee,
        type: 'wallet_deposit',
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
          depositAmount: amount,
          fee: fee / 100,
          total: totalToPay / 100,
        },
      },
    });

  } catch (error) {
    console.error('Deposit payment error:', error);
    return NextResponse.json(
      { error: 'Payment initialization failed' },
      { status: 500 }
    );
  }
}
