/**
 * ADMIN PAYOUTS LIST API
 * GET /api/admin/payouts?status=pending
 *
 * Backs the payout approval queue. Returns each request alongside enough
 * context for an admin to decide: who is owed, where it would go, and whether
 * it is actually payable right now.
 *
 * Also returns the live Paystack balance, because transfers are funded from it
 * (`source: 'balance'`) — approving into an empty balance just fails at
 * Paystack, and an admin should see that before clicking.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { loadPayoutQueue } from '@/lib/admin/payouts'

export async function GET(request: NextRequest) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    const status = request.nextUrl.searchParams.get('status') || 'pending'
    return NextResponse.json(await loadPayoutQueue(status))
  } catch (error) {
    console.error('Admin payouts list error:', error)
    return NextResponse.json({ error: 'Failed to load payouts' }, { status: 500 })
  }
}
