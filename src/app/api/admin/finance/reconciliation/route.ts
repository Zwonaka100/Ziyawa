import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { loadReconciliation } from '@/lib/admin/reconciliation'

// The queries live in @/lib/admin/reconciliation so the admin page renders them
// server-side. This route is kept for any client-side refresh.
export async function GET() {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    return NextResponse.json(await loadReconciliation())
  } catch (error) {
    console.error('Admin finance reconciliation GET error:', error)
    return NextResponse.json({ error: 'Failed to load reconciliation dashboard' }, { status: 500 })
  }
}
