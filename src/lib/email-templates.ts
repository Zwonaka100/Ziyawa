/**
 * EMAIL TEMPLATES
 * Reusable email templates for Ziyawa notifications
 */

import { SITE_URL } from './constants'

// Base email wrapper
export function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ziyawa</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #111111;
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 18px;
    }
    .email-wrapper {
      background-color: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
    }
    .header {
      background-color: #ffffff;
      border-bottom: 1px solid #e5e7eb;
      padding: 18px 24px;
      text-align: center;
    }
    .brand-lockup {
      display: inline-flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    .brand-lockup img {
      width: 32px;
      max-width: 100%;
      height: auto;
      display: block;
    }
    .brand-copy {
      text-align: left;
      line-height: 1.15;
    }
    .logo {
      display: inline-block;
      font-size: 24px;
      font-weight: 700;
      color: #111111;
      text-decoration: none;
      letter-spacing: 0;
      margin: 0;
    }
    .tagline {
      margin: 2px 0 0;
      font-size: 12px;
      color: #6b7280;
    }
    .content {
      padding: 32px 26px;
    }
    .footer {
      background-color: #f9fafb;
      border-top: 1px solid #e5e7eb;
      padding: 18px 24px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #111111;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 7px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #000000;
    }
    h1 {
      font-size: 24px;
      margin: 0 0 20px;
      color: #111111;
    }
    p {
      margin: 0 0 16px;
      color: #374151;
    }
    .highlight-box {
      background-color: #f3f4f6;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      color: #6b7280;
      font-size: 14px;
      display: inline-block;
      min-width: 90px;
      white-space: nowrap;
    }
    .detail-label::after {
      content: ':';
      margin-left: 2px;
    }
    .detail-value {
      font-weight: 600;
      color: #111111;
      margin-left: 8px;
    }
    .message-box {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
      color: #374151;
    }
    .note-box {
      background-color: #f9fafb;
      border-left: 4px solid #9ca3af;
      border-radius: 4px;
      padding: 15px;
      margin: 20px 0;
      color: #374151;
    }
    .text-link {
      color: #111111;
      text-decoration: underline;
      font-weight: 600;
    }
    .social-links {
      margin-top: 15px;
    }
    .social-links a {
      display: inline-block;
      margin: 0 8px;
      color: #6b7280;
      text-decoration: none;
    }
    @media (max-width: 600px) {
      .container {
        padding: 10px;
      }
      .content {
        padding: 30px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-wrapper">
      <div class="header">
        <div class="brand-lockup">
          <a href="${SITE_URL}" aria-label="Ziyawa home">
            <img src="${SITE_URL}/ziyawa-logo.svg" alt="Ziyawa" />
          </a>
          <div class="brand-copy">
            <a href="${SITE_URL}" class="logo" style="color: #111111 !important; text-decoration: none;">Ziyawa</a>
            <p class="tagline">South Africa's event operating system</p>
          </div>
        </div>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Ziyawa. All rights reserved.</p>
        <p>South Africa's Premier Events Marketplace</p>

        <p style="margin-top: 15px; font-size: 11px;">
          You're receiving this email because you have an account on Ziyawa.
          <br>
          <a href="${SITE_URL}/dashboard/settings/notifications">Manage notification preferences</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

// Welcome email
export function welcomeEmail(userName: string): string {
  const content = `
    <h1>Welcome to Ziyawa, ${userName}! 🎉</h1>
    <p>We're thrilled to have you join South Africa's premier events marketplace.</p>
    <p>With Ziyawa, you can:</p>
    <ul style="color: #374151; margin-bottom: 20px;">
      <li><strong>Discover Events</strong> - Find amazing events happening near you</li>
      <li><strong>Book Artists</strong> - Connect with talented performers for your events</li>
      <li><strong>Hire Services</strong> - Find caterers, photographers, and more</li>
      <li><strong>Host Events</strong> - Create and manage your own events</li>
    </ul>
    <p style="text-align: center;">
      <a href="${SITE_URL}/explore" class="button">
        Start Exploring
      </a>
    </p>
    <p>If you have any questions, our support team is here to help.</p>
    <p>Welcome aboard!</p>
    <p><strong>The Ziyawa Team</strong></p>
  `;
  return emailWrapper(content);
}

// Booking request email (for artists/providers)
export function bookingRequestEmail(data: {
  recipientName: string;
  clientName: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  amount: string;
  message?: string;
  bookingUrl: string;
}): string {
  const content = `
    <h1>New Booking Request! 🎵</h1>
    <p>Hi ${data.recipientName},</p>
    <p>Great news! You have a new booking request from <strong>${data.clientName}</strong>.</p>
    
    <div class="highlight-box">
      <div class="detail-row">
        <span class="detail-label">Event</span>
        <span class="detail-value">${data.eventName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date</span>
        <span class="detail-value">${data.eventDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Location</span>
        <span class="detail-value">${data.eventLocation}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Amount</span>
        <span class="detail-value">${data.amount}</span>
      </div>
    </div>

    ${data.message ? `
      <div class="note-box">
        <p style="margin: 0; font-style: italic;">"${data.message}"</p>
      </div>
    ` : ''}

    <p>Please review and respond to this booking request within 48 hours.</p>
    
    <p style="text-align: center;">
      <a href="${data.bookingUrl}" class="button">
        View Booking Details
      </a>
    </p>
  `;
  return emailWrapper(content);
}

// Booking confirmed email (for clients)
export function bookingConfirmedEmail(data: {
  recipientName: string;
  artistName: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  amount: string;
  bookingUrl: string;
}): string {
  const content = `
    <h1>Booking Confirmed! ✅</h1>
    <p>Hi ${data.recipientName},</p>
    <p>Great news! <strong>${data.artistName}</strong> has confirmed your booking.</p>
    
    <div class="highlight-box">
      <div class="detail-row">
        <span class="detail-label">Artist/Provider</span>
        <span class="detail-value">${data.artistName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Event</span>
        <span class="detail-value">${data.eventName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date</span>
        <span class="detail-value">${data.eventDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Location</span>
        <span class="detail-value">${data.eventLocation}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Total Amount</span>
        <span class="detail-value">${data.amount}</span>
      </div>
    </div>

    <p>Next steps:</p>
    <ol style="color: #374151;">
      <li>Complete payment to secure your booking</li>
      <li>Coordinate details with ${data.artistName}</li>
      <li>Enjoy your event!</li>
    </ol>
    
    <p style="text-align: center;">
      <a href="${data.bookingUrl}" class="button">
        Complete Payment
      </a>
    </p>
  `;
  return emailWrapper(content);
}

// Payment received email
export function paymentReceivedEmail(data: {
  recipientName: string;
  amount: string;
  serviceName: string;
  transactionId: string;
}): string {
  const content = `
    <h1>Payment Received! 💰</h1>
    <p>Hi ${data.recipientName},</p>
    <p>We've received your payment. Here are the details:</p>
    
    <div class="highlight-box">
      <div class="detail-row">
        <span class="detail-label">Amount</span>
        <span class="detail-value">${data.amount}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Service</span>
        <span class="detail-value">${data.serviceName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Transaction ID</span>
        <span class="detail-value">${data.transactionId}</span>
      </div>
    </div>

    <p>Thank you for your payment. Your booking is now secured!</p>
    
    <p style="text-align: center;">
      <a href="${SITE_URL}/dashboard/bookings" class="button">
        View My Bookings
      </a>
    </p>
  `;
  return emailWrapper(content);
}

// Ticket purchased email
export function ticketPurchasedEmail(data: {
  recipientName: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  ticketType: string;
  quantity: number;
  totalAmount: string;
  ticketUrl: string;
}): string {
  const content = `
    <h1>Your Tickets Are Ready! 🎟️</h1>
    <p>Hi ${data.recipientName},</p>
    <p>You're going to <strong>${data.eventName}</strong>! Here are your ticket details:</p>
    
    <div class="highlight-box">
      <div class="detail-row">
        <span class="detail-label">Event</span>
        <span class="detail-value">${data.eventName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date</span>
        <span class="detail-value">${data.eventDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Location</span>
        <span class="detail-value">${data.eventLocation}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Ticket Type</span>
        <span class="detail-value">${data.ticketType}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Quantity</span>
        <span class="detail-value">${data.quantity}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Total Paid</span>
        <span class="detail-value">${data.totalAmount}</span>
      </div>
    </div>

    <p>Your tickets include a QR code for easy check-in at the venue.</p>
    
    <p style="text-align: center;">
      <a href="${data.ticketUrl}" class="button">
        View My Tickets
      </a>
    </p>
    
    <p style="font-size: 14px; color: #6b7280;">
      Tip: Save your tickets to your phone for easy access at the event!
    </p>
  `;
  return emailWrapper(content);
}

export function ticketAssignedEmail(data: {
  recipientName: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  ticketType: string;
  ticketCode: string;
  senderName?: string;
  actionUrl: string;
  actionLabel?: string;
}): string {
  const content = `
    <h1>You’ve received a ticket 🎫</h1>
    <p>Hi ${data.recipientName},</p>
    <p>${data.senderName ? `<strong>${data.senderName}</strong> got you a ticket for <strong>${data.eventName}</strong>.` : `A ticket for <strong>${data.eventName}</strong> is ready for you.`}</p>

    <div class="highlight-box">
      <div class="detail-row">
        <span class="detail-label">Event</span>
        <span class="detail-value">${data.eventName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date</span>
        <span class="detail-value">${data.eventDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Location</span>
        <span class="detail-value">${data.eventLocation}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Ticket Type</span>
        <span class="detail-value">${data.ticketType}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Ticket Code</span>
        <span class="detail-value">${data.ticketCode}</span>
      </div>
    </div>

    <p style="text-align: center;">
      <a href="${data.actionUrl}" class="button">
        ${data.actionLabel || 'Open My Ticket'}
      </a>
    </p>

    <p style="font-size: 14px; color: #6b7280;">
      If you do not have a Ziyawa account yet, sign up with this same email address to claim the ticket into your dashboard.
    </p>
  `;
  return emailWrapper(content);
}

// Event reminder email
export function eventReminderEmail(data: {
  recipientName: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventUrl: string;
}): string {
  const content = `
    <h1>Event Reminder ⏰</h1>
    <p>Hi ${data.recipientName},</p>
    <p>Just a friendly reminder that <strong>${data.eventName}</strong> is coming up soon!</p>
    
    <div class="highlight-box">
      <div class="detail-row">
        <span class="detail-label">Event</span>
        <span class="detail-value">${data.eventName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date</span>
        <span class="detail-value">${data.eventDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Time</span>
        <span class="detail-value">${data.eventTime}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Location</span>
        <span class="detail-value">${data.eventLocation}</span>
      </div>
    </div>

    <p>Don't forget to:</p>
    <ul style="color: #374151;">
      <li>Have your tickets ready (check your Ziyawa dashboard)</li>
      <li>Plan your route to the venue</li>
      <li>Check the weather forecast</li>
    </ul>
    
    <p style="text-align: center;">
      <a href="${data.eventUrl}" class="button">
        View Event Details
      </a>
    </p>
    
    <p>Have an amazing time! 🎉</p>
  `;
  return emailWrapper(content);
}

export function eventUpdateEmail(data: {
  recipientName: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  message: string;
  eventUrl: string;
}): string {
  const content = `
    <h1>Important Event Update 📣</h1>
    <p>Hi ${data.recipientName},</p>
    <p>Here is an update for <strong>${data.eventName}</strong>.</p>

    <div class="highlight-box">
      <div class="detail-row">
        <span class="detail-label">Event</span>
        <span class="detail-value">${data.eventName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date</span>
        <span class="detail-value">${data.eventDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Time</span>
        <span class="detail-value">${data.eventTime}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Venue</span>
        <span class="detail-value">${data.eventLocation}</span>
      </div>
    </div>

    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0; color: #374151;">
      ${data.message}
    </div>

    <p style="text-align: center;">
      <a href="${data.eventUrl}" class="button">
        Open Event on Ziyawa
      </a>
    </p>
  `;
  return emailWrapper(content);
}

export function eventFollowUpEmail(data: {
  recipientName: string;
  eventName: string;
  eventDate: string;
  message: string;
  reviewUrl: string;
  discoverUrl: string;
}): string {
  const content = `
    <h1>Thanks for attending! ✨</h1>
    <p>Hi ${data.recipientName},</p>
    <p>Thank you for joining <strong>${data.eventName}</strong> on ${data.eventDate}.</p>

    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0; color: #374151;">
      ${data.message}
    </div>

    <p style="text-align: center;">
      <a href="${data.reviewUrl}" class="button">
        Leave a Review
      </a>
    </p>

    <p style="text-align: center; margin-top: 10px;">
      <a href="${data.discoverUrl}" class="text-link">
        Discover more events on Ziyawa
      </a>
    </p>
  `;
  return emailWrapper(content);
}

export function organizerWhatWentDownEmail(data: {
  recipientName: string;
  eventName: string;
  eventDate: string;
  uploadUrl: string;
}): string {
  const content = `
    <h1>Show everyone what went down 🔥</h1>
    <p>Hi ${data.recipientName},</p>
    <p><strong>${data.eventName}</strong> happened on ${data.eventDate}. Share the highlights so attendees can relive it and new fans can see the vibe.</p>

    <div class="highlight-box">
      <div class="detail-row">
        <span class="detail-label">Recap limit</span>
        <span class="detail-value">Up to 5 items total</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Image size</span>
        <span class="detail-value">Max 10MB each</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Video size</span>
        <span class="detail-value">Max 5MB each</span>
      </div>
    </div>

    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0; color: #374151;">
      If files are too large, paste social media links instead (YouTube, TikTok, Instagram Reels, Facebook, or direct links).
    </div>

    <p style="text-align: center;">
      <a href="${data.uploadUrl}" class="button">
        Add What Went Down
      </a>
    </p>
  `;

  return emailWrapper(content);
}

export function eventPublishedEmail(data: {
  recipientName: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  eventUrl: string;
  manageUrl: string;
}): string {
  const content = `
    <h1>Your event is live! 🚀</h1>
    <p>Hi ${data.recipientName},</p>
    <p><strong>${data.eventName}</strong> has been published successfully and is now visible on Ziyawa.</p>

    <div class="highlight-box">
      <div class="detail-row">
        <span class="detail-label">Event</span>
        <span class="detail-value">${data.eventName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date</span>
        <span class="detail-value">${data.eventDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Location</span>
        <span class="detail-value">${data.eventLocation}</span>
      </div>
    </div>

    <p>You can now start sharing the listing, monitor ticket sales, and manage attendees from your organizer dashboard.</p>

    <p style="text-align: center;">
      <a href="${data.eventUrl}" class="button">
        View Live Event
      </a>
    </p>

    <p style="text-align: center; margin-top: 10px;">
      <a href="${data.manageUrl}" class="text-link">
        Manage this event
      </a>
    </p>
  `;

  return emailWrapper(content);
}

export function providerBookingRequestEmail(data: {
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
}): string {
  const content = `
    <h1>New service booking request</h1>
    <p>Hi ${data.recipientName},</p>
    <p><strong>${data.organizerName}</strong> wants to book your service for <strong>${data.eventName}</strong>.</p>

    <div class="highlight-box">
      <div class="detail-row">
        <span class="detail-label">Service</span>
        <span class="detail-value">${data.serviceName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date</span>
        <span class="detail-value">${data.eventDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Location</span>
        <span class="detail-value">${data.eventLocation}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Quantity</span>
        <span class="detail-value">${data.quantity}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Offer</span>
        <span class="detail-value">${data.amount}</span>
      </div>
    </div>

    ${data.notes ? `<div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;"><strong>Notes from organiser:</strong><br/>${data.notes}</div>` : ''}

    <p>Please review the request and respond on Ziyawa so the organiser can move forward.</p>

    <p style="text-align: center;">
      <a href="${data.actionUrl}" class="button">
        Review Booking Request
      </a>
    </p>
  `;

  return emailWrapper(content);
}

export function bookingResponseEmail(data: {
  recipientName: string;
  responderName: string;
  eventName: string;
  responseType: 'accepted' | 'declined' | 'countered';
  amount?: string;
  note?: string;
  actionUrl: string;
}): string {
  const headline = data.responseType === 'accepted'
    ? 'Your booking was accepted'
    : data.responseType === 'declined'
      ? 'Your booking was declined'
      : 'You received a counter-offer';

  const body = data.responseType === 'accepted'
    ? `${data.responderName} accepted your booking for <strong>${data.eventName}</strong>. You can now complete payment to confirm it.`
    : data.responseType === 'declined'
      ? `${data.responderName} declined your booking request for <strong>${data.eventName}</strong>.`
      : `${data.responderName} sent a counter-offer for <strong>${data.eventName}</strong>. Review the updated amount and decide on the next step.`;

  const content = `
    <h1>${headline}</h1>
    <p>Hi ${data.recipientName},</p>
    <p>${body}</p>

    <div class="highlight-box">
      <div class="detail-row">
        <span class="detail-label">Event</span>
        <span class="detail-value">${data.eventName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Response</span>
        <span class="detail-value">${data.responseType}</span>
      </div>
      ${data.amount ? `<div class="detail-row"><span class="detail-label">Amount</span><span class="detail-value">${data.amount}</span></div>` : ''}
    </div>

    ${data.note ? `<div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;"><strong>Message:</strong><br/>${data.note}</div>` : ''}

    <p style="text-align: center;">
      <a href="${data.actionUrl}" class="button">
        Open Booking Details
      </a>
    </p>
  `;

  return emailWrapper(content);
}

export function bookingPaymentConfirmedEmail(data: {
  recipientName: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  amount: string;
  bookingRoleLabel: string;
  actionUrl: string;
}): string {
  const content = `
    <h1>Payment secured for your booking</h1>
    <p>Hi ${data.recipientName},</p>
    <p>The organiser has completed payment for your ${data.bookingRoleLabel.toLowerCase()} booking on <strong>${data.eventName}</strong>.</p>

    <div class="highlight-box">
      <div class="detail-row">
        <span class="detail-label">Event</span>
        <span class="detail-value">${data.eventName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date</span>
        <span class="detail-value">${data.eventDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Location</span>
        <span class="detail-value">${data.eventLocation}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Amount held in escrow</span>
        <span class="detail-value">${data.amount}</span>
      </div>
    </div>

    <p>The funds are protected in escrow and will be released when the job is completed according to Ziyawa's workflow.</p>

    <p style="text-align: center;">
      <a href="${data.actionUrl}" class="button">
        Open Booking
      </a>
    </p>
  `;

  return emailWrapper(content);
}

export function eventCancelledEmail(data: {
  recipientName: string;
  eventName: string;
  eventDate: string;
  reason?: string;
  actionLabel: string;
  actionUrl: string;
  roleLabel: 'attendee' | 'artist' | 'provider' | 'crew';
}): string {
  const nextStep = data.roleLabel === 'attendee'
    ? 'Any eligible refund will be processed according to your payment and ticket status.'
    : 'Please open Ziyawa to review the change and any follow-up actions for this booking or assignment.';

  const content = `
    <h1>Event cancelled</h1>
    <p>Hi ${data.recipientName},</p>
    <p>We need to let you know that <strong>${data.eventName}</strong>, scheduled for ${data.eventDate}, has been cancelled.</p>

    ${data.reason ? `<div class="note-box"><p style="margin:0;"><strong>Reason:</strong> ${data.reason}</p></div>` : ''}

    <p>${nextStep}</p>

    <p style="text-align: center;">
      <a href="${data.actionUrl}" class="button">
        ${data.actionLabel}
      </a>
    </p>
  `;

  return emailWrapper(content);
}

export function criticalEventChangeEmail(data: {
  recipientName: string;
  eventName: string;
  changes: string[];
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  actionUrl: string;
}): string {
  const listItems = data.changes.map((item) => `<li>${item}</li>`).join('')

  const content = `
    <h1>Important update for ${data.eventName}</h1>
    <p>Hi ${data.recipientName},</p>
    <p>Some important event details have changed. Please review the latest information below.</p>

    <div class="highlight-box">
      <div class="detail-row">
        <span class="detail-label">Date</span>
        <span class="detail-value">${data.eventDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Time</span>
        <span class="detail-value">${data.eventTime}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Venue</span>
        <span class="detail-value">${data.eventLocation}</span>
      </div>
    </div>

    <p><strong>What changed:</strong></p>
    <ul style="color: #374151; margin-bottom: 20px;">${listItems}</ul>

    <p style="text-align: center;">
      <a href="${data.actionUrl}" class="button">
        View Updated Event
      </a>
    </p>
  `;

  return emailWrapper(content);
}

export function payoutStatusEmail(data: {
  recipientName: string;
  amount: string;
  status: 'initiated' | 'completed' | 'failed' | 'reversed';
  bankAccount?: string;
  actionUrl: string;
}): string {
  const title = data.status === 'initiated'
    ? 'Your payout is on the way'
    : data.status === 'completed'
      ? 'Your payout is complete'
      : data.status === 'failed'
        ? 'Your payout could not be completed'
        : 'Your payout was reversed';

  const body = data.status === 'initiated'
    ? `Your payout of <strong>${data.amount}</strong> has been initiated and is being sent to ${data.bankAccount || 'your bank account'}.`
    : data.status === 'completed'
      ? `Your payout of <strong>${data.amount}</strong> has been completed successfully.`
      : data.status === 'failed'
        ? `Your payout of <strong>${data.amount}</strong> could not be completed. The funds have been restored to your wallet.`
        : `Your payout of <strong>${data.amount}</strong> was reversed. The funds are now back in your wallet.`;

  const content = `
    <h1>${title}</h1>
    <p>Hi ${data.recipientName},</p>
    <p>${body}</p>

    <p style="text-align: center;">
      <a href="${data.actionUrl}" class="button">
        Open Wallet
      </a>
    </p>
  `;

  return emailWrapper(content);
}

export function brandedNotificationEmail(data: {
  recipientName: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}): string {
  const content = `
    <h1>${data.title}</h1>
    <p>Hi ${data.recipientName},</p>
    <p>${data.message}</p>
    ${data.actionUrl ? `
      <p style="text-align: center;">
        <a href="${data.actionUrl}" class="button">
          ${data.actionLabel || 'Open Ziyawa'}
        </a>
      </p>
    ` : ''}
  `;

  return emailWrapper(content);
}

export function crewInviteEmail(data: {
  recipientName: string;
  eventName: string;
  roleLabel: string;
  eventDate: string;
  eventLocation: string;
  offerLine?: string;
  noteLine?: string;
  inviteUrl: string;
}): string {
  const content = `
    <h1>You have a crew invite</h1>
    <p>Hi ${data.recipientName},</p>
    <p>You have been invited to join the Ziyawa team for <strong>${data.eventName}</strong>.</p>

    <div class="highlight-box">
      <div class="detail-row">
        <span class="detail-label">Role</span>
        <span class="detail-value">${data.roleLabel}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date</span>
        <span class="detail-value">${data.eventDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Venue</span>
        <span class="detail-value">${data.eventLocation}</span>
      </div>
      ${data.offerLine ? `<div class="detail-row"><span class="detail-label">Proposed rate</span><span class="detail-value">${data.offerLine}</span></div>` : ''}
    </div>

    ${data.noteLine ? `<div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">${data.noteLine}</div>` : ''}

    <p>You can accept this invite and activate your Ziyawa crew access using the link below.</p>

    <p style="text-align: center;">
      <a href="${data.inviteUrl}" class="button">
        Activate Crew Dashboard
      </a>
    </p>
  `;

  return emailWrapper(content);
}

export function attendeeContactOrganizerEmail(data: {
  organizerName: string;
  eventName: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  message: string;
}): string {
  const content = `
    <h1>New attendee message</h1>
    <p>Hi ${data.organizerName},</p>
    <p>You received a new message from a ticket holder for <strong>${data.eventName}</strong>.</p>

    <div class="highlight-box">
      <div class="detail-row">
        <span class="detail-label">Name</span>
        <span class="detail-value">${data.attendeeName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Email</span>
        <span class="detail-value">${data.attendeeEmail}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Phone</span>
        <span class="detail-value">${data.attendeePhone || 'Not provided'}</span>
      </div>
    </div>

    <div class="message-box">
      ${data.message.replace(/\n/g, '<br/>')}
    </div>

    <p>You can reply directly to this email to respond to the attendee.</p>
  `;

  return emailWrapper(content);
}

// Review request email
export function reviewRequestEmail(data: {
  recipientName: string;
  providerName: string;
  serviceName: string;
  reviewUrl: string;
}): string {
  const content = `
    <h1>How Was Your Experience? ⭐</h1>
    <p>Hi ${data.recipientName},</p>
    <p>We hope you had a great experience with <strong>${data.providerName}</strong> for <strong>${data.serviceName}</strong>!</p>
    
    <p>Your feedback helps other users find great services and helps providers improve.</p>
    
    <p>Would you mind taking a minute to leave a review?</p>
    
    <p style="text-align: center;">
      <a href="${data.reviewUrl}" class="button">
        Leave a Review
      </a>
    </p>
    
    <p style="font-size: 14px; color: #6b7280;">
      Your honest feedback is valuable to our community. Thank you!
    </p>
  `;
  return emailWrapper(content);
}

// Payout processed email
export function payoutProcessedEmail(data: {
  recipientName: string;
  amount: string;
  bankAccount: string;
  payoutId: string;
}): string {
  const content = `
    <h1>Payout Processed! 💸</h1>
    <p>Hi ${data.recipientName},</p>
    <p>Great news! Your payout has been processed.</p>
    
    <div class="highlight-box">
      <div class="detail-row">
        <span class="detail-label">Amount</span>
        <span class="detail-value">${data.amount}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Bank Account</span>
        <span class="detail-value">${data.bankAccount}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Reference</span>
        <span class="detail-value">${data.payoutId}</span>
      </div>
    </div>

    <p>The funds should appear in your account within 1-3 business days, depending on your bank.</p>
    
    <p style="text-align: center;">
      <a href="${SITE_URL}/dashboard/earnings" class="button">
        View Earnings Dashboard
      </a>
    </p>
    
    <p>Thank you for being part of Ziyawa!</p>
  `;
  return emailWrapper(content);
}
