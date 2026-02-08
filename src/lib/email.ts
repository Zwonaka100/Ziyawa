/**
 * EMAIL SERVICE
 * Email sending functionality using Resend
 * 
 * Note: Set RESEND_API_KEY in environment variables
 */

import * as EmailTemplates from './email-templates';

// Email configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Ziyawa <noreply@ziyawa.co.za>';
const RESEND_API_URL = 'https://api.resend.com/emails';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
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
        from: FROM_EMAIL,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        reply_to: params.replyTo,
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
  const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bookings/${data.bookingId}`;
  
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
  const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bookings/${data.bookingId}`;
  
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
  const ticketUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tickets`;
  
  return sendEmail({
    to,
    subject: `Your Tickets for ${data.eventName} 🎟️`,
    html: EmailTemplates.ticketPurchasedEmail({ ...data, ticketUrl }),
    tags: [{ name: 'category', value: 'ticket' }],
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
  const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL}/events/${data.eventId}`;
  
  return sendEmail({
    to,
    subject: `Reminder: ${data.eventName} is coming up!`,
    html: EmailTemplates.eventReminderEmail({ ...data, eventUrl }),
    tags: [{ name: 'category', value: 'reminder' }],
  });
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
  const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bookings/${data.bookingId}/review`;
  
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
