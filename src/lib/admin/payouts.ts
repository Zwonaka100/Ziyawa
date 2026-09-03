/**
 * Payout queue for admin, shared by the API route and the server page.
 *
 * Note on the Paystack balance: transfers are funded from it, so approving into
 * an empty balance just fails at Paystack and an admin should see that before
 * clicking. It is fetched with a timeout — this now runs during page render,
 * and without one a hanging Paystack request would hang the whole page. A
 * failed or slow balance read returns null and the queue still renders.
 */

import { createAdminServiceClient } from '@/lib/admin-auth'

const BALANCE_TIMEOUT_MS = 4000

export async function fetchPaystackBalanceRands(): Promise<number | null> {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return null

  try {
    const response = await fetch('https://api.paystack.co/balance', {
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(BALANCE_TIMEOUT_MS),
    })
    if (!response.ok) return null

    const data = await response.json()
    const zar = (data?.data || []).find((entry: { currency?: string }) => entry.currency === 'ZAR')
    return zar ? Number(zar.balance || 0) / 100 : 0
  } catch (error) {
    // Next signals "this route cannot be static" by throwing through fetch.
    // Swallowing that would both break its dynamic detection and report a
    // framework signal as a Paystack outage, which it is not.
    if ((error as { digest?: string })?.digest === 'DYNAMIC_SERVER_USAGE') throw error

    console.error('Could not read Paystack balance:', error)
    return null
  }
}

export interface PayoutQueue {
  requests: Record<string, unknown>[]
  paystackBalanceRands: number | null
}

export async function loadPayoutQueue(status = 'pending'): Promise<PayoutQueue> {
  const supabaseAdmin = createAdminServiceClient()

  let query = supabaseAdmin
    .from('payout_requests')
    .select('*')
    .order('requested_at', { ascending: false })
    .limit(100)

  if (status !== 'all') query = query.eq('status', status)

  const { data: requests, error } = await query
  if (error) throw error

  // Join in the current state of each recipient. Deliberately fetched fresh
  // rather than trusted from the queued row: verification can be revoked and
  // balances move between queueing and approval.
  const userIds = [...new Set((requests || []).map((r) => r.user_id).filter(Boolean))]

  // The balance is fetched alongside the recipient data rather than after it,
  // so the external call overlaps with the database work instead of following it.
  const [{ data: profiles }, { data: payoutAccounts }, { data: verifications }, paystackBalanceRands] =
    await Promise.all([
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
      // Verification was read as a bare boolean, so "not verified" could not be
      // told apart from "applied, and sitting in your own review queue" or
      // "rejected, waiting on them". Those need different actions from an
      // admin, so the request itself is fetched too.
      userIds.length
        ? supabaseAdmin
            .from('verification_requests')
            .select('profile_id, status, submitted_at, rejection_reason')
            .in('profile_id', userIds)
            .order('submitted_at', { ascending: false })
        : Promise.resolve({ data: [] as unknown[] }),
      fetchPaystackBalanceRands(),
    ])

  const profileById = new Map(((profiles as { id: string }[] | null) || []).map((p) => [p.id, p]))
  const accountByProfile = new Map(
    ((payoutAccounts as { profile_id: string }[] | null) || []).map((a) => [a.profile_id, a])
  )
  // Ordered newest-first above, so the first entry seen per profile is current.
  const verificationByProfile = new Map<string, { status: string; submitted_at: string | null }>()
  for (const row of ((verifications as { profile_id: string; status: string; submitted_at: string | null }[] | null) || [])) {
    if (!verificationByProfile.has(row.profile_id)) verificationByProfile.set(row.profile_id, row)
  }

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
    const verification = verificationByProfile.get(payoutRequest.user_id)
    if (profile && !profile.is_verified) {
      if (!verification) {
        blockers.push('Not verified — they have never submitted documents')
      } else if (verification.status === 'pending') {
        blockers.push('Not verified — their submission is waiting in your review queue')
      } else if (verification.status === 'rejected') {
        blockers.push('Not verified — their last submission was rejected, waiting on them to resubmit')
      } else {
        blockers.push('Account is not verified')
      }
    }
    if (!account) blockers.push('No payout account on file')
    if (account && !account.paystack_recipient_code) {
      blockers.push(
        account.recipient_error
          ? `Paystack recipient not created: ${account.recipient_error}`
          : 'Paystack recipient not created'
      )
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
      verification: verification ? { status: verification.status, submitted_at: verification.submitted_at } : null,
      blockers,
      payable: blockers.length === 0 && payoutRequest.status === 'pending',
    }
  })

  return { requests: enriched, paystackBalanceRands }
}
