import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { loadReviews } from '@/lib/admin/reviews'

export async function GET(request: NextRequest) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    const p = request.nextUrl.searchParams
    return NextResponse.json(
      await loadReviews({
        rating: p.get('rating') || 'all',
        visibility: p.get('visibility') || 'all',
        search: p.get('q') || '',
        page: Number(p.get('page') || '1'),
      })
    )
  } catch (error) {
    console.error('Admin reviews error:', error)
    return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 })
  }
}
