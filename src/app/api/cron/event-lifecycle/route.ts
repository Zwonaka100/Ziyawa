import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SITE_URL } from '@/lib/constants'
import { sendEmail, sendOrganizerWhatWentDownEmail } from '@/lib/email'
import { eventFollowUpEmail, eventReminderEmail, organizerCompleteEventReminderEmail } from '@/lib/email-templates'
import { createBulkNotifications, type CreateNotificationParams } from '@/lib/notifications'
import { formatMoneyExact } from '@/lib/helpers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const INFO_FROM_EMAIL = process.env.INFO_FROM_EMAIL || 'Ziyawa <info@ziyawa.com>'
const INFO_REPLY_TO = process.env.INFO_EMAIL || process.env.SUPPORT_EMAIL || 'support@ziyawa.com'

function startOfDay(date: Date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

/**
 * Calendar date (YYYY-MM-DD) in the server's own timezone.
 *
 * Do NOT use `startOfDay(d).toISOString().slice(0, 10)` for this: startOfDay
 * snaps to *local* midnight, and toISOString() then converts to UTC, which
 * rolls back a day for any timezone ahead of UTC (e.g. SAST/UTC+2 turns
 * 30 Aug into "2026-08-29"). That mismatch breaks the email dedupe keys below
 * and can cause duplicate sends when the job runs outside UTC.
 */
function toDateKey(date: Date) {
  const value = startOfDay(date)
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${value.getFullYear()}-${month}-${day}`
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

const ACCOUNTS_FROM_EMAIL = process.env.ACCOUNTS_FROM_EMAIL || 'Ziyawa Accounts <accounts@ziyawa.com>'

/**
 * Is an organizer due a "mark your event complete" nudge today?
 * Daily for the first 5 days after the event, then every 3rd day up to day 35,
 * then every 5th day. Returns false before the event has happened.
 */
function isCompletionReminderDue(daysSinceEvent: number): boolean {
  if (daysSinceEvent < 1) return false
  if (daysSinceEvent <= 5) return true
  if (daysSinceEvent <= 35) return (daysSinceEvent - 5) % 3 === 0
  return (daysSinceEvent - 35) % 5 === 0
}

interface CompletionReminderOutcome {
  eventId: string
  eventTitle: string
  organizerEmail: string
  daysSinceEvent: number
  amountPendingRands: number
  isVerified: boolean
  sent: boolean
  skippedReason?: string
}

/**
 * Nudges organizers whose past events were never marked complete — the reason
 * ticket revenue can sit unsettled indefinitely. Runs in dry-run mode unless
 * ORGANIZER_COMPLETION_REMINDERS_ENABLED is explicitly "true", so the cadence
 * can be inspected before a single email goes out.
 */
async function runCompletionReminders(
  today: Date,
  dryRun: boolean
): Promise<CompletionReminderOutcome[]> {
  const outcomes: CompletionReminderOutcome[] = []

  const { data: pastEvents } = await supabaseAdmin
    .from('events')
    .select('id, title, event_date, state, organizer_id')
    .eq('is_published', true)
    .lt('event_date', toDateKey(today))

  // Filter states in JS rather than via a PostgREST `not.in` filter, whose
  // quoting rules are easy to get subtly wrong (a malformed filter silently
  // matches nothing rather than erroring).
  const staleEvents = (pastEvents || []).filter(
    (event) => event.state !== 'completed' && event.state !== 'cancelled'
  )

  for (const event of staleEvents) {
    const daysSinceEvent = diffInDays(new Date(event.event_date), today)
    if (!isCompletionReminderDue(daysSinceEvent)) continue
    if (!event.organizer_id) continue

    const { data: organizer } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, is_verified')
      .eq('id', event.organizer_id)
      .maybeSingle()

    if (!organizer?.email) continue

    // Only chase events that actually have money waiting.
    const { data: heldTransactions } = await supabaseAdmin
      .from('transactions')
      .select('net_amount, amount')
      .eq('event_id', event.id)
      .eq('state', 'held')

    const amountPendingRands = (heldTransactions || []).reduce(
      (sum, tx) => sum + Number(tx.net_amount || tx.amount || 0) / 100,
      0
    )

    if (amountPendingRands <= 0) continue

    const campaignKey = `complete-reminder-${event.id}-${toDateKey(today)}`
    const subject = `Action needed: mark ${event.title} as complete`

    const { data: existingLog } = await supabaseAdmin
      .from('email_logs')
      .select('id')
      .eq('subject', subject)
      .eq('email_type', 'automated')
      .like('body', `%${campaignKey}%`)
      .limit(1)
      .maybeSingle()

    if (existingLog?.id) {
      outcomes.push({
        eventId: event.id,
        eventTitle: event.title,
        organizerEmail: organizer.email,
        daysSinceEvent,
        amountPendingRands,
        isVerified: Boolean(organizer.is_verified),
        sent: false,
        skippedReason: 'already sent today',
      })
      continue
    }

    const outcome: CompletionReminderOutcome = {
      eventId: event.id,
      eventTitle: event.title,
      organizerEmail: organizer.email,
      daysSinceEvent,
      amountPendingRands,
      isVerified: Boolean(organizer.is_verified),
      sent: false,
    }

    if (dryRun) {
      outcome.skippedReason = 'dry run — sending disabled'
      outcomes.push(outcome)
      continue
    }

    const result = await sendEmail({
      from: ACCOUNTS_FROM_EMAIL,
      // Keep the reply-to on the same accounts alias this was sent from.
      replyTo: process.env.ACCOUNTS_EMAIL || 'accounts@ziyawa.com',
      to: organizer.email,
      subject,
      html: organizerCompleteEventReminderEmail({
        recipientName: (organizer.full_name || 'there').split(' ')[0],
        eventName: event.title,
        eventDate: new Date(event.event_date).toLocaleDateString('en-ZA', {
          weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
        }),
        amountPending: formatMoneyExact(amountPendingRands),
        manageUrl: `${SITE_URL}/dashboard/organizer/events/${event.id}/manage`,
        isVerified: Boolean(organizer.is_verified),
        verifyUrl: `${SITE_URL}/dashboard/settings?tab=verification`,
      }),
      tags: [
        { name: 'category', value: 'event-lifecycle' },
        { name: 'mode', value: 'completion-reminder' },
      ],
    })

    if (result.success) {
      outcome.sent = true
      await supabaseAdmin.from('email_logs').insert({
        sender_id: null,
        recipient_ids: [organizer.id],
        recipient_emails: [organizer.email],
        subject,
        body: `${campaignKey}\ncompletion-reminder`,
        email_type: 'automated',
        status: 'sent',
      })
    } else {
      outcome.skippedReason = 'send failed'
    }

    outcomes.push(outcome)
  }

  return outcomes
}

export async function GET(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent') || ''
    const secret = request.nextUrl.searchParams.get('secret')
    const cronSecret = process.env.CRON_SECRET

    if (process.env.NODE_ENV === 'production' && cronSecret && secret !== cronSecret && !userAgent.includes('vercel-cron')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Safety: this job sends live email to real users. Running it anywhere
    // other than production (e.g. a local dev server pointed at the live DB)
    // would send duplicates, so default to reporting what *would* be sent.
    // Set CRON_ALLOW_SEND=true to override outside production.
    const canSendEmail =
      process.env.NODE_ENV === 'production' || process.env.CRON_ALLOW_SEND === 'true'

    const today = startOfDay(new Date())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data: events, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, title, event_date, start_time, venue, is_published, organizer_id')
      .gte('event_date', toDateKey(yesterday))
      .lte('event_date', toDateKey(tomorrow))
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
        campaignKey = `tomorrow-${event.id}-${toDateKey(today)}`
        mode = 'reminder'
      } else if (dayDiff === 0) {
        subject = `Today: ${event.title} starts soon`
        campaignKey = `today-${event.id}-${toDateKey(today)}`
        mode = 'reminder'
      } else if (dayDiff === -1) {
        subject = `Thanks for attending ${event.title}`
        campaignKey = `review-${event.id}-${toDateKey(today)}`
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

      const eventUrl = `${SITE_URL}/events/${event.id}`
      const discoverUrl = `${SITE_URL}/events`
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

        const result = canSendEmail
          ? await sendEmail({
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
          : { success: false, error: 'dry run — sending disabled outside production' }

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

      if (mode === 'follow_up' && event.organizer_id) {
        const { data: organizerProfile } = await supabaseAdmin
          .from('profiles')
          .select('id, email, full_name')
          .eq('id', event.organizer_id)
          .maybeSingle()

        if (organizerProfile?.email && canSendEmail) {
          await sendOrganizerWhatWentDownEmail(organizerProfile.email, {
            recipientName: organizerProfile.full_name || 'there',
            eventName: event.title,
            eventDate: formattedEventDate,
            eventId: event.id,
          })
        }
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

    // Chase organizers whose past events were never marked complete. Disabled
    // (dry-run) unless explicitly enabled, so the cadence can be reviewed first.
    const remindersEnabled =
      process.env.ORGANIZER_COMPLETION_REMINDERS_ENABLED === 'true' && canSendEmail
    const completionReminders = await runCompletionReminders(today, !remindersEnabled)

    return NextResponse.json({
      success: true,
      processedEvents,
      sentEmails,
      completionReminders: {
        enabled: remindersEnabled,
        due: completionReminders.length,
        sent: completionReminders.filter((r) => r.sent).length,
        details: completionReminders,
      },
    })
  } catch (error) {
    console.error('Event lifecycle cron error:', error)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
