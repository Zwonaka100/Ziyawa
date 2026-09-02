import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { listAuditLogs } from '@/lib/admin/audit-logs'

export async function GET(request: NextRequest) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    const p = request.nextUrl.searchParams
    return NextResponse.json(
      await listAuditLogs({
        action: p.get('action') || 'all',
        entity: p.get('entity') || 'all',
        page: Number(p.get('page') || '1'),
      })
    )
  } catch (error) {
    console.error('Admin audit logs error:', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
