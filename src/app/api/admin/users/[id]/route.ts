/**
 * ADMIN USER MODERATION
 * PATCH /api/admin/users/[id]  { suspend?: boolean, ban?: boolean }
 *
 * Suspending and banning used to be written straight from the browser against
 * the profiles table, which only worked because RLS lets an admin update any
 * row. Moving it here means the page no longer needs write access to other
 * people's profiles from the client, and the action is recorded.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi, createAdminServiceClient } from '@/lib/admin-auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    const { id } = await params
    const body = (await request.json()) as { suspend?: boolean; ban?: boolean }

    // An admin removing their own access is almost never intended, and locking
    // yourself out of admin is not a recoverable mistake from inside the app.
    if (id === gate.admin.userId) {
      return NextResponse.json(
        { error: 'You cannot suspend or ban your own account' },
        { status: 400 }
      )
    }

    const update: Record<string, unknown> = {}
    const now = new Date().toISOString()

    if (typeof body.suspend === 'boolean') {
      update.is_suspended = body.suspend
      update.suspended_at = body.suspend ? now : null
    }
    if (typeof body.ban === 'boolean') {
      update.is_banned = body.ban
      update.banned_at = body.ban ? now : null
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const supabaseAdmin = createAdminServiceClient()
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(update)
      .eq('id', id)
      .select('id, is_suspended, is_banned')
      .single()

    if (error) {
      console.error('Admin user moderation error:', error)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    return NextResponse.json({ user: data })
  } catch (error) {
    console.error('Admin user moderation error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
