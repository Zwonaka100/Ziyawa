import { listReports } from '@/lib/admin/reports-list'
import { AdminReportsTable } from './reports-table'

export default async function AdminReportsPage() {
  const { reports, totalCount } = await listReports()

  return <AdminReportsTable initialReports={reports as never} initialTotalCount={totalCount} />
}
