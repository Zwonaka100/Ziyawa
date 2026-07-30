/**
 * EMAIL SERVICE
 * Email sending functionality using Resend
 * 
 * Note: Set RESEND_API_KEY in environment variables
 */

import * as EmailTemplates from './email-templates';
import { SITE_URL } from './constants';

// Email configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Ziyawa <noreply@zande.io>';
const DEFAULT_REPLY_TO = process.env.REPLY_TO_EMAIL || process.env.SUPPORT_EMAIL || 'support@zande.io';
const RESEND_API_URL = 'https://api.resend.com/emails';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send an email using Resend API
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
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
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Email send error:', error);
      return { success: false, error: error.message || 'Failed to send email' };
    }

    const result = await response.json();
    return { success: true, id: result.id };

  } catch (error) {
    console.error('Email send exception:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    };
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
    from: 'Ziyawa <noreply@zande.io>',
    subject: `Your event is now live: ${data.eventName}`,
    html: EmailTemplates.eventPublishedEmail({
      ...data,
      eventUrl,
      manageUrl,
    }),
    tags: [{ name: 'category', value: 'event-published' }],
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
