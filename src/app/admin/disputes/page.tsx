import { listOpenDisputes } from '@/lib/admin/disputes'
import { AdminDisputesTable } from './disputes-table'

export default async function AdminDisputesPage() {
  const disputes = await listOpenDisputes()

  return <AdminDisputesTable initialDisputes={disputes} />
}
