import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { listEmailTemplates } from '@/lib/admin/email-templates'

export async function GET(request: NextRequest) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    const category = request.nextUrl.searchParams.get('category') || 'all'
    return NextResponse.json({ templates: await listEmailTemplates(category) })
  } catch (error) {
    console.error('Admin email templates error:', error)
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 })
  }
}
