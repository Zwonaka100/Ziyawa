import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { listVerificationRequests, type VerificationStatus } from '@/lib/admin/verifications'

export async function GET(request: NextRequest) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    const status = (request.nextUrl.searchParams.get('status') || 'pending') as VerificationStatus
    return NextResponse.json({ requests: await listVerificationRequests(status) })
  } catch (error) {
    console.error('Admin verifications list error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load verification requests' },
      { status: 500 }
    )
  }
}
