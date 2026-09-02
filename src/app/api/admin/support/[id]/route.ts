import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { loadSupportTicket } from '@/lib/admin/support-detail'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    const { id } = await params
    return NextResponse.json(await loadSupportTicket(id))
  } catch (error) {
    console.error('Admin support ticket error:', error)
    return NextResponse.json({ error: 'Failed to load ticket' }, { status: 500 })
  }
}
