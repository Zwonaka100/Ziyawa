import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { loadTransactions } from '@/lib/admin/transactions'

export async function GET(request: NextRequest) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    const p = request.nextUrl.searchParams
    return NextResponse.json(
      await loadTransactions({
        type: p.get('type') || 'all',
        status: p.get('status') || 'all',
        search: p.get('q') || '',
        page: Number(p.get('page') || '1'),
      })
    )
  } catch (error) {
    console.error('Admin transactions error:', error)
    return NextResponse.json({ error: 'Failed to load transactions' }, { status: 500 })
  }
}
