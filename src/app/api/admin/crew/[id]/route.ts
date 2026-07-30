import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await assertAdmin()
    if (!access.ok) return access.response

    const { id } = await params
    const body = await request.json().catch(() => ({})) as {
      isPublic?: boolean
      isAvailable?: boolean
    }

    const updates: Record<string, unknown> = {}
    if (typeof body.isPublic === 'boolean') updates.is_public = body.isPublic
    if (typeof body.isAvailable === 'boolean') updates.is_available = body.isAvailable

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid update fields provided' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('providers')
      .update(updates)
      .eq('id', id)
      .select('id, is_public, is_available')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to update crew profile' }, { status: 500 })
    }

    await supabaseAdmin
      .from('admin_audit_logs')
      .insert({
        admin_id: access.userId,
        action: 'admin_crew_profile_update',
        action_type: 'user_edit',
        target_type: 'crew_profile',
        target_id: id,
        details: updates,
      })

    return NextResponse.json({ success: true, crew: data })
  } catch (error) {
    console.error('Admin crew update error:', error)
    return NextResponse.json({ error: 'Failed to update crew profile' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await assertAdmin()
    if (!access.ok) return access.response

    const { id } = await params

    const { count: activeBookingsCount, error: activeBookingsError } = await supabaseAdmin
      .from('provider_bookings')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', id)
      .in('state', ['pending', 'accepted', 'confirmed', 'disputed'])

    if (activeBookingsError) {
      return NextResponse.json({ error: 'Failed to validate crew bookings' }, { status: 500 })
    }

    if ((activeBookingsCount || 0) > 0) {
      return NextResponse.json(
        { error: 'Cannot remove crew profile with active bookings. Hide the profile instead.' },
        { status: 409 }
      )
    }

    const { error } = await supabaseAdmin
      .from('providers')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to remove crew profile' }, { status: 500 })
    }

    await supabaseAdmin
      .from('admin_audit_logs')
      .insert({
        admin_id: access.userId,
        action: 'admin_crew_profile_delete',
        action_type: 'user_edit',
        target_type: 'crew_profile',
        target_id: id,
        details: { mode: 'hard_delete' },
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin crew delete error:', error)
    return NextResponse.json({ error: 'Failed to remove crew profile' }, { status: 500 })
  }
}
