import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { loadEmailHistory } from '@/lib/admin/email-history'

export async function GET(request: NextRequest) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    const p = request.nextUrl.searchParams
    return NextResponse.json(
      await loadEmailHistory({
        status: p.get('status') || 'all',
        type: p.get('type') || 'all',
        search: p.get('q') || '',
        page: Number(p.get('page') || '1'),
      })
    )
  } catch (error) {
    console.error('Admin email history error:', error)
    return NextResponse.json({ error: 'Failed to load email history' }, { status: 500 })
  }
}
