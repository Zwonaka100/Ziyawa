import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { listAdminEvents, DEFAULT_EVENTS_PAGE_SIZE } from '@/lib/admin/events'

export async function GET(request: NextRequest) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    const p = request.nextUrl.searchParams
    const result = await listAdminEvents({
      search: p.get('q') || '',
      lifecycle: p.get('lifecycle') || 'all',
      state: p.get('state') || 'all',
      organizer: p.get('organizer') || 'all',
      dateFrom: p.get('date_from') || '',
      dateTo: p.get('date_to') || '',
      sortBy: p.get('sort') || 'created_at',
      sortDirection: (p.get('dir') || 'desc') as 'asc' | 'desc',
      page: Number(p.get('page') || '1'),
      pageSize: Number(p.get('page_size') || DEFAULT_EVENTS_PAGE_SIZE),
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Admin events list error:', error)
    return NextResponse.json({ error: 'Failed to load events' }, { status: 500 })
  }
}
