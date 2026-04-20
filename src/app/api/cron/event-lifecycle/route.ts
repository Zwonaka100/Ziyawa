import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { eventFollowUpEmail, eventReminderEmail } from '@/lib/email-templates'
import { createBulkNotifications, type CreateNotificationParams } from '@/lib/notifications'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const INFO_FROM_EMAIL = process.env.INFO_FROM_EMAIL || 'Ziyawa <info@zande.io>'
const INFO_REPLY_TO = process.env.INFO_EMAIL || process.env.SUPPORT_EMAIL || 'support@zande.io'

function startOfDay(date: Date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
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

function diffInDays(from: Date, to: Date) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / (1000 * 60 * 60 * 24))
}

export async function GET(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent') || ''
    const secret = request.nextUrl.searchParams.get('secret')
    const cronSecret = process.env.CRON_SECRET

    if (process.env.NODE_ENV === 'production' && cronSecret && secret !== cronSecret && !userAgent.includes('vercel-cron')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = startOfDay(new Date())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data: events, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, title, event_date, start_time, venue, is_published')
      .gte('event_date', yesterday.toISOString().slice(0, 10))
      .lte('event_date', tomorrow.toISOString().slice(0, 10))
      .eq('is_published', true)

    if (eventError) {
      throw eventError
    }

    let processedEvents = 0
    let sentEmails = 0

    for (const event of events || []) {
      const eventDate = new Date(event.event_date)
      const dayDiff = diffInDays(today, eventDate)

      let subject = ''
      let campaignKey = ''
      let mode: 'reminder' | 'follow_up' | null = null

      if (dayDiff === 1) {
        subject = `Reminder: ${event.title} is tomorrow`
        campaignKey = `tomorrow-${event.id}-${today.toISOString().slice(0, 10)}`
        mode = 'reminder'
      } else if (dayDiff === 0) {
        subject = `Today: ${event.title} starts soon`
        campaignKey = `today-${event.id}-${today.toISOString().slice(0, 10)}`
        mode = 'reminder'
      } else if (dayDiff === -1) {
        subject = `Thanks for attending ${event.title}`
        campaignKey = `review-${event.id}-${today.toISOString().slice(0, 10)}`
        mode = 'follow_up'
      }

      if (!mode) continue

      const { data: existingLog } = await supabaseAdmin
        .from('email_logs')
        .select('id')
        .eq('subject', subject)
        .eq('email_type', 'automated')
        .like('body', `%${campaignKey}%`)
        .limit(1)
        .maybeSingle()

      if (existingLog?.id) {
        continue
      }

      const { data: tickets } = await supabaseAdmin
        .from('tickets')
        .select(`
          user_id,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('event_id', event.id)

      const recipients = new Map<string, { email: string; name: string; userId: string | null }>()
      for (const ticket of tickets || []) {
        const profile = Array.isArray(ticket.profiles) ? ticket.profiles[0] : ticket.profiles
        const email = profile?.email?.trim().toLowerCase()
        if (!email) continue
        if (!recipients.has(email)) {
          recipients.set(email, {
            email: profile.email,
            name: profile.full_name || 'there',
            userId: ticket.user_id,
          })
        }
      }

      if (recipients.size === 0) {
        continue
      }

      const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ziyawa.vercel.app'}/events/${event.id}`
      const discoverUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ziyawa.vercel.app'}/events`
      const formattedEventDate = new Date(event.event_date).toLocaleDateString('en-ZA', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      const formattedTime = formatEventTime(event.start_time)

      const notifications: CreateNotificationParams[] = []
      const recipientEmails: string[] = []
      const recipientIds: string[] = []

      for (const recipient of recipients.values()) {
        const firstName = recipient.name.split(' ')[0] || 'there'
        const html = mode === 'reminder'
          ? eventReminderEmail({
              recipientName: firstName,
              eventName: event.title,
              eventDate: formattedEventDate,
              eventTime: formattedTime,
              eventLocation: event.venue || 'Venue to be confirmed',
              eventUrl,
            })
          : eventFollowUpEmail({
              recipientName: firstName,
              eventName: event.title,
              eventDate: formattedEventDate,
              message: 'Thanks for showing up. Tell us how it went and discover what is coming next on Ziyawa.',
              reviewUrl: `${eventUrl}#reviews`,
              discoverUrl,
            })

        const result = await sendEmail({
          from: INFO_FROM_EMAIL,
          replyTo: INFO_REPLY_TO,
          to: recipient.email,
          subject,
          html,
          tags: [
            { name: 'category', value: 'event-lifecycle' },
            { name: 'mode', value: mode },
          ],
        })

        if (result.success) {
          sentEmails += 1
          recipientEmails.push(recipient.email)
          if (recipient.userId) {
            recipientIds.push(recipient.userId)
            notifications.push({
              userId: recipient.userId,
              type: mode === 'reminder' ? 'event_reminder' : 'review_requested',
              title: subject,
              message: mode === 'reminder'
                ? `${event.title} is coming up. Your ticket is ready in your dashboard.`
                : `Thanks for attending ${event.title}. Leave a review and discover more events.`,
              link: `/events/${event.id}`,
              eventId: event.id,
              sendEmail: false,
            })
          }
        }
      }

      if (notifications.length > 0) {
        await createBulkNotifications(notifications)
      }

      await supabaseAdmin.from('email_logs').insert({
        sender_id: null,
        recipient_ids: recipientIds,
        recipient_emails: recipientEmails,
        subject,
        body: `${campaignKey}\n${mode}`,
        email_type: 'automated',
        status: 'sent',
      })

      processedEvents += 1
    }

    return NextResponse.json({ success: true, processedEvents, sentEmails })
  } catch (error) {
    console.error('Event lifecycle cron error:', error)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
