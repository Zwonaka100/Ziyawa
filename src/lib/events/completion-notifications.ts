/**
 * What happens after an organiser marks their event complete.
 *
 * Before this, completing an event notified nobody. No email to the organiser,
 * no in-app notification, and nothing telling admin that money had just become
 * claimable. The organiser pressed a button, got a toast, and then heard
 * nothing ever again — which is a large part of why completion felt like it
 * didn't work even once the database stopped rejecting it.
 *
 * Every failure in here is swallowed and logged. By the time this runs the
 * event is already completed and committed; a mail provider being down must
 * never turn a successful completion into an error the organiser sees.
 */

import { loadCompletionBreakdown } from '@/lib/admin/completion-breakdown'
import { createAdminServiceClient } from '@/lib/admin-auth'
import { sendAdminAlertEmail, sendEventCompletedEmail } from '@/lib/email'
import { adminEventCompletedEmail } from '@/lib/email-templates'
import { SITE_URL } from '@/lib/constants'
import { createNotification } from '@/lib/notifications'
import { formatMoneyExact } from '@/lib/helpers'

function formatDay(value: string | null | undefined): string {
  if (!value) return 'shortly'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'shortly'
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function notifyEventCompleted(options: {
  eventId: string
  completedByAdmin: boolean
  payoutHoldUntil: string
}): Promise<void> {
  const { eventId, completedByAdmin, payoutHoldUntil } = options

  try {
    const breakdown = await loadCompletionBreakdown(eventId)
    if (!breakdown || !breakdown.organiserId) {
      console.error('Completion notification skipped: no breakdown or organiser', { eventId })
      return
    }

    const db = createAdminServiceClient()
    const { data: organiser } = await db
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', breakdown.organiserId)
      .maybeSingle()

    const holdClearsOn = formatDay(payoutHoldUntil)
    const earnings = formatMoneyExact(breakdown.organiserEarnsRands)
    const firstName = (organiser?.full_name || breakdown.organiserName || 'there').split(' ')[0]

    // The organiser's own record of it, in the bell menu.
    await createNotification({
      userId: breakdown.organiserId,
      type: 'event_completed',
      title: `${breakdown.eventTitle} is complete`,
      message: completedByAdmin
        ? `Our team marked this event complete. Your ${earnings} is in review and will be released once we're happy with the details.`
        : `Thanks for confirming. Your ${earnings} is now in review — usually under 48 hours — and we'll be in touch if anything needs your attention.`,
      link: '/earnings',
      eventId,
      // sendEmail is false because the branded email below carries the full
      // money breakdown; the generic notification email would duplicate it
      // with less detail.
      sendEmail: false,
    })

    if (organiser?.email) {
      const result = await sendEventCompletedEmail(organiser.email, {
        recipientName: firstName,
        eventName: breakdown.eventTitle,
        eventDate: formatDay(breakdown.eventDate),
        ticketsSold: breakdown.ticketsSold,
        grossSales: formatMoneyExact(breakdown.grossTakenRands),
        yourEarnings: earnings,
        isVerified: breakdown.organiserVerified,
        completedByAdmin,
        recipientId: breakdown.organiserId,
      })

      if (!result.success) {
        console.error('Completion email not sent', { eventId, reason: result.error })
      }
    }

    // Admin gets both the in-app notification and an email. A completion is the
    // moment money becomes owed, and it is the only signal that a payout may be
    // blocked on something only an admin can clear.
    const [{ data: admins }, { data: payoutAccount }] = await Promise.all([
      db.from('profiles').select('id, email').eq('is_admin', true),
      db
        .from('payout_accounts')
        .select('paystack_recipient_code')
        .eq('profile_id', breakdown.organiserId)
        .maybeSingle(),
    ])

    const hasPayoutAccount = Boolean(payoutAccount?.paystack_recipient_code)
    const blocked = !breakdown.organiserVerified || !hasPayoutAccount

    await Promise.all(
      (admins || []).map((admin: { id: string }) =>
        createNotification({
          userId: admin.id,
          type: 'event_completed',
          title: `Event completed: ${breakdown.eventTitle}`,
          message: `${breakdown.organiserName || 'An organiser'} completed this event. ${earnings} releases on ${holdClearsOn}${blocked ? ' — payout is BLOCKED, see the event in admin' : ''}.`,
          link: `/admin/events/${eventId}`,
          eventId,
          sendEmail: false,
        }).catch((error) => {
          console.error('Admin completion notification failed', { eventId, adminId: admin.id, error })
        })
      )
    )

    await sendAdminAlertEmail(
      (admins || []) as { id: string; email: string }[],
      `${blocked ? 'Payout blocked — ' : ''}${breakdown.eventTitle} completed (${earnings})`,
      adminEventCompletedEmail({
        eventName: breakdown.eventTitle,
        eventDate: formatDay(breakdown.eventDate),
        organiserName: breakdown.organiserName || 'Unknown organiser',
        organiserEmail: organiser?.email || 'unknown',
        ticketsSold: breakdown.ticketsSold,
        grossSales: formatMoneyExact(breakdown.grossTakenRands),
        organiserEarns: earnings,
        ziyawaNet: formatMoneyExact(breakdown.ziyawaNetRands),
        holdClearsOn,
        isVerified: breakdown.organiserVerified,
        hasPayoutAccount,
        completedByAdmin,
        adminUrl: `${SITE_URL}/admin/events/${eventId}`,
      }),
      'admin-event-completed'
    )
  } catch (error) {
    console.error('Completion notifications failed', {
      eventId,
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
