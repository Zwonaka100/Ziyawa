import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { listAdminUsers } from '@/lib/admin/users'

export async function GET(request: NextRequest) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    const params = request.nextUrl.searchParams
    const result = await listAdminUsers({
      search: params.get('q') || '',
      role: params.get('role') || 'all',
      status: params.get('status') || 'all',
      page: Number(params.get('page') || '1'),
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Admin users list error:', error)
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
  }
}
