import { listRefundWorkItems } from '@/lib/admin/refunds'
import { AdminRefundsQueue } from './refunds-queue'

// 'new' matches the table's default status filter, so the server renders the
// same view the client would have fetched.
export default async function AdminRefundsPage() {
  const items = await listRefundWorkItems({ status: 'new' })

  return <AdminRefundsQueue initialItems={items} />
}
