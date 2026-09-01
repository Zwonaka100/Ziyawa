import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type ProviderRow = {
  id: string
  profile_id: string
  business_name: string
  primary_category: string
  work_mode?: string | null
  location: string
  is_available?: boolean
  is_public?: boolean
  total_bookings?: number
  average_rating?: number
  created_at: string
  profile?: {
    full_name: string | null
    email: string
    is_suspended?: boolean
    is_banned?: boolean
  } | null
}

async function assertAdmin() {
  const gate = await requireAdminApi()
  if ('response' in gate) return { ok: false as const, response: gate.response }
  return { ok: true as const, userId: gate.admin.userId }
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
      .from('providers')
      .select('id, profile_id, business_name, primary_category, work_mode, location, is_available, is_public, total_bookings, average_rating, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch crew profiles' }, { status: 500 })
    }

    let rows: ProviderRow[] = (data || []) as ProviderRow[]

    if (rows.length > 0) {
      const profileIds = rows.map((row) => row.profile_id).filter(Boolean)
      if (profileIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, email, is_suspended, is_banned')
          .in('id', profileIds)

        if (!profilesError && profilesData) {
          const profileMap = new Map(profilesData.map((profile) => [profile.id, profile]))
          rows = rows.map((row) => ({
            ...row,
            profile: profileMap.get(row.profile_id) || null,
          }))
        }
      }
    }

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
      .filter((row) => {
        if (!query) return true
        const haystack = [
          row.business_name,
          row.primary_category,
          row.work_mode || '',
          row.profile?.full_name || '',
          row.profile?.email || '',
        ].join(' ').toLowerCase()

        return haystack.includes(query)
      })

    return NextResponse.json({ crew: normalized })
  } catch (error) {
    console.error('Admin crew list error:', error)
    return NextResponse.json({ error: 'Failed to load crew profiles' }, { status: 500 })
  }
}
