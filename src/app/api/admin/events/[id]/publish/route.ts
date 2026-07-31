import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createBulkNotifications, createNotification } from '@/lib/notifications'
import { getEventEmailAudience } from '@/lib/event-email-audience'
import { sendEventCancelledEmail } from '@/lib/email'
import { SITE_URL } from '@/lib/constants'

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function runSideEffect(label: string, fn: () => Promise<void>) {
  try {
    await fn()
  } catch (error) {
    console.error(`Admin event side effect failed (${label}):`, error)
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

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, is_admin, admin_role')
      .eq('id', user.id)
      .single()

    const isAdmin = Boolean(profile?.is_admin || profile?.admin_role === 'admin' || profile?.admin_role === 'super_admin')

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({})) as {
      publish?: boolean
      reason?: string
      operation?: 'publish' | 'unpublish' | 'cancel' | 'delete'
      forceCancel?: boolean
    }
    const publish = Boolean(body.publish)
    const reason = String(body.reason || '').trim()
    const requestedOperation: 'publish' | 'unpublish' | 'cancel' | 'delete' =
      body.operation || (publish ? 'publish' : body.forceCancel ? 'cancel' : 'unpublish')

    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, title, organizer_id, state, is_published, tickets_sold')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (requestedOperation === 'publish') {
      if (event.state === 'completed' || event.state === 'cancelled' || event.state === 'locked') {
        return NextResponse.json({ error: `This event is ${event.state} and cannot be published.` }, { status: 400 })
      }

      const { error: publishError } = await supabaseAdmin
        .from('events')
        .update({
          state: 'published',
          is_published: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId)

      if (publishError) {
        return NextResponse.json({ error: publishError.message || 'Failed to publish event.' }, { status: 500 })
      }

      await runSideEffect('publish notification', async () => {
        await createNotification({
          userId: event.organizer_id,
          type: 'event_updated',
          title: `Admin published your event: ${event.title}`,
          message: 'Your event is now live and visible to groovists.',
          link: `/dashboard/organizer/events/${eventId}/manage`,
          eventId,
          sendEmail: true,
        })
      })

      await runSideEffect('publish audit log', async () => {
        await supabaseAdmin.from('admin_audit_logs').insert({
          admin_id: user.id,
          action: 'admin_event_publish',
          action_type: 'event_edit',
          target_type: 'event',
          target_id: eventId,
          details: { eventTitle: event.title },
        })
      })

      return NextResponse.json({ success: true, state: 'published', refundedTickets: 0 })
    }

    const soldTickets = Number(event.tickets_sold || 0)

    if (requestedOperation === 'delete' && soldTickets <= 0) {
      const deleteReason = reason || 'Removed by admin moderation.'

      await runSideEffect('delete notification', async () => {
        await createNotification({
          userId: event.organizer_id,
          type: 'event_updated',
          title: `Event removed by admin: ${event.title}`,
          message: deleteReason,
          link: '/dashboard/organizer',
          eventId,
          sendEmail: true,
        })
      })

      const { error: deleteError } = await supabaseAdmin
        .from('events')
        .delete()
        .eq('id', eventId)

      if (!deleteError) {
        await runSideEffect('delete audit log', async () => {
          await supabaseAdmin.from('admin_audit_logs').insert({
            admin_id: user.id,
            action: 'admin_event_delete',
            action_type: 'event_delete',
            target_type: 'event',
            target_id: eventId,
            details: {
              eventTitle: event.title,
              mode: 'hard_delete',
              reason: deleteReason,
            },
          })
        })

        return NextResponse.json({ success: true, state: 'deleted', deleted: true, refundedTickets: 0 })
      }

      console.warn('Hard delete failed, falling back to cancellation:', deleteError.message)
    }

    const shouldCancel = requestedOperation === 'cancel' || requestedOperation === 'delete' || soldTickets > 0

    if (shouldCancel) {
      const cancellationReason = reason || (soldTickets > 0
        ? 'Cancelled by admin moderation after ticket sales.'
        : requestedOperation === 'delete'
          ? 'Cancelled by admin because the event was removed from the platform.'
          : 'Cancelled by admin moderation.')
      const now = new Date().toISOString()

      const { error: cancelError } = await supabaseAdmin
        .from('events')
        .update({
          state: 'cancelled',
          is_published: false,
          cancelled_at: now,
          cancellation_reason: cancellationReason,
          updated_at: now,
        })
        .eq('id', eventId)

      if (cancelError) {
        return NextResponse.json({ error: 'Failed to cancel event' }, { status: 500 })
      }

      const { data: ticketTransactions, error: txError } = await supabaseAdmin
        .from('transactions')
        .select('id, payer_id, amount')
        .eq('event_id', eventId)
        .eq('type', 'ticket_purchase')
        .in('state', ['authorized', 'held', 'released', 'settled'])

      if (txError) {
        console.error('Refund source transaction query failed:', txError)
      }

      const refundRows = (ticketTransactions || [])
        .filter((txn) => txn.payer_id && Number(txn.amount || 0) > 0)
        .map((txn) => ({
          event_id: eventId,
          source_transaction_id: txn.id,
          user_id: txn.payer_id,
          amount_cents: Number(txn.amount || 0),
          reason_code: 'event_cancelled',
          status: 'new',
          requested_by: user.id,
          metadata: {
            source: 'admin_event_unpublish',
            reason: cancellationReason,
          },
        }))

      if (refundRows.length > 0) {
        await runSideEffect('refund work queue upsert', async () => {
          await supabaseAdmin
            .from('refund_work_items')
            .upsert(refundRows, { onConflict: 'source_transaction_id', ignoreDuplicates: true })
        })
      }

      let audience = {
        attendees: [] as Awaited<ReturnType<typeof getEventEmailAudience>>['attendees'],
        artists: [] as Awaited<ReturnType<typeof getEventEmailAudience>>['artists'],
        providers: [] as Awaited<ReturnType<typeof getEventEmailAudience>>['providers'],
        crew: [] as Awaited<ReturnType<typeof getEventEmailAudience>>['crew'],
      }
      try {
        audience = await getEventEmailAudience(eventId)
      } catch (error) {
        console.error('Failed to fetch event email audience:', error)
      }
      const eventDate = new Date(now).toLocaleDateString('en-ZA', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

      await Promise.allSettled([
        ...audience.attendees.map((recipient) => sendEventCancelledEmail(recipient.email, {
          recipientName: recipient.name.split(' ')[0] || recipient.name,
          eventName: event.title,
          eventDate,
          reason: cancellationReason,
          roleLabel: 'attendee' as const,
          actionLabel: 'Open My Tickets',
          actionUrl: `${SITE_URL}/dashboard/tickets`,
        })),
        ...audience.artists.map((recipient) => sendEventCancelledEmail(recipient.email, {
          recipientName: recipient.name.split(' ')[0] || recipient.name,
          eventName: event.title,
          eventDate,
          reason: cancellationReason,
          roleLabel: 'artist' as const,
          actionLabel: 'Open Artist Dashboard',
          actionUrl: `${SITE_URL}/dashboard/artist`,
        })),
        ...audience.providers.map((recipient) => sendEventCancelledEmail(recipient.email, {
          recipientName: recipient.name.split(' ')[0] || recipient.name,
          eventName: event.title,
          eventDate,
          reason: cancellationReason,
          roleLabel: 'provider' as const,
          actionLabel: 'Open Crew Dashboard',
          actionUrl: `${SITE_URL}/dashboard/provider`,
        })),
        ...audience.crew.map((recipient) => sendEventCancelledEmail(recipient.email, {
          recipientName: recipient.name.split(' ')[0] || recipient.name,
          eventName: event.title,
          eventDate,
          reason: cancellationReason,
          roleLabel: 'crew' as const,
          actionLabel: 'Open Crew Dashboard',
          actionUrl: `${SITE_URL}/dashboard/event-work`,
        })),
      ])

      const recipientNotifications = [
        ...audience.attendees,
        ...audience.artists,
        ...audience.providers,
        ...audience.crew,
      ]
        .filter((recipient) => recipient.userId)
        .map((recipient) => ({
          userId: recipient.userId!,
          type: 'event_cancelled' as const,
          title: `Event cancelled: ${event.title}`,
          message: `${event.title} has been cancelled by platform moderation. ${recipient.role === 'attendee' ? 'Refund processing will follow where applicable.' : 'Please review your dashboard for next steps.'}`,
          link: recipient.role === 'attendee' ? '/dashboard/tickets' : recipient.role === 'artist' ? '/dashboard/artist' : recipient.role === 'provider' ? '/dashboard/provider' : '/dashboard/event-work',
          eventId,
          sendEmail: false,
        }))

      if (recipientNotifications.length > 0) {
        await runSideEffect('cancel recipient notifications', async () => {
          await createBulkNotifications(recipientNotifications)
        })
      }

      await runSideEffect('cancel organizer notification', async () => {
        await createNotification({
          userId: event.organizer_id,
          type: 'event_cancelled',
          title: `Event cancelled by admin: ${event.title}`,
          message: `Your event was removed from public listings. ${refundRows.length} refund work item(s) were created for ticket buyers.`,
          link: `/dashboard/organizer/events/${eventId}/manage`,
          eventId,
          sendEmail: true,
        })
      })

      await runSideEffect('cancel audit log', async () => {
        await supabaseAdmin.from('admin_audit_logs').insert({
          admin_id: user.id,
          action: 'admin_event_force_unpublish_with_refunds',
          action_type: 'event_edit',
          target_type: 'event',
          target_id: eventId,
          details: {
            eventTitle: event.title,
            soldTickets,
            refundWorkItems: refundRows.length,
            reason: cancellationReason,
          },
        })
      })

      return NextResponse.json({
        success: true,
        state: 'cancelled',
        refundedTickets: refundRows.length,
        deleted: requestedOperation === 'delete' ? false : undefined,
      })
    }

    const { error: unpublishError } = await supabaseAdmin
      .from('events')
      .update({
        state: 'draft',
        is_published: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId)

    if (unpublishError) {
      return NextResponse.json({ error: unpublishError.message || 'Failed to unpublish event.' }, { status: 500 })
    }

    await runSideEffect('unpublish notification', async () => {
      await createNotification({
        userId: event.organizer_id,
        type: 'event_updated',
        title: `Admin unpublished your event: ${event.title}`,
        message: reason || 'Your event was removed from public listings by platform moderation.',
        link: `/dashboard/organizer/events/${eventId}/manage`,
        eventId,
        sendEmail: true,
      })
    })

    await runSideEffect('unpublish audit log', async () => {
      await supabaseAdmin.from('admin_audit_logs').insert({
        admin_id: user.id,
        action: 'admin_event_unpublish',
        action_type: 'event_edit',
        target_type: 'event',
        target_id: eventId,
        details: {
          eventTitle: event.title,
          reason: reason || null,
        },
      })
    })

    return NextResponse.json({ success: true, state: 'draft', refundedTickets: 0 })
  } catch (error) {
    console.error('Admin publish/unpublish error:', error)
    return NextResponse.json({ error: 'Failed to update event visibility.' }, { status: 500 })
  }
}
