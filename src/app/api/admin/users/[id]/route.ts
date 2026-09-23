/**
 * ADMIN USER ACTIONS
 * PATCH /api/admin/users/[id]
 *
 *   { suspend: boolean, reason?: string }
 *   { ban: boolean, reason?: string }        (the detail page requires a reason; the list's quick ban doesn't)
 *   { verify: boolean }
 *   { adminRole: 'support' | 'moderator' | 'admin' | 'super_admin' | null }   super_admin only
 *   { warn: { reason: string, severity: 'minor' | 'moderate' | 'severe' } }
 *   { profile: { full_name?, phone?, location?, is_organizer? } }
 *
 * Every admin change to another user's profile goes through here, on the
 * service-role key. The admin screens used to write profiles straight from the
 * browser, but RLS only lets a user update their own row, so those writes
 * matched zero rows and reported success while changing nothing — suspend, ban,
 * verify, role changes, warnings counts and the edit form all silently no-op'd.
 * 040 now also blocks those columns from any browser session.
 *
 * Each action is written to admin_audit_logs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi, createAdminServiceClient } from '@/lib/admin-auth'

const ADMIN_ROLES = ['support', 'moderator', 'admin', 'super_admin'] as const
const WARNING_SEVERITIES = ['minor', 'moderate', 'severe'] as const
const PROVINCES = [
  'gauteng', 'western_cape', 'kwazulu_natal', 'eastern_cape', 'free_state',
  'mpumalanga', 'limpopo', 'north_west', 'northern_cape',
] as const

interface ActionBody {
  suspend?: boolean
  ban?: boolean
  reason?: string
  verify?: boolean
  adminRole?: string | null
  warn?: { reason?: string; severity?: string }
  profile?: {
    full_name?: string | null
    phone?: string | null
    location?: string | null
    is_organizer?: boolean
  }
}

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const cleanText = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  try {
    const { id } = await params
    const body = (await request.json()) as ActionBody
    const supabaseAdmin = createAdminServiceClient()
    const now = new Date().toISOString()

    // An admin removing their own access is almost never intended, and locking
    // yourself out of admin is not a recoverable mistake from inside the app.
    const touchesAccess =
      typeof body.suspend === 'boolean' || typeof body.ban === 'boolean' || 'adminRole' in body
    if (touchesAccess && id === gate.admin.userId) {
      return bad('You cannot change access on your own account')
    }

    const update: Record<string, unknown> = {}
    let actionType = 'user_edit'
    const details: Record<string, unknown> = {}

    if (typeof body.suspend === 'boolean') {
      update.is_suspended = body.suspend
      update.suspended_at = body.suspend ? now : null
      update.suspension_reason = body.suspend ? cleanText(body.reason) : null
      actionType = 'user_suspend'
      details.suspend = body.suspend
    }

    if (typeof body.ban === 'boolean') {
      update.is_banned = body.ban
      update.banned_at = body.ban ? now : null
      update.ban_reason = body.ban ? cleanText(body.reason) : null
      actionType = 'user_ban'
      details.ban = body.ban
    }

    if (typeof body.verify === 'boolean') {
      update.is_verified = body.verify
      update.verified_at = body.verify ? now : null
      details.verify = body.verify
    }

    if ('adminRole' in body) {
      // Granting admin is the most sensitive thing this route does. Only a
      // super_admin may hand out or take away admin roles.
      if (gate.admin.adminRole !== 'super_admin') {
        return bad('Only a super admin can change admin roles', 403)
      }
      const role = body.adminRole ?? null
      if (role !== null && !ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])) {
        return bad('Unknown admin role')
      }
      update.admin_role = role
      update.is_admin = role !== null
      details.adminRole = role
    }

    if (body.profile) {
      const p = body.profile
      if ('full_name' in p) update.full_name = cleanText(p.full_name)
      if ('phone' in p) update.phone = cleanText(p.phone)
      if ('location' in p) {
        const location = cleanText(p.location)
        if (location && !PROVINCES.includes(location as (typeof PROVINCES)[number])) {
          return bad('Unknown province')
        }
        update.location = location
      }
      if (typeof p.is_organizer === 'boolean') update.is_organizer = p.is_organizer
      details.profileFields = Object.keys(p)
    }

    if (body.warn) {
      const reason = cleanText(body.warn.reason)
      const severity = body.warn.severity ?? 'minor'
      if (!reason) return bad('A reason is required to issue a warning')
      if (!WARNING_SEVERITIES.includes(severity as (typeof WARNING_SEVERITIES)[number])) {
        return bad('Unknown warning severity')
      }

      const { error: warnError } = await supabaseAdmin.from('user_warnings').insert({
        user_id: id,
        issued_by: gate.admin.userId,
        reason,
        severity,
      })
      if (warnError) {
        console.error('Admin warning insert error:', warnError)
        return bad('Failed to issue warning', 500)
      }

      const { data: current } = await supabaseAdmin
        .from('profiles')
        .select('warnings_count')
        .eq('id', id)
        .single()
      update.warnings_count = Number(current?.warnings_count || 0) + 1
      actionType = 'user_warn'
      details.warn = { severity }
    }

    if (Object.keys(update).length === 0) {
      return bad('Nothing to update')
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(update)
      .eq('id', id)
      .select('id, is_suspended, is_banned, is_verified, admin_role, warnings_count')
      .single()

    if (error) {
      console.error('Admin user action error:', error)
      return bad('Failed to update user', 500)
    }

    const { error: auditError } = await supabaseAdmin.from('admin_audit_logs').insert({
      admin_id: gate.admin.userId,
      action: actionType,
      action_type: actionType,
      target_type: 'user',
      target_id: id,
      details,
    })
    if (auditError) console.error('Admin audit log error:', auditError)

    return NextResponse.json({ user: data })
  } catch (error) {
    console.error('Admin user action error:', error)
    return bad('Failed to update user', 500)
  }
}
