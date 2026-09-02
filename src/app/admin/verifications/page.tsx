import { listVerificationRequests } from '@/lib/admin/verifications'
import { AdminVerificationsQueue } from './verifications-queue'

// 'pending' matches the queue's default filter, so the server renders the same
// view the client would have fetched.
export default async function AdminVerificationsPage() {
  const rows = await listVerificationRequests('pending')

  return <AdminVerificationsQueue initialRows={rows as never} />
}
