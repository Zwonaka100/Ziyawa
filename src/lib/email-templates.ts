/**
 * EMAIL TEMPLATES
 * Reusable email templates for Ziyawa notifications
 */

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
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .email-wrapper {
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%);
      padding: 30px;
      text-align: center;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #ffffff;
      text-decoration: none;
    }
    .content {
      padding: 40px 30px;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      opacity: 0.9;
    }
    h1 {
      font-size: 24px;
      margin: 0 0 20px;
      color: #1a1a1a;
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
    }
    .detail-value {
      font-weight: 600;
      color: #1a1a1a;
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
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://ziyawa.co.za'}" class="logo">
          Ziyawa
        </a>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Ziyawa. All rights reserved.</p>
        <p>South Africa's Premier Events Marketplace</p>
        <div class="social-links">
          <a href="#">Facebook</a>
          <a href="#">Twitter</a>
          <a href="#">Instagram</a>
        </div>
        <p style="margin-top: 15px; font-size: 11px;">
          You're receiving this email because you have an account on Ziyawa.
          <br>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/notifications">Manage notification preferences</a>
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
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/explore" class="button">
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
      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
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
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bookings" class="button">
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
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/earnings" class="button">
        View Earnings Dashboard
      </a>
    </p>
    
    <p>Thank you for being part of Ziyawa!</p>
  `;
  return emailWrapper(content);
}
