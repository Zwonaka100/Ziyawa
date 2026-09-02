import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { loadAdminEventDetail } from '@/lib/admin/event-detail'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    const { id } = await params
    return NextResponse.json(await loadAdminEventDetail(id))
  } catch (error) {
    console.error('Admin event detail error:', error)
    return NextResponse.json({ error: 'Failed to load event' }, { status: 500 })
  }
}
