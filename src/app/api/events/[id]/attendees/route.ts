import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { getEventAccessForUser } from '@/lib/event-team'
import { eventUpdateEmail, eventFollowUpEmail, eventReminderEmail } from '@/lib/email-templates'
import { createBulkNotifications, type CreateNotificationParams } from '@/lib/notifications'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const INFO_FROM_EMAIL = process.env.INFO_FROM_EMAIL || 'Ziyawa <info@zande.io>'
const INFO_REPLY_TO = process.env.INFO_EMAIL || process.env.SUPPORT_EMAIL || 'support@zande.io'

type AudienceFilter = 'all' | 'paid' | 'guest_list' | 'checked_in' | 'not_checked_in'
type CampaignType = 'event_update' | 'event_reminder' | 'review_request'

interface UnifiedAttendee {
  id: string
  source: 'ticket' | 'guest_pass'
  userId: string | null
  name: string
  email: string | null
  phone: string | null
  code: string
  entryType: string
  checkedIn: boolean
  checkedInAt: string | null
  createdAt: string
  pricePaid: number
  buyerName?: string | null
  buyerEmail?: string | null
  claimedAt?: string | null
  deliveryStatus?: string | null
}

function formatEventTime(startTime?: string | null) {
  if (!startTime) return 'TBA'
  try {
    return new Date(`1970-01-01T${startTime}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return startTime
  }
}

async function getAuthorizedEvent(eventId: string, userId: string) {
  const access = await getEventAccessForUser(supabaseAdmin, eventId, userId)

  if (!access.event) {
    return { event: null, access, response: NextResponse.json({ error: 'Event not found' }, { status: 404 }) }
  }

  if (!access.isOwner && !access.permissions.canViewAttendees) {
    return { event: null, access, response: NextResponse.json({ error: 'Not authorized' }, { status: 403 }) }
  }

  return { event: access.event, access, response: null }
}

async function loadAttendees(_supabase: Awaited<ReturnType<typeof createClient>>, eventId: string) {
  let tickets: Record<string, unknown>[] = []

  const { data: enrichedTickets, error: enrichedTicketError } = await supabaseAdmin
    .from('tickets')
    .select('id, user_id, ticket_code, ticket_type, price_paid, is_used, used_at, created_at, buyer_name, buyer_email, attendee_name, attendee_email, attendee_phone, claimed_at, delivery_status')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (enrichedTicketError) {
    const { data: fallbackTickets, error: fallbackTicketError } = await supabaseAdmin
      .from('tickets')
      .select('id, user_id, ticket_code, ticket_type, price_paid, is_used, used_at, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (fallbackTicketError) {
      throw fallbackTicketError
    }

    tickets = fallbackTickets || []
  } else {
    tickets = enrichedTickets || []
  }

  const userIds = Array.from(new Set((tickets || []).map((ticket) => ticket.user_id as string | undefined).filter(Boolean)))
  const { data: profiles, error: profilesError } = userIds.length > 0
    ? await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', userIds)
    : { data: [], error: null }

  if (profilesError) {
    throw profilesError
  }

  const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]))

  const { data: passes, error: passError } = await supabaseAdmin
    .from('event_access_passes')
    .select('id, full_name, email, phone, code, pass_type, checked_in, checked_in_at, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (passError && passError.code !== 'PGRST205') {
    throw passError
  }

  const paidAttendees: UnifiedAttendee[] = (tickets || []).map((ticket) => {
    const profile = profilesById.get(String(ticket.user_id || ''))
    const buyerName = String(ticket.buyer_name || profile?.full_name || 'Ticket Buyer')
    const buyerEmail = ticket.buyer_email ? String(ticket.buyer_email) : (profile?.email || null)
    const attendeeName = String(ticket.attendee_name || profile?.full_name || buyerName)
    const attendeeEmail = ticket.attendee_email ? String(ticket.attendee_email) : (profile?.email || buyerEmail)
    const attendeePhone = ticket.attendee_phone ? String(ticket.attendee_phone) : (profile?.phone || null)

    return {
      id: String(ticket.id),
      source: 'ticket',
      userId: ticket.user_id ? String(ticket.user_id) : null,
      name: attendeeName,
      email: attendeeEmail,
      phone: attendeePhone,
      code: String(ticket.ticket_code || ''),
      entryType: String(ticket.ticket_type || 'General Admission'),
      checkedIn: Boolean(ticket.is_used),
      checkedInAt: ticket.used_at ? String(ticket.used_at) : null,
      createdAt: String(ticket.created_at || new Date().toISOString()),
      pricePaid: Number(ticket.price_paid || 0),
      buyerName,
      buyerEmail,
      claimedAt: ticket.claimed_at ? String(ticket.claimed_at) : null,
      deliveryStatus: ticket.delivery_status ? String(ticket.delivery_status) : null,
    }
  })

  const guestAttendees: UnifiedAttendee[] = (passes || []).map((pass) => ({
    id: pass.id,
    source: 'guest_pass',
    userId: null,
    name: pass.full_name || 'Guest',
    email: pass.email || null,
    phone: pass.phone || null,
    code: pass.code,
    entryType: pass.pass_type || 'guest_list',
    checkedIn: Boolean(pass.checked_in),
    checkedInAt: pass.checked_in_at || null,
    createdAt: pass.created_at,
    pricePaid: 0,
  }))

  const attendees = [...paidAttendees, ...guestAttendees].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const uniqueBuyers = new Set(
    paidAttendees.map((attendee) => attendee.userId || attendee.buyerEmail || attendee.email || attendee.code)
  ).size

  const stats = {
    totalPeople: attendees.length,
    paidTickets: paidAttendees.length,
    guestPasses: guestAttendees.length,
    checkedIn: attendees.filter((attendee) => attendee.checkedIn).length,
    pendingArrival: attendees.filter((attendee) => !attendee.checkedIn).length,
    uniqueBuyers,
    emailableContacts: new Set(
      attendees
        .map((attendee) => attendee.email?.trim().toLowerCase())
        .filter(Boolean)
    ).size,
  }

  return { attendees, stats }
}

function filterAudience(attendees: UnifiedAttendee[], audience: AudienceFilter) {
  switch (audience) {
    case 'paid':
      return attendees.filter((attendee) => attendee.source === 'ticket')
    case 'guest_list':
      return attendees.filter((attendee) => attendee.source === 'guest_pass')
    case 'checked_in':
      return attendees.filter((attendee) => attendee.checkedIn)
    case 'not_checked_in':
      return attendees.filter((attendee) => !attendee.checkedIn)
    default:
      return attendees
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await context.params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authorized = await getAuthorizedEvent(eventId, user.id)
    if (authorized.response || !authorized.event) {
      return authorized.response as NextResponse
    }

    const { attendees, stats } = await loadAttendees(supabase, eventId)

    return NextResponse.json({
      event: authorized.event,
      attendees,
      stats,
    })
  } catch (error) {
    console.error('Attendees load error:', error)
    return NextResponse.json({ error: 'Failed to load attendees' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await context.params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authorized = await getAuthorizedEvent(eventId, user.id)
    if (authorized.response || !authorized.event) {
      return authorized.response as NextResponse
    }

    if (!authorized.access.isOwner && !authorized.access.permissions.canSendEventUpdates) {
      return NextResponse.json({ error: 'Not authorized to send event updates' }, { status: 403 })
    }

    const body = await request.json()
    const subject = String(body.subject || '').trim()
    const message = String(body.message || '').trim()
    const audience = (body.audience || 'all') as AudienceFilter
    const campaignType = (body.campaignType || 'event_update') as CampaignType

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
    }

    const { attendees } = await loadAttendees(supabase, eventId)
    const filtered = filterAudience(attendees, audience)

    const recipients = new Map<string, { email: string; name: string; userId: string | null }>()
    for (const attendee of filtered) {
      const normalizedEmail = attendee.email?.trim().toLowerCase()
      if (!normalizedEmail) continue
      if (!recipients.has(normalizedEmail)) {
        recipients.set(normalizedEmail, {
          email: attendee.email!,
          name: attendee.name,
          userId: attendee.userId,
        })
      }
    }

    const recipientList = Array.from(recipients.values())
    if (recipientList.length === 0) {
      return NextResponse.json({ error: 'No attendees with email addresses match this filter' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ziyawa.vercel.app'
    const eventUrl = `${appUrl}/events/${eventId}`
    const formattedEventDate = authorized.event.event_date
      ? new Date(authorized.event.event_date).toLocaleDateString('en-ZA', {
          weekday: 'short',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'TBA'
    const formattedEventTime = formatEventTime(authorized.event.start_time)

    let sentCount = 0
    let failedCount = 0
    const notifications: CreateNotificationParams[] = []

    for (const recipient of recipientList) {
      const firstName = recipient.name?.split(' ')[0] || 'there'

      let html = ''
      let notificationType: 'event_updated' | 'event_reminder' | 'review_requested' = 'event_updated'

      if (campaignType === 'event_reminder') {
        notificationType = 'event_reminder'
        html = eventReminderEmail({
          recipientName: firstName,
          eventName: authorized.event.title,
          eventDate: formattedEventDate,
          eventTime: formattedEventTime,
          eventLocation: authorized.event.venue || 'Venue to be confirmed',
          eventUrl,
        })
      } else if (campaignType === 'review_request') {
        notificationType = 'review_requested'
        html = eventFollowUpEmail({
          recipientName: firstName,
          eventName: authorized.event.title,
          eventDate: formattedEventDate,
          message,
          reviewUrl: `${eventUrl}#reviews`,
          discoverUrl: `${appUrl}/events`,
        })
      } else {
        notificationType = 'event_updated'
        html = eventUpdateEmail({
          recipientName: firstName,
          eventName: authorized.event.title,
          eventDate: formattedEventDate,
          eventTime: formattedEventTime,
          eventLocation: authorized.event.venue || 'Venue to be confirmed',
          message,
          eventUrl,
        })
      }

      const emailResult = await sendEmail({
        from: INFO_FROM_EMAIL,
        replyTo: INFO_REPLY_TO,
        to: recipient.email,
        subject,
        html,
        tags: [
          { name: 'category', value: 'event-attendees' },
          { name: 'campaign', value: campaignType },
        ],
      })

      if (emailResult.success) {
        sentCount += 1
        if (recipient.userId) {
          notifications.push({
            userId: recipient.userId,
            type: notificationType,
            title: subject,
            message,
            link: `/events/${eventId}`,
            eventId,
            sendEmail: false,
          })
        }
      } else {
        failedCount += 1
      }
    }

    if (notifications.length > 0) {
      await createBulkNotifications(notifications)
    }

    try {
      await supabaseAdmin.from('email_logs').insert({
        sender_id: user.id,
        recipient_ids: notifications.map((item) => item.userId),
        recipient_emails: recipientList.map((item) => item.email),
        subject,
        body: message,
        email_type: campaignType === 'review_request' ? 'automated' : 'bulk',
        status: failedCount === 0 ? 'sent' : sentCount > 0 ? 'pending' : 'failed',
      })
    } catch (logError) {
      console.error('Email log insert error:', logError)
    }

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      audience,
    })
  } catch (error) {
    console.error('Attendee email send error:', error)
    return NextResponse.json({ error: 'Failed to send attendee email' }, { status: 500 })
  }
}
