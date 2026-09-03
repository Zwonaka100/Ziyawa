/**
 * EMAIL SERVICE
 * Email sending functionality using Resend
 * 
 * Note: Set RESEND_API_KEY in environment variables
 */

import { createClient as createAdminClient } from '@supabase/supabase-js';
import * as EmailTemplates from './email-templates';
import { SITE_URL } from './constants';

// Email configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Ziyawa <noreply@ziyawa.com>';
const DEFAULT_REPLY_TO = process.env.REPLY_TO_EMAIL || process.env.SUPPORT_EMAIL || 'support@ziyawa.com';
const ACCOUNTS_FROM_EMAIL = process.env.ACCOUNTS_FROM_EMAIL || 'Ziyawa Accounts <accounts@ziyawa.com>';
const RESEND_API_URL = 'https://api.resend.com/emails';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
  /** Dedupe/grouping key written into the audit row so repeat sends can be detected. */
  campaignKey?: string;
  /**
   * Audit classification. Constrained by email_logs_email_type_check to
   * 'individual' | 'bulk' | 'automated'. Defaults to 'individual'.
   */
  emailType?: 'individual' | 'bulk' | 'automated';
  /** Profile ids of the recipients, when known, for the audit row. */
  recipientIds?: string[];
  /** Set false to suppress the audit row (for callers that write their own). */
  logToAudit?: boolean;
  /**
   * Files to attach. Resend takes base64 content, so binary is encoded here
   * rather than at each call site. Resend caps a message at 40MB including
   * attachments; a payout statement is a few KB.
   */
  attachments?: { filename: string; content: Buffer | Uint8Array }[];
}

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Record every send attempt in email_logs.
 *
 * This lives inside sendEmail because it is the one choke point every email
 * passes through. Logging at call sites meant whole categories went unrecorded
 * — the organizer "what went down" prompt, for one — so the audit trail
 * under-reported what actually reached users.
 *
 * Never throws: a logging failure must not turn a delivered email into an
 * error, so problems are reported to the console and swallowed.
 */
async function recordEmailAudit(
  params: SendEmailParams,
  result: SendEmailResult
): Promise<void> {
  if (params.logToAudit === false) return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return;

  try {
    const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey);
    const recipients = Array.isArray(params.to) ? params.to : [params.to];

    // insert() resolves with an { error } object rather than throwing, so the
    // result has to be inspected explicitly — a bare try/catch silently misses
    // constraint violations here.
    const { error } = await supabaseAdmin.from('email_logs').insert({
      sender_id: null,
      recipient_ids: params.recipientIds ?? [],
      recipient_emails: recipients,
      subject: params.subject,
      body: params.campaignKey ? `${params.campaignKey}\n${params.subject}` : params.subject,
      email_type: params.emailType || 'individual',
      status: result.success ? 'sent' : 'failed',
      error_message: result.success ? null : (result.error ?? 'Unknown error'),
    });

    if (error) {
      console.error('Failed to record email audit row:', error.message, error.details ?? '');
    }
  } catch (error) {
    console.error('Failed to record email audit row:', error);
  }
}

/**
 * A per-machine kill switch for outbound mail.
 *
 * This exists because local development points at the LIVE database and the
 * LIVE mail provider. Exercising any code path that sends — completing a test
 * event, running the lifecycle cron, replaying a webhook — reaches real people
 * on real addresses. That has to be impossible by construction, not by
 * remembering.
 *
 * Why this variable and not NODE_ENV or VERCEL:
 *   - `next start` sets NODE_ENV=production, so a local production build is
 *     indistinguishable from the deployed one by that measure.
 *   - `.env.production.local` is a `vercel env pull` artifact and already
 *     contains VERCEL=1 and VERCEL_ENV=production, so those are set locally too.
 *
 * EMAIL_SEND_DISABLED lives in `.env.local`, which Vercel never reads, so it is
 * present on this machine in both dev and `next start`, and absent in every
 * deployment. Nothing about production behaviour changes: unset means send,
 * exactly as before.
 */
const EMAIL_SEND_DISABLED = process.env.EMAIL_SEND_DISABLED === 'true';

/**
 * Send an email using Resend API
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  if (EMAIL_SEND_DISABLED) {
    const recipients = Array.isArray(params.to) ? params.to.join(', ') : params.to;
    const attached = params.attachments?.length
      ? ` with ${params.attachments.map((f) => f.filename).join(', ')}`
      : '';
    console.warn(
      `[email blocked] EMAIL_SEND_DISABLED is set. Would have sent "${params.subject}" to ${recipients}${attached}`
    );
    // Deliberately does not write an email_logs row: nothing was sent, and a
    // blocked send must not look like a delivery in the audit trail or in
    // admin's Communications history.
    return { success: false, error: 'Email sending disabled on this machine (EMAIL_SEND_DISABLED)' };
  }

  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping email send');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: params.from || FROM_EMAIL,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        reply_to: params.replyTo || DEFAULT_REPLY_TO,
        tags: params.tags,
        ...(params.attachments?.length
          ? {
              attachments: params.attachments.map((file) => ({
                filename: file.filename,
                content: Buffer.from(file.content).toString('base64'),
              })),
            }
          : {}),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Email send error:', error);
      const failure = { success: false, error: error.message || 'Failed to send email' };
      await recordEmailAudit(params, failure);
      return failure;
    }

    const result = await response.json();
    const success = { success: true, id: result.id };
    await recordEmailAudit(params, success);
    return success;

  } catch (error) {
    console.error('Email send exception:', error);
    const failure = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
    await recordEmailAudit(params, failure);
    return failure;
  }
}

// ============ CONVENIENCE EMAIL FUNCTIONS ============

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(to: string, userName: string): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: 'Welcome to Ziyawa! 🎉',
    html: EmailTemplates.welcomeEmail(userName),
    tags: [{ name: 'category', value: 'welcome' }],
  });
}

/**
 * Send booking request notification to artist/provider
 */
export async function sendBookingRequestEmail(
  to: string,
  data: {
    recipientName: string;
    clientName: string;
    eventName: string;
    eventDate: string;
    eventLocation: string;
    amount: string;
    message?: string;
    bookingId: string;
  }
): Promise<SendEmailResult> {
  const bookingUrl = `${SITE_URL}/dashboard/bookings/${data.bookingId}`;
  
  return sendEmail({
    to,
    subject: `New Booking Request from ${data.clientName}`,
    html: EmailTemplates.bookingRequestEmail({ ...data, bookingUrl }),
    tags: [{ name: 'category', value: 'booking' }],
  });
}

/**
 * Send booking confirmed notification to client
 */
export async function sendBookingConfirmedEmail(
  to: string,
  data: {
    recipientName: string;
    artistName: string;
    eventName: string;
    eventDate: string;
    eventLocation: string;
    amount: string;
    bookingId: string;
  }
): Promise<SendEmailResult> {
  const bookingUrl = `${SITE_URL}/dashboard/bookings/${data.bookingId}`;
  
  return sendEmail({
    to,
    subject: `Booking Confirmed: ${data.artistName}`,
    html: EmailTemplates.bookingConfirmedEmail({ ...data, bookingUrl }),
    tags: [{ name: 'category', value: 'booking' }],
  });
}

/**
 * Send payment received confirmation
 */
export async function sendPaymentReceivedEmail(
  to: string,
  data: {
    recipientName: string;
    amount: string;
    serviceName: string;
    transactionId: string;
  }
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: 'Payment Received ✓',
    html: EmailTemplates.paymentReceivedEmail(data),
    tags: [{ name: 'category', value: 'payment' }],
  });
}

/**
 * Send ticket purchase confirmation
 */
export async function sendTicketPurchasedEmail(
  to: string,
  data: {
    recipientName: string;
    eventName: string;
    eventDate: string;
    eventLocation: string;
    ticketType: string;
    quantity: number;
    totalAmount: string;
  }
): Promise<SendEmailResult> {
  const ticketUrl = `${SITE_URL}/dashboard/tickets`;
  
  return sendEmail({
    to,
    subject: `Your Tickets for ${data.eventName} 🎟️`,
    html: EmailTemplates.ticketPurchasedEmail({ ...data, ticketUrl }),
    tags: [{ name: 'category', value: 'ticket' }],
  });
}

export async function sendTicketAssignedEmail(
  to: string,
  data: {
    recipientName: string;
    eventName: string;
    eventDate: string;
    eventLocation: string;
    ticketType: string;
    ticketCode: string;
    senderName?: string;
    claimToken?: string | null;
  }
): Promise<SendEmailResult> {
  const baseUrl = SITE_URL;
  const actionUrl = data.claimToken
    ? `${baseUrl}/tickets/claim?token=${encodeURIComponent(data.claimToken)}`
    : `${baseUrl}/dashboard/tickets`;

  return sendEmail({
    to,
    subject: `Your ticket for ${data.eventName} is ready 🎫`,
    html: EmailTemplates.ticketAssignedEmail({
      ...data,
      actionUrl,
      actionLabel: data.claimToken ? 'Claim My Ticket' : 'Open My Ticket',
    }),
    tags: [{ name: 'category', value: 'ticket-delivery' }],
  });
}

/**
 * Send event reminder
 */
export async function sendEventReminderEmail(
  to: string,
  data: {
    recipientName: string;
    eventName: string;
    eventDate: string;
    eventTime: string;
    eventLocation: string;
    eventId: string;
  }
): Promise<SendEmailResult> {
  const eventUrl = `${SITE_URL}/events/${data.eventId}`;
  
  return sendEmail({
    to,
    subject: `Reminder: ${data.eventName} is coming up!`,
    html: EmailTemplates.eventReminderEmail({ ...data, eventUrl }),
    tags: [{ name: 'category', value: 'reminder' }],
  });
}

export async function sendOrganizerWhatWentDownEmail(
  to: string,
  data: {
    recipientName: string;
    eventName: string;
    eventDate: string;
    eventId: string;
  }
): Promise<SendEmailResult> {
  const uploadUrl = `${SITE_URL}/dashboard/organizer/events/${data.eventId}/what-went-down`;

  return sendEmail({
    to,
    subject: `Share what went down at ${data.eventName}`,
    html: EmailTemplates.organizerWhatWentDownEmail({ ...data, uploadUrl }),
    tags: [{ name: 'category', value: 'organizer-recap' }],
  });
}

export async function sendEventPublishedEmail(
  to: string,
  data: {
    recipientName: string;
    eventName: string;
    eventDate: string;
    eventLocation: string;
    eventId: string;
  }
): Promise<SendEmailResult> {
  const eventUrl = `${SITE_URL}/events/${data.eventId}`;
  const manageUrl = `${SITE_URL}/dashboard/organizer/events/${data.eventId}/manage`;

  return sendEmail({
    to,
    from: FROM_EMAIL,
    subject: `Your event is now live: ${data.eventName}`,
    html: EmailTemplates.eventPublishedEmail({
      ...data,
      eventUrl,
      manageUrl,
    }),
    tags: [{ name: 'category', value: 'event-published' }],
  });
}

export async function sendEventCompletedEmail(
  to: string,
  data: {
    recipientName: string;
    eventName: string;
    eventDate: string;
    ticketsSold: number;
    grossSales: string;
    yourEarnings: string;
    holdClearsOn: string;
    isVerified: boolean;
    completedByAdmin?: boolean;
    recipientId?: string;
  }
): Promise<SendEmailResult> {
  const { recipientId, ...templateData } = data;

  return sendEmail({
    to,
    from: ACCOUNTS_FROM_EMAIL,
    subject: `${data.eventName} is complete — here's what happens to your money`,
    html: EmailTemplates.eventCompletedEmail({
      ...templateData,
      verifyUrl: `${SITE_URL}/dashboard/settings?tab=verification`,
      earningsUrl: `${SITE_URL}/earnings`,
    }),
    emailType: 'automated',
    recipientIds: recipientId ? [recipientId] : [],
    tags: [{ name: 'category', value: 'event-completed' }],
  });
}

/**
 * Fans an operations alert out to every admin.
 *
 * Sends are sequential rather than Promise.all so one bad address cannot reject
 * the batch, and every failure is logged with the address it belongs to.
 */
export async function sendAdminAlertEmail(
  recipients: { email: string; id?: string }[],
  subject: string,
  html: string,
  category: string
): Promise<void> {
  for (const recipient of recipients) {
    if (!recipient.email) continue;

    const result = await sendEmail({
      to: recipient.email,
      from: ACCOUNTS_FROM_EMAIL,
      subject,
      html,
      emailType: 'automated',
      recipientIds: recipient.id ? [recipient.id] : [],
      tags: [{ name: 'category', value: category }],
    });

    if (!result.success) {
      console.error('Admin alert not sent', { to: recipient.email, category, reason: result.error });
    }
  }
}

export async function sendPayoutStatementEmail(
  to: string,
  data: {
    recipientName: string;
    amount: string;
    bankName: string;
    accountLast4: string;
    reference: string;
    sources: { label: string; detail: string; amount: string }[];
    recipientId?: string;
    statementPdf?: Uint8Array;
  }
): Promise<SendEmailResult> {
  const { recipientId, statementPdf, ...templateData } = data;

  return sendEmail({
    to,
    from: ACCOUNTS_FROM_EMAIL,
    // Settlement mail invites a reply about someone's money, so it must not be
    // diverted to the support queue.
    replyTo: process.env.ACCOUNTS_EMAIL || process.env.SUPPORT_EMAIL,
    subject: `${data.amount} is on its way to your bank`,
    html: EmailTemplates.payoutStatementEmail({
      ...templateData,
      earningsUrl: `${SITE_URL}/earnings`,
    }),
    emailType: 'individual',
    recipientIds: recipientId ? [recipientId] : [],
    tags: [{ name: 'category', value: 'payout-statement' }],
    attachments: statementPdf
      ? [{ filename: `ziyawa-payout-${data.reference}.pdf`, content: statementPdf }]
      : undefined,
  });
}

export async function sendProviderBookingRequestEmail(
  to: string,
  data: {
    recipientName: string;
    organizerName: string;
    eventName: string;
    eventDate: string;
    eventLocation: string;
    serviceName: string;
    amount: string;
    quantity: number;
    notes?: string;
    actionUrl: string;
  }
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: `New service booking request for ${data.eventName}`,
    html: EmailTemplates.providerBookingRequestEmail(data),
    tags: [{ name: 'category', value: 'provider-booking-request' }],
  })
}

export async function sendBookingResponseEmail(
  to: string,
  data: {
    recipientName: string;
    responderName: string;
    eventName: string;
    responseType: 'accepted' | 'declined' | 'countered';
    amount?: string;
    note?: string;
    actionUrl: string;
  }
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: `Booking update for ${data.eventName}`,
    html: EmailTemplates.bookingResponseEmail(data),
    tags: [{ name: 'category', value: 'booking-response' }],
  })
}

export async function sendBookingPaymentConfirmedEmail(
  to: string,
  data: {
    recipientName: string;
    eventName: string;
    eventDate: string;
    eventLocation: string;
    amount: string;
    bookingRoleLabel: string;
    actionUrl: string;
  }
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: `Payment secured for ${data.eventName}`,
    html: EmailTemplates.bookingPaymentConfirmedEmail(data),
    tags: [{ name: 'category', value: 'booking-confirmed' }],
  })
}

export async function sendEventCancelledEmail(
  to: string,
  data: {
    recipientName: string;
    eventName: string;
    eventDate: string;
    reason?: string;
    actionLabel: string;
    actionUrl: string;
    roleLabel: 'attendee' | 'artist' | 'provider' | 'crew';
  }
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: `Event cancelled: ${data.eventName}`,
    html: EmailTemplates.eventCancelledEmail(data),
    tags: [{ name: 'category', value: 'event-cancelled' }],
  })
}

export async function sendCriticalEventChangeEmail(
  to: string,
  data: {
    recipientName: string;
    eventName: string;
    changes: string[];
    eventDate: string;
    eventTime: string;
    eventLocation: string;
    actionUrl: string;
  }
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: `Important update: ${data.eventName}`,
    html: EmailTemplates.criticalEventChangeEmail(data),
    tags: [{ name: 'category', value: 'event-critical-update' }],
  })
}

export async function sendPayoutStatusEmail(
  to: string,
  data: {
    recipientName: string;
    amount: string;
    status: 'initiated' | 'completed' | 'failed' | 'reversed';
    bankAccount?: string;
    actionUrl: string;
  }
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: data.status === 'initiated'
      ? 'Your payout has been initiated'
      : data.status === 'completed'
        ? 'Your payout has been completed'
        : data.status === 'failed'
          ? 'Your payout failed'
          : 'Your payout was reversed',
    html: EmailTemplates.payoutStatusEmail(data),
    tags: [{ name: 'category', value: `payout-${data.status}` }],
  })
}

export async function sendBrandedNotificationEmail(
  to: string,
  data: {
    recipientName: string;
    title: string;
    message: string;
    actionUrl?: string;
    actionLabel?: string;
  }
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: data.title,
    html: EmailTemplates.brandedNotificationEmail(data),
    tags: [{ name: 'category', value: 'system-notification' }],
  })
}

export async function sendCrewInviteEmail(
  to: string,
  data: {
    recipientName: string;
    eventName: string;
    roleLabel: string;
    eventDate: string;
    eventLocation: string;
    offerLine?: string;
    noteLine?: string;
    inviteUrl: string;
  }
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: `You have been invited to join ${data.eventName}`,
    html: EmailTemplates.crewInviteEmail(data),
    tags: [{ name: 'category', value: 'event-team-invite' }],
  })
}

export async function sendAttendeeContactOrganizerEmail(
  to: string,
  data: {
    organizerName: string;
    eventName: string;
    attendeeName: string;
    attendeeEmail: string;
    attendeePhone?: string;
    message: string;
  },
  replyTo?: string
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    replyTo,
    subject: `New attendee message about ${data.eventName}`,
    html: EmailTemplates.attendeeContactOrganizerEmail(data),
    text: `New attendee message for ${data.eventName}\n\nName: ${data.attendeeName}\nEmail: ${data.attendeeEmail}\nPhone: ${data.attendeePhone || 'Not provided'}\n\nMessage:\n${data.message}`,
    tags: [{ name: 'category', value: 'contact-organizer' }],
  })
}

/**
 * Send review request
 */
export async function sendReviewRequestEmail(
  to: string,
  data: {
    recipientName: string;
    providerName: string;
    serviceName: string;
    bookingId: string;
  }
): Promise<SendEmailResult> {
  const reviewUrl = `${SITE_URL}/dashboard/bookings/${data.bookingId}/review`;
  
  return sendEmail({
    to,
    subject: `How was your experience with ${data.providerName}?`,
    html: EmailTemplates.reviewRequestEmail({ ...data, reviewUrl }),
    tags: [{ name: 'category', value: 'review' }],
  });
}

/**
 * Send payout processed notification
 */
export async function sendPayoutProcessedEmail(
  to: string,
  data: {
    recipientName: string;
    amount: string;
    bankAccount: string;
    payoutId: string;
  }
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: 'Your Payout Has Been Processed 💰',
    html: EmailTemplates.payoutProcessedEmail(data),
    tags: [{ name: 'category', value: 'payout' }],
  });
}

// ============ HELPER TO CHECK USER EMAIL PREFERENCES ============

import { createClient } from '@/lib/supabase/server';

interface EmailPreferences {
  email_enabled: boolean;
  booking_notifications: boolean;
  payment_notifications: boolean;
  event_notifications: boolean;
  message_notifications: boolean;
  review_notifications: boolean;
  system_notifications: boolean;
  marketing_notifications: boolean;
}

/**
 * Check if user has email enabled for a notification category
 */
export async function shouldSendEmail(
  userId: string,
  category: keyof Omit<EmailPreferences, 'email_enabled'>
): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!prefs) {
      // Default to sending if no preferences set
      return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prefsRecord = prefs as any;
    return prefsRecord.email_enabled && prefsRecord[category];
  } catch (error) {
    console.error('Error checking email preferences:', error);
    return true; // Default to sending
  }
}

/**
 * Get user email from profile
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    return profile?.email || null;
  } catch (error) {
    console.error('Error getting user email:', error);
    return null;
  }
}
