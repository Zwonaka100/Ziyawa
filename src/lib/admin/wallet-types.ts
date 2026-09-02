/**
 * Wallet shapes and the profile -> wallet mapper.
 *
 * Deliberately separate from ./wallets.ts, which imports the service client and
 * therefore next/headers. The table component needs the mapper as a value, and
 * importing it from a module with server-only imports drags next/headers into
 * the client bundle and fails the build. Nothing here touches the server.
 */

export interface WalletProfileRow {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  is_organizer: boolean
  is_artist: boolean
  is_provider: boolean
  wallet_balance: number | null
  held_balance: number | null
  pending_payout_balance: number | null
  created_at: string
  updated_at: string
}

export interface WalletWithUser {
  id: string
  user_id: string
  balance: number
  held_balance: number
  pending_balance: number
  created_at: string
  updated_at: string
  user?: {
    full_name: string | null
    email: string
    avatar_url: string | null
    is_organizer: boolean
    is_artist: boolean
    is_provider: boolean
  }
}

export interface WalletStats {
  totalWallets: number
  totalBalance: number
  totalPending: number
  activeWallets: number
}

export function mapProfileToWallet(profile: WalletProfileRow): WalletWithUser {
  return {
    id: profile.id,
    user_id: profile.id,
    balance: Number(profile.wallet_balance || 0),
    held_balance: Number(profile.held_balance || 0),
    pending_balance: Number(profile.pending_payout_balance || 0),
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    user: {
      full_name: profile.full_name,
      email: profile.email,
      avatar_url: profile.avatar_url,
      is_organizer: profile.is_organizer,
      is_artist: profile.is_artist,
      is_provider: profile.is_provider,
    },
  }
}
