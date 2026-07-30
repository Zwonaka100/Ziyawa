import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type ArtistRow = {
  id: string
  profile_id: string
  stage_name: string
  genre: string
  location: string
  base_price: number
  is_available: boolean
  is_public: boolean
  total_bookings: number
  average_rating: number
  created_at: string
  profiles: {
    full_name: string | null
    email: string
    is_suspended: boolean
    is_banned: boolean
  } | {
    full_name: string | null
    email: string
    is_suspended: boolean
    is_banned: boolean
  }[] | null
}

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin, admin_role')
    .eq('id', user.id)
    .single()

  const isAdmin = Boolean(profile?.is_admin || profile?.admin_role === 'admin' || profile?.admin_role === 'super_admin')

  if (!isAdmin) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true as const, userId: user.id }
}

export async function GET(request: NextRequest) {
  try {
    const access = await assertAdmin()
    if (!access.ok) return access.response

    const searchParams = request.nextUrl.searchParams
    const query = (searchParams.get('q') || '').trim().toLowerCase()
    const availability = searchParams.get('availability') || 'all'
    const visibility = searchParams.get('visibility') || 'all'

    const { data, error } = await supabaseAdmin
      .from('artists')
      .select('id, profile_id, stage_name, genre, location, base_price, is_available, is_public, total_bookings, average_rating, created_at, profiles:profile_id(full_name, email, is_suspended, is_banned)')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch artist profiles' }, { status: 500 })
    }

    let rows: ArtistRow[] = (data || []) as ArtistRow[]

    if (availability === 'available') {
      rows = rows.filter((row) => row.is_available)
    } else if (availability === 'paused') {
      rows = rows.filter((row) => !row.is_available)
    }

    if (visibility === 'public') {
      rows = rows.filter((row) => row.is_public)
    } else if (visibility === 'hidden') {
      rows = rows.filter((row) => !row.is_public)
    }

    const normalized = rows
      .map((row) => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
        return {
          ...row,
          profile,
        }
      })
      .filter((row) => {
        if (!query) return true
        const haystack = [
          row.stage_name,
          row.genre,
          row.profile?.full_name || '',
          row.profile?.email || '',
        ].join(' ').toLowerCase()

        return haystack.includes(query)
      })

    return NextResponse.json({ artists: normalized })
  } catch (error) {
    console.error('Admin artists list error:', error)
    return NextResponse.json({ error: 'Failed to load artist profiles' }, { status: 500 })
  }
}
