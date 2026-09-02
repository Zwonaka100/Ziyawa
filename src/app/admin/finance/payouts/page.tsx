import { loadPayoutQueue } from '@/lib/admin/payouts'
import { AdminPayoutsQueue, type PayoutRow } from './payouts-queue'

// The queue and the live Paystack balance are resolved here, during render,
// rather than fetched by the browser after the page has already arrived.
// Reads the live Paystack balance, so it can never be a static page.
export const dynamic = 'force-dynamic'

export default async function AdminPayoutsPage() {
  const { requests, paystackBalanceRands } = await loadPayoutQueue('pending')

  return (
    <AdminPayoutsQueue
      initialRows={requests as unknown as PayoutRow[]}
      initialBalance={paystackBalanceRands}
    />
  )
}
