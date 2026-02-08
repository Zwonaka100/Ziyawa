/**
 * WALLET WITHDRAWAL API
 * POST /api/payments/withdraw
 * 
 * Initiates a withdrawal from wallet to bank account
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTransferRecipient, initiateTransfer, generatePaymentReference } from '@/lib/paystack';
import { calculateWithdrawalFee } from '@/lib/constants';

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

    // Get user profile with wallet balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, wallet_balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { amount, bankCode, accountNumber, accountName } = body;

    // Validate input
    if (!amount || !bankCode || !accountNumber || !accountName) {
      return NextResponse.json(
        { error: 'Amount, bank code, account number, and account name are required' },
        { status: 400 }
      );
    }

    // Amount is in cents
    const amountInCents = parseInt(amount);
    const amountInRands = amountInCents / 100;

    // Check minimum withdrawal (R50)
    if (amountInRands < 50) {
      return NextResponse.json(
        { error: 'Minimum withdrawal is R50' },
        { status: 400 }
      );
    }

    // Check wallet balance
    if (amountInRands > profile.wallet_balance) {
      return NextResponse.json(
        { error: 'Insufficient wallet balance' },
        { status: 400 }
      );
    }

    // Calculate fees
    const fees = calculateWithdrawalFee(amountInCents);
    const netPayoutCents = fees.netAmount;
    const reference = generatePaymentReference('WDR');

    // 1. Create transfer recipient in Paystack
    const recipientResult = await createTransferRecipient({
      name: accountName,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'ZAR',
    });

    if (!recipientResult.status) {
      console.error('Failed to create recipient:', recipientResult);
      return NextResponse.json(
        { error: 'Failed to set up bank account. Please verify your details.' },
        { status: 400 }
      );
    }

    const recipientCode = recipientResult.data.recipient_code;

    // 2. Create transaction record (as pending)
    const { data: transaction, error: txnError } = await supabase
      .from('transactions')
      .insert({
        reference,
        type: 'withdrawal',
        state: 'initiated',
        payer_id: user.id,
        amount: amountInCents,
        platform_fee: fees.fee,
        net_amount: netPayoutCents,
        currency: 'ZAR',
        metadata: {
          type: 'wallet_withdrawal',
          user_id: user.id,
          bank_code: bankCode,
          account_number: accountNumber.slice(-4), // Only store last 4 digits
          account_name: accountName,
          recipient_code: recipientCode,
        },
      })
      .select()
      .single();

    if (txnError) {
      console.error('Transaction creation error:', txnError);
      return NextResponse.json(
        { error: 'Failed to create withdrawal record' },
        { status: 500 }
      );
    }

    // 3. Deduct from wallet immediately (will be refunded if transfer fails)
    const newBalance = profile.wallet_balance - amountInRands;
    
    const { error: walletError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', user.id);

    if (walletError) {
      // Rollback transaction record
      await supabase
        .from('transactions')
        .update({ state: 'failed', failure_reason: 'Wallet update failed' })
        .eq('id', transaction.id);
      
      return NextResponse.json(
        { error: 'Failed to update wallet balance' },
        { status: 500 }
      );
    }

    // 4. Initiate transfer via Paystack
    // Note: Paystack transfer amounts are in the smallest currency unit (kobo/cents)
    const transferResult = await initiateTransfer({
      amount: netPayoutCents, // In cents
      recipient_code: recipientCode,
      reason: `Ziyawa wallet withdrawal - ${reference}`,
      reference,
    });

    if (!transferResult.status) {
      // Transfer failed - refund wallet
      await supabase
        .from('profiles')
        .update({ wallet_balance: profile.wallet_balance })
        .eq('id', user.id);

      await supabase
        .from('transactions')
        .update({ 
          state: 'failed', 
          failed_at: new Date().toISOString(),
          failure_reason: transferResult.message || 'Transfer initiation failed'
        })
        .eq('id', transaction.id);

      return NextResponse.json(
        { error: 'Transfer failed. Your wallet has been refunded.' },
        { status: 400 }
      );
    }

    // 5. Update transaction with transfer details
    await supabase
      .from('transactions')
      .update({ 
        state: 'processing',
        gateway_response: transferResult.data,
      })
      .eq('id', transaction.id);

    return NextResponse.json({
      success: true,
      reference,
      amount: amountInRands,
      fee: fees.fee / 100,
      netPayout: netPayoutCents / 100,
      message: 'Withdrawal initiated successfully. Funds will arrive within 24 hours.',
    });

  } catch (error) {
    console.error('Withdrawal error:', error);
    return NextResponse.json(
      { error: 'Withdrawal failed' },
      { status: 500 }
    );
  }
}
