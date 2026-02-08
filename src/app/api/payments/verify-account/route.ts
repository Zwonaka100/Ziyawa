/**
 * VERIFY BANK ACCOUNT API
 * POST /api/payments/verify-account
 * 
 * Verifies a bank account number and returns the account name
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveAccount } from '@/lib/paystack';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountNumber, bankCode } = body;

    // Validate input
    if (!accountNumber || !bankCode) {
      return NextResponse.json(
        { error: 'Account number and bank code are required' },
        { status: 400 }
      );
    }

    if (accountNumber.length !== 10) {
      return NextResponse.json(
        { error: 'Account number must be 10 digits' },
        { status: 400 }
      );
    }

    // Resolve account with Paystack
    const result = await resolveAccount({ account_number: accountNumber, bank_code: bankCode });
    
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
