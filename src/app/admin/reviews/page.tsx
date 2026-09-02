import { loadReviews } from '@/lib/admin/reviews'
import { AdminReviewsTable } from './reviews-table'

export default async function AdminReviewsPage() {
  const { reviews, totalCount, stats } = await loadReviews()

  return (
    <AdminReviewsTable
      initialReviews={reviews as never}
      initialTotalCount={totalCount}
      initialStats={stats}
    />
  )
}
