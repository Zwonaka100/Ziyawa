/**
 * WALLET DEPOSIT API — RETIRED
 * POST /api/payments/deposit
 *
 * Voluntary wallet top-ups are disabled, alongside self-service withdrawal.
 *
 * Ziyawa is not a store of value: money enters when a groovist buys a ticket
 * and leaves as an admin-approved payout to the earner. Letting users load a
 * balance served no purpose once self-service withdrawal was removed — it would
 * take money in with no way for the user to get it back out themselves, which
 * is worse than not offering it at all.
 *
 * Kept as an explicit, logged refusal rather than deleted so any client still
 * calling it fails loudly. The previous implementation is in git history.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.warn(`Blocked wallet deposit attempt by user ${user.id}`);

    return NextResponse.json(
      {
        error: 'Adding funds is no longer available. You only need a Ziyawa balance to receive money you have earned.',
        selfServiceDisabled: true,
      },
      { status: 410 }
    );
  } catch (error) {
    console.error('Deposit route error:', error);
    return NextResponse.json({ error: 'Deposits are no longer available' }, { status: 410 });
  }
}
