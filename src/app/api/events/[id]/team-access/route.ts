import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getEventAccessForUser, getEventRoleLabel } from '@/lib/event-team'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await getEventAccessForUser(supabaseAdmin, eventId, user.id)

    if (!access.event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!access.isOwner && !access.isTeamMember) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    return NextResponse.json({
      event: access.event,
      isOwner: access.isOwner,
      isTeamMember: access.isTeamMember,
      role: access.role,
      roleLabel: getEventRoleLabel(access.role),
      permissions: access.permissions,
      status: access.status,
    })
  } catch (error) {
    console.error('Team access lookup error:', error)
    return NextResponse.json({ error: 'Failed to load access' }, { status: 500 })
  }
}
