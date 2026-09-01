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
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fetchPaystackBalanceRands(): Promise<number | null> {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return null
  try {
    const response = await fetch('https://api.paystack.co/balance', {
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
    })
    if (!response.ok) return null
    const data = await response.json()
    const zar = (data?.data || []).find((entry: { currency?: string }) => entry.currency === 'ZAR')
    return zar ? Number(zar.balance || 0) / 100 : 0
  } catch (error) {
    console.error('Could not read Paystack balance:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const gate = await requireAdminApi()
    if ('response' in gate) return gate.response

    const status = request.nextUrl.searchParams.get('status') || 'pending'

    let query = supabaseAdmin
      .from('payout_requests')
      .select('*')
      .order('requested_at', { ascending: false })
      .limit(100)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: requests, error } = await query
    if (error) throw error

    // Join in the current state of each recipient. Deliberately fetched fresh
    // rather than trusted from the queued row: verification can be revoked and
    // balances move between queueing and approval.
    const userIds = [...new Set((requests || []).map((r) => r.user_id).filter(Boolean))]

    const [{ data: profiles }, { data: payoutAccounts }] = await Promise.all([
      userIds.length
        ? supabaseAdmin
            .from('profiles')
            .select('id, full_name, email, is_verified, wallet_balance, pending_payout_balance')
            .in('id', userIds)
        : Promise.resolve({ data: [] as unknown[] }),
      userIds.length
        ? supabaseAdmin
            .from('payout_accounts')
            .select('profile_id, bank_name, account_number, account_holder, legal_name, paystack_recipient_code, recipient_error')
            .in('profile_id', userIds)
        : Promise.resolve({ data: [] as unknown[] }),
    ])

    const profileById = new Map(
      (profiles as { id: string }[] | null || []).map((p) => [p.id, p])
    )
    const accountByProfile = new Map(
      (payoutAccounts as { profile_id: string }[] | null || []).map((a) => [a.profile_id, a])
    )

    const enriched = (requests || []).map((payoutRequest) => {
      const profile = profileById.get(payoutRequest.user_id) as
        | { full_name: string | null; email: string; is_verified: boolean; wallet_balance: number; pending_payout_balance: number }
        | undefined
      const account = accountByProfile.get(payoutRequest.user_id) as
        | { paystack_recipient_code: string | null; recipient_error: string | null; account_holder: string | null; legal_name: string | null; bank_name: string | null; account_number: string | null }
        | undefined

      // Say why something can't be paid rather than hiding it — a stuck payout
      // is exactly what an admin needs to see and act on.
      const blockers: string[] = []
      if (!profile) blockers.push('Recipient profile is missing')
      if (profile && !profile.is_verified) blockers.push('Account is not verified')
      if (!account) blockers.push('No payout account on file')
      if (account && !account.paystack_recipient_code) {
        blockers.push(account.recipient_error
          ? `Paystack recipient not created: ${account.recipient_error}`
          : 'Paystack recipient not created')
      }
      if (profile && Number(profile.wallet_balance || 0) < Number(payoutRequest.amount || 0)) {
        blockers.push('Available balance is lower than the queued amount')
      }

      return {
        ...payoutRequest,
        recipient: profile
          ? {
              full_name: profile.full_name,
              email: profile.email,
              is_verified: profile.is_verified,
              wallet_balance: Number(profile.wallet_balance || 0),
              pending_payout_balance: Number(profile.pending_payout_balance || 0),
            }
          : null,
        payout_account: account || null,
        blockers,
        payable: blockers.length === 0 && payoutRequest.status === 'pending',
      }
    })

    return NextResponse.json({
      requests: enriched,
      paystackBalanceRands: await fetchPaystackBalanceRands(),
    })
  } catch (error) {
    console.error('Admin payouts list error:', error)
    return NextResponse.json({ error: 'Failed to load payouts' }, { status: 500 })
  }
}
