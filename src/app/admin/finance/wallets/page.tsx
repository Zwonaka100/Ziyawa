import { loadWallets, mapProfileToWallet, type WalletProfileRow } from '@/lib/admin/wallets'
import { AdminWalletsTable } from './wallets-table'

export default async function AdminWalletsPage() {
  const { profiles, totalCount, stats } = await loadWallets()

  return (
    <AdminWalletsTable
      initialWallets={(profiles as unknown as WalletProfileRow[]).map(mapProfileToWallet)}
      initialTotalCount={totalCount}
      initialStats={stats}
    />
  )
}
