import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { loadReportDetail } from '@/lib/admin/reports'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    const { id } = await params
    return NextResponse.json(await loadReportDetail(id))
  } catch (error) {
    console.error('Admin report detail error:', error)
    return NextResponse.json({ error: 'Failed to load report' }, { status: 500 })
  }
}
