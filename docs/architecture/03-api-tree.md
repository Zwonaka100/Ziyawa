# API Tree

This is the current server route inventory grouped by capability.

## Auth and Access

```text
/api/auth/admin-otp-send
/api/auth/admin-otp-verify
/api/auth/mfa-verify
```

## Discovery and Search

```text
/api/events/search
/api/ziwaphi/search
```

## Conversations and Messaging

```text
/api/conversations/start
```

## Event Operations

```text
/api/events/[id]/attendance
/api/events/[id]/attendees
/api/events/[id]/complete
/api/events/[id]/contact-organizer
/api/events/[id]/guest-list
/api/events/[id]/team
/api/events/[id]/team-access
/api/event-work
/api/event-work/accept
```

## Artist Booking Operations

```text
/api/bookings/artist-request
/api/bookings/[id]/accept-counter
/api/bookings/[id]/complete
/api/bookings/[id]/dispute
/api/bookings/[id]/respond
```

## Provider Booking Operations

```text
/api/provider-bookings
/api/provider-bookings/request
/api/provider-bookings/[id]/complete
/api/provider-bookings/[id]/dispute
```

## Ticketing and Ticket Ops

```text
/api/tickets/[id]/resend
/api/tickets/checkin
/api/tickets/claim
/api/tickets/validate
```

## Payments and Escrow

```text
/api/payments/banks
/api/payments/booking
/api/payments/deposit
/api/payments/release
/api/payments/ticket
/api/payments/verify
/api/payments/verify-account
/api/payments/withdraw
/api/webhooks/paystack
```

## Notifications and Reviews

```text
/api/notifications
/api/notifications/preferences
/api/reviews
/api/reviews/[id]
/api/reviews/[id]/helpful
```

## Reports and Verification

```text
/api/reports
/api/verification/submit
```

## Admin Control APIs

```text
/api/admin/bulk-email
/api/admin/disputes/resolve
/api/admin/send-email
/api/admin/verifications/[id]/review
```

## Automation

```text
/api/cron/event-lifecycle
```

## API Tree By Branch

```text
Platform APIs
├── Auth and Access
│   ├── /api/auth/admin-otp-send
│   ├── /api/auth/admin-otp-verify
│   └── /api/auth/mfa-verify
├── Discovery
│   ├── /api/events/search
│   └── /api/ziwaphi/search
├── Messaging
│   └── /api/conversations/start
├── Event Operations
│   ├── /api/events/[id]/attendance
│   ├── /api/events/[id]/attendees
│   ├── /api/events/[id]/complete
│   ├── /api/events/[id]/contact-organizer
│   ├── /api/events/[id]/guest-list
│   ├── /api/events/[id]/team
│   ├── /api/events/[id]/team-access
│   ├── /api/event-work
│   └── /api/event-work/accept
├── Ticketing
│   ├── /api/payments/ticket
│   ├── /api/tickets/[id]/resend
│   ├── /api/tickets/checkin
│   ├── /api/tickets/claim
│   └── /api/tickets/validate
├── Artist Booking Lifecycle
│   ├── /api/bookings/artist-request
│   ├── /api/bookings/[id]/respond
│   ├── /api/bookings/[id]/accept-counter
│   ├── /api/bookings/[id]/complete
│   └── /api/bookings/[id]/dispute
├── Provider Booking Lifecycle
│   ├── /api/provider-bookings
│   ├── /api/provider-bookings/request
│   ├── /api/provider-bookings/[id]/complete
│   └── /api/provider-bookings/[id]/dispute
├── Wallet and Escrow
│   ├── /api/payments/booking
│   ├── /api/payments/deposit
│   ├── /api/payments/release
│   ├── /api/payments/verify
│   ├── /api/payments/verify-account
│   ├── /api/payments/withdraw
│   ├── /api/payments/banks
│   └── /api/webhooks/paystack
├── Trust and Moderation
│   ├── /api/notifications
│   ├── /api/notifications/preferences
│   ├── /api/reviews
│   ├── /api/reviews/[id]
│   ├── /api/reviews/[id]/helpful
│   ├── /api/reports
│   └── /api/verification/submit
├── Admin Operations
│   ├── /api/admin/bulk-email
│   ├── /api/admin/disputes/resolve
│   ├── /api/admin/send-email
│   └── /api/admin/verifications/[id]/review
└── Automation
    └── /api/cron/event-lifecycle
```

## API Maintenance Rule

When a new route is added under `src/app/api`, update this file immediately.

Minimum update steps:

1. Add the exact API path to the correct capability section.
2. Add it to the branch tree.
3. If it changes a user flow, update [04-branch-maintenance.md](./04-branch-maintenance.md).
