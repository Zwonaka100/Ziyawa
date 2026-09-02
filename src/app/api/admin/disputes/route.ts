import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { listOpenDisputes } from '@/lib/admin/disputes'

export async function GET() {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    return NextResponse.json({ disputes: await listOpenDisputes() })
  } catch (error) {
    console.error('Admin disputes list error:', error)
    return NextResponse.json({ error: 'Failed to load disputes' }, { status: 500 })
  }
}
