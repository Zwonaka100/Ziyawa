import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { listAdminArtists } from '@/lib/admin/artists'

// The listing itself lives in @/lib/admin/artists so the admin page can render
// it server-side instead of fetching it after the page has already loaded.
// This route remains for the client's re-queries when filters change.
export async function GET(request: NextRequest) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    const searchParams = request.nextUrl.searchParams
    const artists = await listAdminArtists({
      query: searchParams.get('q') || '',
      availability: searchParams.get('availability') || 'all',
      visibility: searchParams.get('visibility') || 'all',
    })

    return NextResponse.json({ artists })
  } catch (error) {
    console.error('Admin artists list error:', error)
    return NextResponse.json({ error: 'Failed to load artist profiles' }, { status: 500 })
  }
}
