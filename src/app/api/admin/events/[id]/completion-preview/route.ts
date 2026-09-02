import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { loadCompletionBreakdown } from '@/lib/admin/completion-breakdown'

/**
 * Read-only. Shows an admin exactly what completing an event would release,
 * what it earned, and what it cost, before anything is approved.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    const { id } = await params
    const breakdown = await loadCompletionBreakdown(id)
    if (!breakdown) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    return NextResponse.json(breakdown)
  } catch (error) {
    console.error('Completion preview error:', error)
    return NextResponse.json({ error: 'Failed to load completion breakdown' }, { status: 500 })
  }
}
