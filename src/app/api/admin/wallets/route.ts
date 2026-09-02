import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { loadWallets } from '@/lib/admin/wallets'

export async function GET(request: NextRequest) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    const p = request.nextUrl.searchParams
    return NextResponse.json(
      await loadWallets({
        balance: p.get('balance') || 'all',
        search: p.get('q') || '',
        page: Number(p.get('page') || '1'),
      })
    )
  } catch (error) {
    console.error('Admin wallets error:', error)
    return NextResponse.json({ error: 'Failed to load wallets' }, { status: 500 })
  }
}
