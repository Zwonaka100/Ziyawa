import { listSupportTickets } from '@/lib/admin/support'
import { AdminSupportTable } from './support-table'

export default async function AdminSupportPage() {
  const { tickets, totalCount, statusCounts } = await listSupportTickets()

  return (
    <AdminSupportTable
      initialTickets={tickets as never}
      initialTotalCount={totalCount}
      initialStatusCounts={statusCounts}
    />
  )
}
