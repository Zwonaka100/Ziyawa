import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { EVENT_TEAM_ROLE_LABELS } from '@/lib/event-team'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const INFO_FROM_EMAIL = process.env.INFO_FROM_EMAIL || 'Ziyawa <info@zande.io>'

function isMissingTableError(error: { code?: string } | null | undefined) {
  return Boolean(error && (error.code === 'PGRST205' || error.code === '42P01'))
}

async function getOwnedEvent(eventId: string, userId: string) {
  const { data: event, error } = await supabaseAdmin
    .from('events')
    .select('id, title, event_date, venue, organizer_id')
    .eq('id', eventId)
    .single()

  if (error || !event) {
    return { event: null, response: NextResponse.json({ error: 'Event not found' }, { status: 404 }) }
  }

  if (event.organizer_id !== userId) {
    return { event: null, response: NextResponse.json({ error: 'Not authorized' }, { status: 403 }) }
  }

  return { event, response: null }
}

async function ensureEventMember(eventId: string, memberId: string) {
  const { data: member, error } = await supabaseAdmin
    .from('event_team_members')
    .select('id, user_id, role, status')
    .eq('id', memberId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return member
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await getOwnedEvent(eventId, user.id)
    if (access.response || !access.event) {
      return access.response as NextResponse
    }

    const [membersResult, invitesResult, shiftsResult, paymentsResult] = await Promise.all([
      supabaseAdmin
        .from('event_team_members')
        .select('id, user_id, role, status, created_at, expires_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('event_team_invites')
        .select('id, email, full_name, phone, role, status, created_at, expires_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('event_team_shifts')
        .select('id, member_id, shift_title, work_date, hours_worked, notes, status, created_at')
        .eq('event_id', eventId)
        .order('work_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('event_team_payments')
        .select('id, member_id, amount, currency, payment_method, notes, status, paid_at, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false }),
    ])

    if (membersResult.error && !isMissingTableError(membersResult.error)) throw membersResult.error
    if (invitesResult.error && !isMissingTableError(invitesResult.error)) throw invitesResult.error
    if (shiftsResult.error && !isMissingTableError(shiftsResult.error)) throw shiftsResult.error
    if (paymentsResult.error && !isMissingTableError(paymentsResult.error)) throw paymentsResult.error

    const safeMembers = membersResult.data || []
    const safeInvites = invitesResult.data || []
    const safeShifts = isMissingTableError(shiftsResult.error) ? [] : (shiftsResult.data || [])
    const safePayments = isMissingTableError(paymentsResult.error) ? [] : (paymentsResult.data || [])

    const memberUserIds = Array.from(new Set(safeMembers.map((member) => member.user_id).filter(Boolean)))
    const { data: profiles, error: profilesError } = memberUserIds.length > 0
      ? await supabaseAdmin.from('profiles').select('id, full_name, email, phone').in('id', memberUserIds)
      : { data: [], error: null }

    if (profilesError) {
      throw profilesError
    }

    const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]))
    const membersById = new Map(safeMembers.map((member) => [member.id, member]))

    return NextResponse.json({
      event: access.event,
      members: safeMembers.map((member) => {
        const profile = profilesById.get(member.user_id)
        return {
          id: member.id,
          role: member.role,
          roleLabel: EVENT_TEAM_ROLE_LABELS[member.role as keyof typeof EVENT_TEAM_ROLE_LABELS] || 'Event Team',
          status: member.status,
          fullName: profile?.full_name || 'Team member',
          email: profile?.email || '',
          phone: profile?.phone || '',
          createdAt: member.created_at,
          expiresAt: member.expires_at,
          kind: 'member' as const,
        }
      }),
      invites: safeInvites.map((invite) => ({
        id: invite.id,
        role: invite.role,
        roleLabel: EVENT_TEAM_ROLE_LABELS[invite.role as keyof typeof EVENT_TEAM_ROLE_LABELS] || 'Event Team',
        status: invite.status,
        fullName: invite.full_name,
        email: invite.email,
        phone: invite.phone || '',
        createdAt: invite.created_at,
        expiresAt: invite.expires_at,
        kind: 'invite' as const,
      })),
      shifts: safeShifts.map((shift) => {
        const member = membersById.get(shift.member_id)
        const profile = member ? profilesById.get(member.user_id) : null
        return {
          id: shift.id,
          memberId: shift.member_id,
          fullName: profile?.full_name || 'Team member',
          roleLabel: member ? EVENT_TEAM_ROLE_LABELS[member.role as keyof typeof EVENT_TEAM_ROLE_LABELS] || 'Event Team' : 'Event Team',
          shiftTitle: shift.shift_title,
          workDate: shift.work_date,
          hoursWorked: Number(shift.hours_worked || 0),
          notes: shift.notes || '',
          status: shift.status,
          createdAt: shift.created_at,
        }
      }),
      payments: safePayments.map((payment) => {
        const member = membersById.get(payment.member_id)
        const profile = member ? profilesById.get(member.user_id) : null
        return {
          id: payment.id,
          memberId: payment.member_id,
          fullName: profile?.full_name || 'Team member',
          roleLabel: member ? EVENT_TEAM_ROLE_LABELS[member.role as keyof typeof EVENT_TEAM_ROLE_LABELS] || 'Event Team' : 'Event Team',
          amount: Number(payment.amount || 0),
          currency: payment.currency || 'ZAR',
          paymentMethod: payment.payment_method || 'cash',
          notes: payment.notes || '',
          status: payment.status,
          paidAt: payment.paid_at,
          createdAt: payment.created_at,
        }
      }),
    })
  } catch (error) {
    console.error('Team access load error:', error)
    return NextResponse.json({ error: 'Failed to load event team' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await getOwnedEvent(eventId, user.id)
    if (access.response || !access.event) {
      return access.response as NextResponse
    }

    const body = await request.json()
    const action = String(body.action || 'invite')

    if (action === 'revokeMember') {
      const memberId = String(body.memberId || '').trim()
      if (!memberId) {
        return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
      }

      await supabaseAdmin
        .from('event_team_members')
        .update({ status: 'revoked', revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', memberId)
        .eq('event_id', eventId)

      return NextResponse.json({ success: true })
    }

    if (action === 'revokeInvite') {
      const inviteId = String(body.inviteId || '').trim()
      if (!inviteId) {
        return NextResponse.json({ error: 'Invite ID is required' }, { status: 400 })
      }

      await supabaseAdmin
        .from('event_team_invites')
        .update({ status: 'revoked', updated_at: new Date().toISOString() })
        .eq('id', inviteId)
        .eq('event_id', eventId)

      return NextResponse.json({ success: true })
    }

    if (action === 'saveShift') {
      const memberId = String(body.memberId || '').trim()
      const shiftTitle = String(body.shiftTitle || '').trim()
      const workDate = String(body.workDate || '').trim()
      const hoursWorked = Number(body.hoursWorked || 0)
      const notes = String(body.notes || '').trim()
      const status = String(body.status || 'worked').trim()

      if (!memberId || !shiftTitle || !workDate) {
        return NextResponse.json({ error: 'Staff member, work title, and date are required' }, { status: 400 })
      }

      if (!['scheduled', 'worked', 'cancelled'].includes(status)) {
        return NextResponse.json({ error: 'Invalid work status selected' }, { status: 400 })
      }

      const member = await ensureEventMember(eventId, memberId)
      if (!member) {
        return NextResponse.json({ error: 'Staff member not found for this event' }, { status: 404 })
      }

      const { error } = await supabaseAdmin
        .from('event_team_shifts')
        .insert({
          event_id: eventId,
          member_id: memberId,
          created_by: user.id,
          shift_title: shiftTitle,
          work_date: workDate,
          hours_worked: Number.isFinite(hoursWorked) ? hoursWorked : 0,
          notes: notes || null,
          status,
        })

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'deleteShift') {
      const shiftId = String(body.shiftId || '').trim()
      if (!shiftId) {
        return NextResponse.json({ error: 'Work log ID is required' }, { status: 400 })
      }

      const { error } = await supabaseAdmin
        .from('event_team_shifts')
        .delete()
        .eq('id', shiftId)
        .eq('event_id', eventId)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'recordPayment') {
      const memberId = String(body.memberId || '').trim()
      const amount = Number(body.amount || 0)
      const paymentMethod = String(body.paymentMethod || 'cash').trim()
      const notes = String(body.notes || '').trim()
      const status = String(body.status || 'planned').trim()

      if (!memberId || !Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: 'A valid staff member and amount are required' }, { status: 400 })
      }

      if (!['planned', 'paid'].includes(status)) {
        return NextResponse.json({ error: 'Invalid payment status selected' }, { status: 400 })
      }

      const member = await ensureEventMember(eventId, memberId)
      if (!member) {
        return NextResponse.json({ error: 'Staff member not found for this event' }, { status: 404 })
      }

      const { error } = await supabaseAdmin
        .from('event_team_payments')
        .insert({
          event_id: eventId,
          member_id: memberId,
          recorded_by: user.id,
          amount,
          currency: 'ZAR',
          payment_method: paymentMethod,
          notes: notes || null,
          status,
          paid_at: status === 'paid' ? new Date().toISOString() : null,
        })

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'markPaymentPaid') {
      const paymentId = String(body.paymentId || '').trim()
      if (!paymentId) {
        return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 })
      }

      const { error } = await supabaseAdmin
        .from('event_team_payments')
        .update({ status: 'paid', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', paymentId)
        .eq('event_id', eventId)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    const email = String(body.email || '').trim().toLowerCase()
    const fullName = String(body.fullName || '').trim()
    const phone = String(body.phone || '').trim()
    const role = String(body.role || 'door_staff').trim()
    const offeredRate = Number(body.offeredRate || 0)
    const inviteMessage = String(body.inviteMessage || '').trim()

    if (!email || !fullName) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    const validRoles = Object.keys(EVENT_TEAM_ROLE_LABELS)
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid team role selected' }, { status: 400 })
    }

    const { data: existingInvite } = await supabaseAdmin
      .from('event_team_invites')
      .select('id, invite_token, status, expires_at')
      .eq('event_id', eventId)
      .eq('email', email)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: matchingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (matchingProfile?.id) {
      const { data: existingMember } = await supabaseAdmin
        .from('event_team_members')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('user_id', matchingProfile.id)
        .in('status', ['active', 'completed'])
        .maybeSingle()

      if (existingMember) {
        return NextResponse.json({ error: 'This person already has event access' }, { status: 400 })
      }
    }

    const inviteToken = existingInvite?.invite_token || crypto.randomUUID()
    const expiresAt = existingInvite?.expires_at || new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString()
    const now = new Date().toISOString()

    if (!existingInvite) {
      const { error: insertError } = await supabaseAdmin
        .from('event_team_invites')
        .insert({
          event_id: eventId,
          invited_by: user.id,
          email,
          full_name: fullName,
          phone: phone || null,
          role,
          status: 'pending',
          invite_token: inviteToken,
          expires_at: expiresAt,
          created_at: now,
          updated_at: now,
        })

      if (insertError) {
        throw insertError
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const invitePath = `/dashboard/event-work/accept?token=${encodeURIComponent(inviteToken)}`
    const inviteUrl = `${appUrl}${invitePath}`
    const roleLabel = EVENT_TEAM_ROLE_LABELS[role as keyof typeof EVENT_TEAM_ROLE_LABELS]

    const offerLine = Number.isFinite(offeredRate) && offeredRate > 0
      ? `<p><strong>Proposed rate:</strong> R${offeredRate.toFixed(2)}</p>`
      : ''

    const noteLine = inviteMessage
      ? `<p><strong>Message from organiser:</strong><br/>${inviteMessage}</p>`
      : ''

    await sendEmail({
      from: INFO_FROM_EMAIL,
      to: email,
      subject: `You have been invited to join the crew for ${access.event.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin-bottom: 12px;">You have a crew invite</h2>
          <p>Hello ${fullName},</p>
          <p>You have been invited to join the Ziyawa event team for <strong>${access.event.title}</strong>.</p>
          <p><strong>Role:</strong> ${roleLabel}</p>
          <p><strong>Date:</strong> ${new Date(access.event.event_date).toLocaleDateString('en-ZA')}</p>
          <p><strong>Venue:</strong> ${access.event.venue || 'Venue to be confirmed'}</p>
          ${offerLine}
          ${noteLine}
          <p>You can accept this invite, or sign in and use Ziyawa messages to discuss details with the organiser.</p>
          <p style="margin: 20px 0;">
            <a href="${inviteUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 8px; background: #7c3aed; color: white; text-decoration: none; font-weight: 600;">Activate Crew Dashboard</a>
          </p>
          <p>If you do not have a Ziyawa account yet, create one with this email first and then open the invite again.</p>
        </div>
      `,
      text: `You have been invited to join the crew for ${access.event.title} as ${roleLabel}.${offeredRate > 0 ? ` Proposed rate: R${offeredRate.toFixed(2)}.` : ''}${inviteMessage ? ` Message from organiser: ${inviteMessage}.` : ''} Open this link to activate your access: ${inviteUrl}`,
      tags: [{ name: 'category', value: 'event-team-invite' }],
    })

    return NextResponse.json({ success: true, inviteUrl, resent: Boolean(existingInvite) })
  } catch (error) {
    console.error('Team access invite error:', error)

    if (isMissingTableError(error as { code?: string })) {
      return NextResponse.json(
        { error: 'This staff feature needs the latest database migration applied first.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to manage event team' }, { status: 500 })
  }
}
