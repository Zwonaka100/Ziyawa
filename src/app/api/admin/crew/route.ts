import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { listAdminCrew } from '@/lib/admin/crew'

// Listing logic lives in @/lib/admin/crew so the admin page can render it
// server-side. This route serves the client's re-queries on filter change.
export async function GET(request: NextRequest) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    const searchParams = request.nextUrl.searchParams
    const crew = await listAdminCrew({
      query: searchParams.get('q') || '',
      availability: searchParams.get('availability') || 'all',
      visibility: searchParams.get('visibility') || 'all',
    })

    return NextResponse.json({ crew })
  } catch (error) {
    console.error('Admin crew list error:', error)
    return NextResponse.json({ error: 'Failed to load crew profiles' }, { status: 500 })
  }
}
