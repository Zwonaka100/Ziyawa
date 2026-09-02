import { loadEmailHistory } from '@/lib/admin/email-history'
import { AdminEmailHistoryTable } from './history-table'

export default async function AdminEmailHistoryPage() {
  const { emails, totalCount, stats } = await loadEmailHistory()

  return (
    <AdminEmailHistoryTable
      initialEmails={emails as never}
      initialTotalCount={totalCount}
      initialStats={stats}
    />
  )
}
