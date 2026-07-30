import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createBulkNotifications } from '@/lib/notifications'
import { sendCriticalEventChangeEmail } from '@/lib/email'
import { getEventEmailAudience } from '@/lib/event-email-audience'

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function formatTime(startTime?: string | null) {
  if (!startTime) return 'TBA'
  const [hours, minutes] = String(startTime).split(':')
  return `${hours}:${minutes}`
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({})) as { changes?: string[] }
    const changes = Array.isArray(body.changes) ? body.changes.filter((item) => typeof item === 'string' && item.trim().length > 0) : []

    if (changes.length === 0) {
      return NextResponse.json({ success: true, sentCount: 0, skipped: true })
    }

    const { data: event, error } = await supabaseAdmin
      .from('events')
      .select('id, title, organizer_id, state, event_date, start_time, venue, location')
      .eq('id', id)
      .single()

    if (error || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (event.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (event.state !== 'published') {
      return NextResponse.json({ success: true, sentCount: 0, skipped: true })
    }

    const audience = await getEventEmailAudience(id)
    const recipients = [...audience.attendees, ...audience.artists, ...audience.providers, ...audience.crew]
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.ziyawa.com'
    const eventDate = new Date(event.event_date).toLocaleDateString('en-ZA', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    const eventTime = formatTime(event.start_time)
    const eventLocation = event.venue || event.location || 'Venue to be confirmed'

    let sentCount = 0
    for (const recipient of recipients) {
      const result = await sendCriticalEventChangeEmail(recipient.email, {
        recipientName: recipient.name.split(' ')[0] || recipient.name,
        eventName: event.title,
        changes,
        eventDate,
        eventTime,
        eventLocation,
        actionUrl: `${appUrl}/events/${event.id}`,
      })

      if (result.success) {
        sentCount += 1
      }
    }

    const notifications = recipients
      .filter((recipient) => recipient.userId)
      .map((recipient) => ({
        userId: recipient.userId!,
        type: 'event_updated' as const,
        title: `Important update: ${event.title}`,
        message: `Important event details changed for ${event.title}. Please review the latest date, time, or venue information.`,
        link: `/events/${event.id}`,
        eventId: event.id,
        sendEmail: false,
      }))

    if (notifications.length > 0) {
      await createBulkNotifications(notifications)
    }

    return NextResponse.json({ success: true, sentCount })
  } catch (error) {
    console.error('Critical event update email error:', error)
    return NextResponse.json({ error: 'Failed to send critical event update' }, { status: 500 })
  }
}