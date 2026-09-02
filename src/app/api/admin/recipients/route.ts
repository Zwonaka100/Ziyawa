import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { listRecipients, loadRecipient } from '@/lib/admin/recipients'

export async function GET(request: NextRequest) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    const p = request.nextUrl.searchParams

    // Deep link from a user page: one recipient by id.
    const id = p.get('id')
    if (id) {
      return NextResponse.json({ recipient: await loadRecipient(id) })
    }

    const recipients = await listRecipients({
      role: p.get('role') || 'all',
      search: p.get('q') || '',
      limit: Number(p.get('limit') || '100'),
    })
    return NextResponse.json({ recipients })
  } catch (error) {
    console.error('Admin recipients error:', error)
    return NextResponse.json({ error: 'Failed to load recipients' }, { status: 500 })
  }
}
