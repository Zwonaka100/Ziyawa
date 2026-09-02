import { listAdminCrew } from '@/lib/admin/crew'
import { AdminCrewTable } from './crew-table'

export default async function AdminCrewPage() {
  const crew = await listAdminCrew()

  return <AdminCrewTable initialCrew={crew} />
}
