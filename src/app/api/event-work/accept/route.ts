import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { EVENT_TEAM_ROLE_LABELS } from '@/lib/event-team'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await request.json()
    const inviteToken = String(token || '').trim()

    if (!inviteToken) {
      return NextResponse.json({ error: 'Invite token is required' }, { status: 400 })
    }

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('event_team_invites')
      .select('id, event_id, email, full_name, phone, role, status, expires_at')
      .eq('invite_token', inviteToken)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invite not found or has expired' }, { status: 404 })
    }

    if (invite.status === 'accepted') {
      return NextResponse.json({ success: true, alreadyAccepted: true, eventId: invite.event_id })
    }

    if (invite.status === 'revoked') {
      return NextResponse.json({ error: 'This invite has been revoked' }, { status: 400 })
    }

    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'This invite has expired' }, { status: 400 })
    }

    if (user.email?.toLowerCase() !== String(invite.email).toLowerCase()) {
      return NextResponse.json({ error: 'Please sign in with the invited email address' }, { status: 403 })
    }

    const now = new Date().toISOString()

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone, location')
      .eq('id', user.id)
      .maybeSingle()

    await supabaseAdmin
      .from('profiles')
      .update({ is_provider: true, updated_at: now })
      .eq('id', user.id)

    const roleLabel = EVENT_TEAM_ROLE_LABELS[invite.role as keyof typeof EVENT_TEAM_ROLE_LABELS] || 'Event Crew'
    const activationNote = 'Activated through an organiser staff invite on Ziyawa.'

    const { data: existingCrewProfile } = await supabaseAdmin
      .from('providers')
      .select('*')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (existingCrewProfile) {
      const existingRoles = Array.isArray(existingCrewProfile.work_roles) ? existingCrewProfile.work_roles : []
      const workUpdate = {
        work_mode: existingCrewProfile.work_mode === 'offering_services' ? 'both' : (existingCrewProfile.work_mode || 'looking_for_work'),
        work_roles: Array.from(new Set([...existingRoles, roleLabel])),
        availability_notes: existingCrewProfile.availability_notes || activationNote,
        is_available: true,
        updated_at: now,
      }

      let { error: providerError } = await supabaseAdmin
        .from('providers')
        .update(workUpdate)
        .eq('id', existingCrewProfile.id)

      if (providerError && /work_mode|work_roles|availability_notes/i.test(String(providerError.message || ''))) {
        const fallback = await supabaseAdmin
          .from('providers')
          .update({ is_available: true, updated_at: now })
          .eq('id', existingCrewProfile.id)

        providerError = fallback.error || null
      }

      if (providerError) {
        throw providerError
      }
    } else {
      const baseCrewProfile = {
        profile_id: user.id,
        business_name: String(profile?.full_name || invite.full_name || user.email?.split('@')[0] || 'Crew Member').trim(),
        description: 'Available for event work on Ziyawa.',
        primary_category: 'event_staff',
        location: profile?.location || 'gauteng',
        business_phone: invite.phone || profile?.phone || null,
        business_email: user.email || invite.email,
        website: null,
        is_available: true,
        advance_notice_days: 0,
      }

      const workEnabledProfile = {
        ...baseCrewProfile,
        work_mode: 'looking_for_work',
        work_roles: [roleLabel],
        availability_notes: activationNote,
      }

      let { error: providerError } = await supabaseAdmin
        .from('providers')
        .insert(workEnabledProfile)

      if (providerError && /work_mode|work_roles|availability_notes/i.test(String(providerError.message || ''))) {
        const fallback = await supabaseAdmin
          .from('providers')
          .insert(baseCrewProfile)

        providerError = fallback.error || null
      }

      if (providerError) {
        throw providerError
      }
    }

    const { error: upsertError } = await supabaseAdmin
      .from('event_team_members')
      .upsert({
        event_id: invite.event_id,
        user_id: user.id,
        role: invite.role,
        status: 'active',
        invite_id: invite.id,
        expires_at: invite.expires_at,
        created_at: now,
        updated_at: now,
      }, { onConflict: 'event_id,user_id' })

    if (upsertError) {
      throw upsertError
    }

    await supabaseAdmin
      .from('event_team_invites')
      .update({
        status: 'accepted',
        accepted_by: user.id,
        accepted_at: now,
        updated_at: now,
      })
      .eq('id', invite.id)

    return NextResponse.json({ success: true, eventId: invite.event_id })
  } catch (error) {
    console.error('Crew invite accept error:', error)
    return NextResponse.json({ error: 'Failed to activate crew access' }, { status: 500 })
  }
}
