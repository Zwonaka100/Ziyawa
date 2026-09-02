import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { loadPlatformSettings } from '@/lib/admin/settings'

export async function GET() {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    return NextResponse.json({ settings: await loadPlatformSettings() })
  } catch (error) {
    console.error('Admin settings error:', error)
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }
}
