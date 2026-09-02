/**
 * Review listing and tallies for admin, shared by the API route and the server
 * page. The page made three browser queries — the page of reviews, a read of
 * every review for the tiles, and a count of pending review reports. All three
 * now run together on the server.
 */

import { createAdminServiceClient } from '@/lib/admin-auth'

export const REVIEWS_PAGE_SIZE = 20

export interface ReviewStats {
  totalReviews: number
  averageRating: number
  hiddenReviews: number
  reportedReviews: number
}

export interface ReviewFilters {
  rating?: string
  visibility?: string
  search?: string
  page?: number
}

export async function loadReviews({
  rating = 'all',
  visibility = 'all',
  search = '',
  page = 1,
}: ReviewFilters = {}) {
  const supabaseAdmin = createAdminServiceClient()

  let listQuery = supabaseAdmin
    .from('reviews')
    .select(
      'id, user_id, event_id, rating, title, content, is_visible, is_verified_purchase, helpful_count, created_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  if (rating !== 'all') listQuery = listQuery.eq('rating', parseInt(rating))
  if (visibility === 'visible') listQuery = listQuery.eq('is_visible', true)
  else if (visibility === 'hidden') listQuery = listQuery.eq('is_visible', false)
  if (search) listQuery = listQuery.or(`content.ilike.%${search}%,title.ilike.%${search}%`)

  const from = (page - 1) * REVIEWS_PAGE_SIZE
  listQuery = listQuery.range(from, from + REVIEWS_PAGE_SIZE - 1)

  const [listResult, allReviews, pendingReports] = await Promise.all([
    listQuery,
    supabaseAdmin.from('reviews').select('rating, is_visible'),
    supabaseAdmin
      .from('reports')
      .select('id')
      .eq('reported_type', 'review')
      .eq('status', 'pending'),
  ])

  const all = allReviews.data || []
  const totalReviews = all.length
  const totalRating = all.reduce((sum, row) => sum + Number(row.rating || 0), 0)

  const stats: ReviewStats = {
    totalReviews,
    averageRating: totalReviews > 0 ? Math.round((totalRating / totalReviews) * 10) / 10 : 0,
    hiddenReviews: all.filter((row) => row.is_visible === false).length,
    reportedReviews: (pendingReports.data || []).length,
  }

  return {
    reviews: listResult.error ? [] : listResult.data || [],
    totalCount: listResult.error ? 0 : listResult.count || 0,
    stats,
  }
}
