import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { listSupportTickets } from '@/lib/admin/support'

export async function GET(request: NextRequest) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    const p = request.nextUrl.searchParams
    return NextResponse.json(
      await listSupportTickets({
        status: p.get('status') || 'all',
        category: p.get('category') || 'all',
        page: Number(p.get('page') || '1'),
      })
    )
  } catch (error) {
    console.error('Admin support list error:', error)
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
  }
}
