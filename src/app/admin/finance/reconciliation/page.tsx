import { loadReconciliation } from '@/lib/admin/reconciliation'
import { AdminReconciliationView } from './reconciliation-view'

export default async function AdminFinanceReconciliationPage() {
  const { daily, exceptions } = await loadReconciliation()

  return (
    <AdminReconciliationView
      daily={daily as never}
      failedPayouts={exceptions.failedPayouts as never}
      failedRefunds={exceptions.failedRefunds as never}
      refundQueue={exceptions.openRefundQueue as never}
    />
  )
}
