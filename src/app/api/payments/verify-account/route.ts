/**
 * VERIFY BANK ACCOUNT API
 * POST /api/payments/verify-account
 *
 * Resolves a bank account number to its account holder name.
 *
 * ⚠️ DOES NOT WORK FOR SOUTH AFRICA. Paystack's /bank/resolve endpoint supports
 * only NGN, USD, GHS and KES — a ZAR account returns
 * "Please supply one of the following valid currencies", even when currency=ZAR
 * is passed explicitly. Verified against the live API on 2026-08-30.
 *
 * Nothing in the verification flow depends on this: account holder names are
 * self-declared and checked by an admin against the ID document instead. This
 * route is kept only for the legacy withdrawal dialog (itself due to be
 * replaced by admin-approved payouts). Do not build new features on it, and do
 * not assume a bank account has been validated because it was "verified" here.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveAccount } from '@/lib/paystack';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // This turns an account number into a real person's name, so it must not
    // be open to anonymous callers enumerating accounts.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountNumber, bankCode } = body;

    // Validate input
    if (!accountNumber || !bankCode) {
      return NextResponse.json(
        { error: 'Account number and bank code are required' },
        { status: 400 }
      );
    }

    // South African account numbers are not a fixed length — Standard Bank
    // issues 9- and 11-digit numbers, so an "exactly 10" rule rejects real
    // customers. Only sanity-check the shape here and let Paystack be the
    // authority on whether the account actually resolves.
    const normalizedAccount = String(accountNumber).replace(/\s/g, '');
    if (!/^\d{6,15}$/.test(normalizedAccount)) {
      return NextResponse.json(
        { error: 'Account number must be between 6 and 15 digits' },
        { status: 400 }
      );
    }

    // Resolve account with Paystack
    const result = await resolveAccount({ account_number: normalizedAccount, bank_code: bankCode });
    
    if (!result.status) {
      return NextResponse.json(
        { error: 'Could not verify account. Please check your details.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      accountName: result.data.account_name,
      accountNumber: result.data.account_number,
      bankId: result.data.bank_id,
    });

  } catch (error) {
    console.error('Account verification error:', error);
    return NextResponse.json(
      { error: 'Account verification failed' },
      { status: 500 }
    );
  }
}
