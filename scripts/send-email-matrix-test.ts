import fs from 'node:fs'
import path from 'node:path'

import {
  sendEventPublishedEmail,
  sendProviderBookingRequestEmail,
  sendBookingResponseEmail,
  sendBookingPaymentConfirmedEmail,
  sendEventCancelledEmail,
  sendCriticalEventChangeEmail,
  sendPayoutStatusEmail,
  sendCrewInviteEmail,
  sendAttendeeContactOrganizerEmail,
  sendBrandedNotificationEmail,
  sendBookingRequestEmail,
  sendBookingConfirmedEmail,
  sendPaymentReceivedEmail,
  sendTicketPurchasedEmail,
  sendTicketAssignedEmail,
  sendEventReminderEmail,
  sendReviewRequestEmail,
  sendPayoutProcessedEmail,
} from '../src/lib/email'

type SendResult = {
  name: string
  recipient: string
  success: boolean
  id?: string
  error?: string
}

function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return

  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx < 1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

async function runForRecipient(email: string): Promise<SendResult[]> {
  const results: SendResult[] = []
  const recipientName = email.split('@')[0]
  const eventId = '46001e8c-2771-47c9-bb57-3a5b300bc97a'

  const tasks: Array<{ name: string; run: () => Promise<{ success: boolean; id?: string; error?: string }> }> = [
    {
      name: 'sendEventPublishedEmail',
      run: () =>
        sendEventPublishedEmail(email, {
          recipientName,
          eventName: 'TEST: Winter Groove Festival',
          eventDate: '2026-08-15',
          eventLocation: 'Johannesburg Expo Arena',
          eventId,
        }),
    },
    {
      name: 'sendProviderBookingRequestEmail',
      run: () =>
        sendProviderBookingRequestEmail(email, {
          recipientName,
          organizerName: 'Ziyawa Test Organizer',
          eventName: 'TEST: Winter Groove Festival',
          eventDate: '2026-08-15',
          eventLocation: 'Johannesburg Expo Arena',
          serviceName: 'Stage Sound Package',
          amount: 'R 12,000',
          quantity: 1,
          notes: 'TEST: Please confirm availability.',
          actionUrl: 'https://www.ziyawa.com/dashboard/provider/bookings',
        }),
    },
    {
      name: 'sendBookingResponseEmail',
      run: () =>
        sendBookingResponseEmail(email, {
          recipientName,
          responderName: 'Ziyawa Test Provider',
          eventName: 'TEST: Winter Groove Festival',
          responseType: 'accepted',
          amount: 'R 12,000',
          note: 'TEST: Looking forward to this event.',
          actionUrl: 'https://www.ziyawa.com/dashboard/organizer/bookings',
        }),
    },
    {
      name: 'sendBookingPaymentConfirmedEmail',
      run: () =>
        sendBookingPaymentConfirmedEmail(email, {
          recipientName,
          eventName: 'TEST: Winter Groove Festival',
          eventDate: '2026-08-15',
          eventLocation: 'Johannesburg Expo Arena',
          amount: 'R 12,000',
          bookingRoleLabel: 'Sound Engineer',
          actionUrl: 'https://www.ziyawa.com/dashboard/bookings',
        }),
    },
    {
      name: 'sendEventCancelledEmail',
      run: () =>
        sendEventCancelledEmail(email, {
          recipientName,
          eventName: 'TEST: Winter Groove Festival',
          eventDate: '2026-08-15',
          reason: 'TEST: Venue unavailable.',
          actionLabel: 'View Updates',
          actionUrl: 'https://www.ziyawa.com/events/' + eventId,
          roleLabel: 'attendee',
        }),
    },
    {
      name: 'sendCriticalEventChangeEmail',
      run: () =>
        sendCriticalEventChangeEmail(email, {
          recipientName,
          eventName: 'TEST: Winter Groove Festival',
          changes: ['Start time moved to 18:30', 'Gate B is now main entry'],
          eventDate: '2026-08-15',
          eventTime: '18:30',
          eventLocation: 'Johannesburg Expo Arena',
          actionUrl: 'https://www.ziyawa.com/events/' + eventId,
        }),
    },
    {
      name: 'sendPayoutStatusEmail(initiated)',
      run: () =>
        sendPayoutStatusEmail(email, {
          recipientName,
          amount: 'R 8,750',
          status: 'initiated',
          bankAccount: 'FNB •••• 1234',
          actionUrl: 'https://www.ziyawa.com/wallet',
        }),
    },
    {
      name: 'sendPayoutStatusEmail(completed)',
      run: () =>
        sendPayoutStatusEmail(email, {
          recipientName,
          amount: 'R 8,750',
          status: 'completed',
          bankAccount: 'FNB •••• 1234',
          actionUrl: 'https://www.ziyawa.com/wallet',
        }),
    },
    {
      name: 'sendPayoutStatusEmail(failed)',
      run: () =>
        sendPayoutStatusEmail(email, {
          recipientName,
          amount: 'R 8,750',
          status: 'failed',
          bankAccount: 'FNB •••• 1234',
          actionUrl: 'https://www.ziyawa.com/wallet',
        }),
    },
    {
      name: 'sendPayoutStatusEmail(reversed)',
      run: () =>
        sendPayoutStatusEmail(email, {
          recipientName,
          amount: 'R 8,750',
          status: 'reversed',
          bankAccount: 'FNB •••• 1234',
          actionUrl: 'https://www.ziyawa.com/wallet',
        }),
    },
    {
      name: 'sendCrewInviteEmail',
      run: () =>
        sendCrewInviteEmail(email, {
          recipientName,
          eventName: 'TEST: Winter Groove Festival',
          roleLabel: 'Event Ops',
          eventDate: '2026-08-15',
          eventLocation: 'Johannesburg Expo Arena',
          offerLine: 'TEST: R 1,500 day rate',
          noteLine: 'TEST: Please accept within 24h.',
          inviteUrl: 'https://www.ziyawa.com/dashboard/provider/work',
        }),
    },
    {
      name: 'sendAttendeeContactOrganizerEmail',
      run: () =>
        sendAttendeeContactOrganizerEmail(
          email,
          {
            organizerName: recipientName,
            eventName: 'TEST: Winter Groove Festival',
            attendeeName: 'Test Attendee',
            attendeeEmail: 'test-attendee@example.com',
            attendeePhone: '+27 82 000 0000',
            message: 'TEST: What time do gates open?'
          },
          'test-attendee@example.com'
        ),
    },
    {
      name: 'sendBrandedNotificationEmail',
      run: () =>
        sendBrandedNotificationEmail(email, {
          recipientName,
          title: 'TEST: Critical platform notification',
          message: 'This is a transactional test message from Ziyawa.',
          actionUrl: 'https://www.ziyawa.com/dashboard/notifications',
          actionLabel: 'Open Notifications',
        }),
    },
    {
      name: 'sendBookingRequestEmail',
      run: () =>
        sendBookingRequestEmail(email, {
          recipientName,
          clientName: 'Ziyawa Test Client',
          eventName: 'TEST: Winter Groove Festival',
          eventDate: '2026-08-15',
          eventLocation: 'Johannesburg Expo Arena',
          amount: 'R 4,000',
          message: 'TEST: Please review this booking request.',
          bookingId: 'test-booking-001',
        }),
    },
    {
      name: 'sendBookingConfirmedEmail',
      run: () =>
        sendBookingConfirmedEmail(email, {
          recipientName,
          artistName: 'Test Artist',
          eventName: 'TEST: Winter Groove Festival',
          eventDate: '2026-08-15',
          eventLocation: 'Johannesburg Expo Arena',
          amount: 'R 4,000',
          bookingId: 'test-booking-001',
        }),
    },
    {
      name: 'sendPaymentReceivedEmail',
      run: () =>
        sendPaymentReceivedEmail(email, {
          recipientName,
          amount: 'R 4,000',
          serviceName: 'Performance Fee',
          transactionId: 'txn_test_001',
        }),
    },
    {
      name: 'sendTicketPurchasedEmail',
      run: () =>
        sendTicketPurchasedEmail(email, {
          recipientName,
          eventName: 'TEST: Winter Groove Festival',
          eventDate: '2026-08-15',
          eventLocation: 'Johannesburg Expo Arena',
          ticketType: 'General Access',
          quantity: 2,
          totalAmount: 'R 700',
        }),
    },
    {
      name: 'sendTicketAssignedEmail',
      run: () =>
        sendTicketAssignedEmail(email, {
          recipientName,
          eventName: 'TEST: Winter Groove Festival',
          eventDate: '2026-08-15',
          eventLocation: 'Johannesburg Expo Arena',
          ticketType: 'General Access',
          ticketCode: 'ZIY-TEST-001',
          senderName: 'Ziyawa Organizer',
          claimToken: 'test-claim-token',
        }),
    },
    {
      name: 'sendEventReminderEmail',
      run: () =>
        sendEventReminderEmail(email, {
          recipientName,
          eventName: 'TEST: Winter Groove Festival',
          eventDate: '2026-08-15',
          eventTime: '18:30',
          eventLocation: 'Johannesburg Expo Arena',
          eventId,
        }),
    },
    {
      name: 'sendReviewRequestEmail',
      run: () =>
        sendReviewRequestEmail(email, {
          recipientName,
          providerName: 'Test Provider',
          serviceName: 'Sound Engineering',
          bookingId: 'test-booking-001',
        }),
    },
    {
      name: 'sendPayoutProcessedEmail',
      run: () =>
        sendPayoutProcessedEmail(email, {
          recipientName,
          amount: 'R 8,750',
          bankAccount: 'FNB •••• 1234',
          payoutId: 'payout_test_001',
        }),
    },
  ]

  for (const task of tasks) {
    try {
      const out = await task.run()
      results.push({
        name: task.name,
        recipient: email,
        success: out.success,
        id: out.id,
        error: out.error,
      })
    } catch (err) {
      results.push({
        name: task.name,
        recipient: email,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown exception',
      })
    }
  }

  return results
}

async function main(): Promise<void> {
  loadEnvLocal()

  const recipients = ['zmabege@zande.io', 'mgmakgotho@gmail.com']
  const all: SendResult[] = []

  for (const recipient of recipients) {
    const list = await runForRecipient(recipient)
    all.push(...list)
  }

  const ok = all.filter((r) => r.success)
  const fail = all.filter((r) => !r.success)

  console.log('EMAIL_MATRIX_TEST_RESULTS_START')
  console.log(JSON.stringify({ total: all.length, success: ok.length, failed: fail.length, results: all }, null, 2))
  console.log('EMAIL_MATRIX_TEST_RESULTS_END')

  if (fail.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Fatal error while running email matrix test:', error)
  process.exit(1)
})
