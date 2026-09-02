import { loadTransactions } from '@/lib/admin/transactions'
import { AdminTransactionsTable } from './transactions-table'

export default async function AdminTransactionsPage() {
  // Completed only by default; the table can ask for the rest.
  const { transactions, totalCount, stats } = await loadTransactions()

  return (
    <AdminTransactionsTable
      initialTransactions={transactions as never}
      initialTotalCount={totalCount}
      initialStats={stats}
    />
  )
}
