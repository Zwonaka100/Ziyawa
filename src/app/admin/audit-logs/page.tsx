import { listAuditLogs } from '@/lib/admin/audit-logs'
import { AuditLogsTable } from './audit-logs-table'

export default async function AuditLogsPage() {
  const { logs, totalCount } = await listAuditLogs()

  return <AuditLogsTable initialLogs={logs as never} initialTotalCount={totalCount} />
}
