/**
 * WALLET WITHDRAWAL API
 * POST /api/payments/withdraw
 * 
 * Initiates a withdrawal from wallet to bank account
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTransferRecipient, initiateTransfer, generatePaymentReference } from '@/lib/paystack';
import { calculateWithdrawalFee, PLATFORM_FEES } from '@/lib/constants';
import { adjustProfileBalanceBuckets } from '@/lib/payments/escrow';

function resolveRecipientType(profile: { is_artist?: boolean; is_provider?: boolean }) {
  if (profile.is_artist) return 'artist';
  if (profile.is_provider) return 'vendor';
  return 'organizer';
}

function normalizeAmountToCents(rawAmount: unknown, unit: string = 'cents') {
  const numericAmount = Number(rawAmount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return 0;
  }

  return unit === 'rands'
    ? Math.round(numericAmount * 100)
    : Math.round(numericAmount);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, wallet_balance, held_balance, pending_payout_balance, is_organizer, is_artist, is_provider, is_verified')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Identity verification required before withdrawal
    if (!profile.is_verified) {
      return NextResponse.json(
        {
          error: 'Identity verification required before withdrawing funds. Please complete verification in your account settings.',
          verificationRequired: true,
          link: '/dashboard/settings?tab=verification',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { amount, bankCode, accountNumber, accountName, amountUnit = 'cents' } = body;

    if (!amount || !bankCode || !accountNumber || !accountName) {
      return NextResponse.json(
        { error: 'Amount, bank code, account number, and account name are required' },
        { status: 400 }
      );
    }

    const amountInCents = normalizeAmountToCents(amount, amountUnit);
    const amountInRands = amountInCents / 100;
    const minimumWithdrawalRands = PLATFORM_FEES.wallet.minimumWithdrawal / 100;

    if (amountInRands < minimumWithdrawalRands) {
      return NextResponse.json(
        { error: `Minimum withdrawal is R${minimumWithdrawalRands}` },
        { status: 400 }
      );
    }

    if (amountInRands > Number(profile.wallet_balance || 0)) {
      return NextResponse.json(
        { error: 'Insufficient available wallet balance' },
        { status: 400 }
      );
    }

    const fees = calculateWithdrawalFee(amountInCents);
    const netPayoutCents = fees.netAmount;

    if (netPayoutCents <= 0) {
      return NextResponse.json(
        { error: 'Withdrawal amount is too low after fees' },
        { status: 400 }
      );
    }

    const reference = generatePaymentReference('WDR');

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

    const { data: transaction, error: txnError } = await supabase
      .from('transactions')
      .insert({
        reference,
        type: 'payout',
        state: 'initiated',
        payer_id: user.id,
        recipient_id: user.id,
        recipient_type: resolveRecipientType(profile),
        amount: amountInCents,
        platform_fee: fees.fee,
        net_amount: netPayoutCents,
        gateway_provider: 'paystack',
        gateway_response: {
          payout_type: 'wallet_withdrawal',
          bank_code: bankCode,
          account_number_last4: String(accountNumber).slice(-4),
          account_name: accountName,
          recipient_code: recipientCode,
        },
      })
      .select()
      .single();

    if (txnError || !transaction) {
      console.error('Transaction creation error:', txnError);
      return NextResponse.json(
        { error: 'Failed to create withdrawal record' },
        { status: 500 }
      );
    }

    const bucketUpdate = await adjustProfileBalanceBuckets(user.id, {
      walletDelta: -amountInRands,
      pendingPayoutDelta: amountInRands,
    });

    if (!bucketUpdate.success) {
      await supabase
        .from('transactions')
        .update({ state: 'failed', failure_reason: 'Wallet bucket update failed' })
        .eq('id', transaction.id);
      
      return NextResponse.json(
        { error: 'Failed to reserve funds for payout' },
        { status: 500 }
      );
    }

    const transferResult = await initiateTransfer({
      amount: netPayoutCents,
      recipient_code: recipientCode,
      reason: `Ziyawa wallet withdrawal - ${reference}`,
      reference,
    });

    if (!transferResult.status) {
      await adjustProfileBalanceBuckets(user.id, {
        walletDelta: amountInRands,
        pendingPayoutDelta: -amountInRands,
      });

      await supabase
        .from('transactions')
        .update({ 
          state: 'failed', 
          failed_at: new Date().toISOString(),
          failure_reason: transferResult.message || 'Transfer initiation failed'
        })
        .eq('id', transaction.id);

      return NextResponse.json(
        { error: 'Transfer failed. Your available wallet balance has been restored.' },
        { status: 400 }
      );
    }

    await supabase
      .from('transactions')
      .update({ 
        state: 'released',
        released_at: new Date().toISOString(),
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
