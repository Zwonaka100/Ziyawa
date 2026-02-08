/**
 * NOTIFICATION SERVICE
 * Server-side utilities for creating and managing notifications
 */

import { createClient } from '@supabase/supabase-js';

// Service client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =====================================================
// TYPES
// =====================================================

export type NotificationType =
  | 'booking_request'
  | 'booking_accepted'
  | 'booking_declined'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_completed'
  | 'payment_received'
  | 'payment_failed'
  | 'payout_sent'
  | 'payout_completed'
  | 'refund_issued'
  | 'ticket_purchased'
  | 'ticket_checkin'
  | 'event_reminder'
  | 'event_cancelled'
  | 'event_updated'
  | 'welcome'
  | 'profile_verified'
  | 'review_received'
  | 'message_received';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  eventId?: string;
  bookingId?: string;
  transactionId?: string;
  metadata?: Record<string, unknown>;
  sendEmail?: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  event_id: string | null;
  booking_id: string | null;
  transaction_id: string | null;
  metadata: Record<string, unknown>;
  read: boolean;
  read_at: string | null;
  email_sent: boolean;
  created_at: string;
}

// =====================================================
// NOTIFICATION TEMPLATES
// Pre-defined notification content for common events
// =====================================================

export const NotificationTemplates = {
  // Booking notifications
  bookingRequest: (artistName: string, eventTitle: string) => ({
    title: 'New Booking Request',
    message: `You've received a booking request from ${artistName} for "${eventTitle}"`,
  }),
  
  bookingAccepted: (artistName: string, eventTitle: string) => ({
    title: 'Booking Accepted! 🎉',
    message: `${artistName} has accepted your booking for "${eventTitle}". Please proceed with payment to confirm.`,
  }),
  
  bookingDeclined: (artistName: string, eventTitle: string, reason?: string) => ({
    title: 'Booking Declined',
    message: `${artistName} has declined your booking for "${eventTitle}"${reason ? `. Reason: ${reason}` : ''}.`,
  }),
  
  bookingConfirmed: (eventTitle: string, date: string) => ({
    title: 'Booking Confirmed! ✅',
    message: `Your booking for "${eventTitle}" on ${date} is confirmed. Payment received.`,
  }),
  
  bookingCancelled: (eventTitle: string, byWhom: 'organizer' | 'artist') => ({
    title: 'Booking Cancelled',
    message: `The booking for "${eventTitle}" has been cancelled by the ${byWhom}.`,
  }),
  
  bookingCompleted: (eventTitle: string, amount: string) => ({
    title: 'Booking Completed 🎊',
    message: `Your performance at "${eventTitle}" is complete! ${amount} has been released to your wallet.`,
  }),

  // Payment notifications
  paymentReceived: (amount: string, eventTitle: string) => ({
    title: 'Payment Received 💰',
    message: `You received ${amount} for "${eventTitle}".`,
  }),
  
  paymentFailed: (eventTitle: string) => ({
    title: 'Payment Failed',
    message: `Payment for "${eventTitle}" failed. Please try again or use a different payment method.`,
  }),
  
  payoutSent: (amount: string) => ({
    title: 'Payout Initiated',
    message: `Your payout of ${amount} has been initiated. It should arrive within 24 hours.`,
  }),
  
  payoutCompleted: (amount: string) => ({
    title: 'Payout Complete ✅',
    message: `Your payout of ${amount} has been deposited to your bank account.`,
  }),
  
  refundIssued: (amount: string, reason: string) => ({
    title: 'Refund Issued',
    message: `A refund of ${amount} has been processed. Reason: ${reason}`,
  }),

  // Ticket notifications
  ticketPurchased: (eventTitle: string, quantity: number, ticketCode: string) => ({
    title: 'Ticket Purchased! 🎟️',
    message: `You bought ${quantity} ticket${quantity > 1 ? 's' : ''} for "${eventTitle}". Your code: ${ticketCode}`,
  }),
  
  ticketCheckin: (eventTitle: string) => ({
    title: 'Checked In! 🎉',
    message: `You've been checked in to "${eventTitle}". Enjoy the event!`,
  }),

  // Event notifications
  eventReminder: (eventTitle: string, timeUntil: string) => ({
    title: `Event Reminder: ${eventTitle}`,
    message: `"${eventTitle}" starts in ${timeUntil}. Don't forget your ticket!`,
  }),
  
  eventCancelled: (eventTitle: string) => ({
    title: 'Event Cancelled',
    message: `"${eventTitle}" has been cancelled. A refund will be processed.`,
  }),
  
  eventUpdated: (eventTitle: string, changes: string) => ({
    title: 'Event Updated',
    message: `"${eventTitle}" has been updated: ${changes}`,
  }),

  // System notifications
  welcome: (name: string) => ({
    title: 'Welcome to Ziyawa! 🎵',
    message: `Hey ${name}! Your account is ready. Start exploring events or create your first one.`,
  }),
  
  profileVerified: () => ({
    title: 'Profile Verified ✅',
    message: 'Your profile has been verified. You now have access to all features.',
  }),
  
  reviewReceived: (rating: number, eventTitle: string) => ({
    title: `New ${rating}★ Review`,
    message: `You received a ${rating}-star review for "${eventTitle}".`,
  }),
};

// =====================================================
// CORE FUNCTIONS
// =====================================================

/**
 * Create a new notification
 */
export async function createNotification(params: CreateNotificationParams): Promise<Notification | null> {
  const { userId, type, title, message, link, eventId, bookingId, transactionId, metadata, sendEmail } = params;

  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        link,
        event_id: eventId,
        booking_id: bookingId,
        transaction_id: transactionId,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create notification:', error);
      return null;
    }

    // Send email if requested
    if (sendEmail) {
      await sendNotificationEmail(userId, type, title, message, link);
    }

    return data;
  } catch (error) {
    console.error('Notification error:', error);
    return null;
  }
}

/**
 * Create multiple notifications at once (e.g., notifying all attendees)
 */
export async function createBulkNotifications(
  notifications: CreateNotificationParams[]
): Promise<number> {
  if (notifications.length === 0) return 0;

  try {
    const records = notifications.map(n => ({
      user_id: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      event_id: n.eventId,
      booking_id: n.bookingId,
      transaction_id: n.transactionId,
      metadata: n.metadata || {},
    }));

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert(records)
      .select();

    if (error) {
      console.error('Bulk notification error:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Bulk notification error:', error);
    return 0;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('user_id', userId);

    return !error;
  } catch (error) {
    console.error('Mark read error:', error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('read', false);

    return !error;
  } catch (error) {
    console.error('Mark all read error:', error);
    return false;
  }
}

/**
 * Get unread count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) return 0;
    return count || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Delete old notifications (cleanup job)
 */
export async function deleteOldNotifications(daysOld: number = 90): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .eq('read', true)
      .select();

    if (error) return 0;
    return data?.length || 0;
  } catch (error) {
    return 0;
  }
}

// =====================================================
// EMAIL SENDING (Placeholder - integrate with email service)
// =====================================================

async function sendNotificationEmail(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string
): Promise<boolean> {
  // Get user email
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single();

  if (!profile?.email) return false;

  // Check user preferences
  const { data: prefs } = await supabaseAdmin
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Determine if we should send email based on type
  const shouldSend = shouldSendEmail(type, prefs);
  if (!shouldSend) return false;

  // TODO: Integrate with email service (Resend, SendGrid, etc.)
  // For now, just log
  console.log(`📧 Email to ${profile.email}: ${title} - ${message}`);
  
  // Mark email as sent
  // This would be done after actually sending the email
  
  return true;
}

function shouldSendEmail(
  type: NotificationType, 
  prefs: { email_bookings?: boolean; email_payments?: boolean; email_events?: boolean } | null
): boolean {
  if (!prefs) return true; // Default to sending if no preferences

  const bookingTypes: NotificationType[] = [
    'booking_request', 'booking_accepted', 'booking_declined',
    'booking_confirmed', 'booking_cancelled', 'booking_completed'
  ];
  
  const paymentTypes: NotificationType[] = [
    'payment_received', 'payment_failed', 'payout_sent',
    'payout_completed', 'refund_issued', 'ticket_purchased'
  ];
  
  const eventTypes: NotificationType[] = [
    'event_reminder', 'event_cancelled', 'event_updated'
  ];

  if (bookingTypes.includes(type)) return prefs.email_bookings !== false;
  if (paymentTypes.includes(type)) return prefs.email_payments !== false;
  if (eventTypes.includes(type)) return prefs.email_events !== false;
  
  return true; // System notifications always sent
}

// =====================================================
// CONVENIENCE FUNCTIONS
// Quick notification creators for common scenarios
// =====================================================

export const notify = {
  // Booking notifications
  bookingRequest: (organizerId: string, artistName: string, eventTitle: string, eventId: string, bookingId: string) =>
    createNotification({
      userId: organizerId,
      type: 'booking_request',
      ...NotificationTemplates.bookingRequest(artistName, eventTitle),
      link: `/dashboard/organizer/bookings/${bookingId}`,
      eventId,
      bookingId,
      sendEmail: true,
    }),

  bookingAccepted: (organizerId: string, artistName: string, eventTitle: string, bookingId: string) =>
    createNotification({
      userId: organizerId,
      type: 'booking_accepted',
      ...NotificationTemplates.bookingAccepted(artistName, eventTitle),
      link: `/dashboard/organizer/bookings/${bookingId}`,
      bookingId,
      sendEmail: true,
    }),

  bookingConfirmed: (artistId: string, eventTitle: string, date: string, bookingId: string) =>
    createNotification({
      userId: artistId,
      type: 'booking_confirmed',
      ...NotificationTemplates.bookingConfirmed(eventTitle, date),
      link: `/dashboard/artist/bookings`,
      bookingId,
      sendEmail: true,
    }),

  // Payment notifications
  paymentReceived: (userId: string, amount: string, eventTitle: string, transactionId: string) =>
    createNotification({
      userId,
      type: 'payment_received',
      ...NotificationTemplates.paymentReceived(amount, eventTitle),
      link: `/dashboard/wallet`,
      transactionId,
      sendEmail: true,
    }),

  payoutCompleted: (userId: string, amount: string, transactionId: string) =>
    createNotification({
      userId,
      type: 'payout_completed',
      ...NotificationTemplates.payoutCompleted(amount),
      link: `/dashboard/wallet`,
      transactionId,
      sendEmail: true,
    }),

  // Ticket notifications
  ticketPurchased: (userId: string, eventTitle: string, quantity: number, ticketCode: string, eventId: string) =>
    createNotification({
      userId,
      type: 'ticket_purchased',
      ...NotificationTemplates.ticketPurchased(eventTitle, quantity, ticketCode),
      link: `/dashboard/tickets`,
      eventId,
      sendEmail: true,
    }),

  // Welcome notification
  welcome: (userId: string, name: string) =>
    createNotification({
      userId,
      type: 'welcome',
      ...NotificationTemplates.welcome(name),
      link: `/dashboard`,
      sendEmail: true,
    }),
};
