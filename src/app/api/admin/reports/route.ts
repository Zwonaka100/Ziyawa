import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { listReports } from '@/lib/admin/reports-list'

export async function GET(request: NextRequest) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    const p = request.nextUrl.searchParams
    return NextResponse.json(
      await listReports({
        status: p.get('status') || 'all',
        type: p.get('type') || 'all',
        page: Number(p.get('page') || '1'),
      })
    )
  } catch (error) {
    console.error('Admin reports list error:', error)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}
