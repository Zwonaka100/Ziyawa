/**
 * Balance listing and totals for admin, shared by the API route and the server
 * page.
 *
 * The page made three browser queries: a page of profiles, a second read of
 * every profile to total the tiles, and a third near-identical copy of the list
 * query used only when searching. One function covers all three cases here, so
 * the search path and the list path cannot drift apart.
 *
 * (This page becomes "Earnings" in the terminology pass; the shape stays.)
 */

import { createAdminServiceClient } from '@/lib/admin-auth'
import type { WalletStats } from './wallet-types'

export * from './wallet-types'

export const WALLETS_PAGE_SIZE = 20

export const WALLET_COLUMNS = `
  id, full_name, email, avatar_url,
  is_organizer, is_artist, is_provider,
  wallet_balance, held_balance, pending_payout_balance,
  created_at, updated_at
`

export interface WalletFilters {
  balance?: string
  search?: string
  page?: number
}

export async function loadWallets({
  balance = 'all',
  search = '',
  page = 1,
}: WalletFilters = {}) {
  const supabaseAdmin = createAdminServiceClient()

  let listQuery = supabaseAdmin
    .from('profiles')
    .select(WALLET_COLUMNS, { count: 'exact' })
    .order('wallet_balance', { ascending: false })

  if (search.trim()) {
    listQuery = listQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  } else if (balance === 'positive') {
    listQuery = listQuery.or(
      'wallet_balance.gt.0,held_balance.gt.0,pending_payout_balance.gt.0'
    )
  } else if (balance === 'pending') {
    listQuery = listQuery.or('held_balance.gt.0,pending_payout_balance.gt.0')
  } else if (balance === 'zero') {
    listQuery = listQuery
      .eq('wallet_balance', 0)
      .eq('held_balance', 0)
      .eq('pending_payout_balance', 0)
  }

  const from = (page - 1) * WALLETS_PAGE_SIZE
  listQuery = listQuery.range(from, from + WALLETS_PAGE_SIZE - 1)

  const [listResult, totalsResult] = await Promise.all([
    listQuery,
    supabaseAdmin
      .from('profiles')
      .select('id, wallet_balance, held_balance, pending_payout_balance', { count: 'exact' }),
  ])

  if (listResult.error) throw new Error('Failed to load wallets')

  const all = totalsResult.data || []
  const stats: WalletStats = {
    totalWallets: totalsResult.count || all.length,
    totalBalance: all.reduce((sum, p) => sum + Number(p.wallet_balance || 0), 0),
    totalPending: all.reduce(
      (sum, p) => sum + Number(p.held_balance || 0) + Number(p.pending_payout_balance || 0),
      0
    ),
    activeWallets: all.filter(
      (p) =>
        Number(p.wallet_balance || 0) > 0 ||
        Number(p.held_balance || 0) > 0 ||
        Number(p.pending_payout_balance || 0) > 0
    ).length,
  }

  return {
    profiles: listResult.data || [],
    totalCount: listResult.count || 0,
    stats,
  }
}

