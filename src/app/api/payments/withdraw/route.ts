/**
 * WALLET WITHDRAWAL API — RETIRED
 * POST /api/payments/withdraw
 *
 * Self-service withdrawal is disabled. Every payout is approved by an admin
 * first, and this route bypassed that entirely: it sent money straight to a
 * bank account on nothing more than `is_verified` — no approval, no queue, and
 * no record in the payouts panel.
 *
 * Payouts now flow: funds released → queued as a payout request → an admin
 * approves → transfer fires. See src/app/api/admin/payouts/[id]/route.ts.
 *
 * The route is kept as an explicit, logged refusal rather than deleted so that
 * any client still calling it fails loudly instead of appearing to succeed.
 * The previous implementation is in git history if it is ever needed.
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

    // Logged so an attempt is visible rather than silently swallowed.
    console.warn(`Blocked self-service withdrawal attempt by user ${user.id}`);

    return NextResponse.json(
      {
        error: 'Payouts are now reviewed and released by our team. Your available funds are queued automatically — there is nothing you need to request.',
        selfServiceDisabled: true,
      },
      { status: 410 }
    );
  } catch (error) {
    console.error('Withdrawal route error:', error);
    return NextResponse.json({ error: 'Withdrawal is no longer available' }, { status: 410 });
  }
}
