# Route Tree

This is the current App Router page inventory grouped by branch.

## Public Routes

```text
/
/about
/faq
/terms
/privacy
/refunds
/ziwaphi
/events/[id]
/artists
/artists/[id]
/crew
/crew/[id]
/organizers
/organizers/[id]
/for/groovists
/for/organizers
/for/artists
/for/crew
/support
/support/[id]
/profile
/messages
/wallet
/payments/callback
/tickets/claim
```

## Auth Routes

```text
/auth/signin
/auth/signup
/auth/reset-password
/auth/error
/auth/mfa-setup
/auth/mfa-challenge
/auth/admin-otp
```

## Shared Dashboard Routes

```text
/dashboard
/dashboard/settings
/dashboard/settings/notifications
/dashboard/notifications
/dashboard/tickets
/dashboard/event-work
/dashboard/event-work/accept
```

## Artist Dashboard Routes

```text
/dashboard/artist
/dashboard/artist/setup
/dashboard/artist/media
/dashboard/artist/discography
/dashboard/artist/social
```

## Provider Dashboard Routes

```text
/dashboard/provider
/dashboard/provider/setup
/dashboard/provider/services
/dashboard/provider/portfolio
/dashboard/provider/media
/dashboard/provider/social
```

## Organizer Dashboard Routes

```text
/dashboard/organizer
/dashboard/organizer/reviews
/dashboard/organizer/crew

/dashboard/organizer/book
/dashboard/organizer/book-artist/[id]
/dashboard/organizer/book-crew/[id]

/dashboard/organizer/events
/dashboard/organizer/events/new
/dashboard/organizer/events/[id]/book
/dashboard/organizer/events/[id]/bookings
/dashboard/organizer/events/[id]/checkin
/dashboard/organizer/events/[id]/edit
/dashboard/organizer/events/[id]/manage
/dashboard/organizer/events/[id]/media
/dashboard/organizer/events/[id]/team
```

## Admin Routes

```text
/admin
/admin/analytics
/admin/audit-logs
/admin/disputes
/admin/events
/admin/events/[id]
/admin/finance
/admin/finance/payouts
/admin/finance/refunds
/admin/finance/transactions
/admin/finance/wallets
/admin/reports
/admin/reports/[id]
/admin/reviews
/admin/settings
/admin/support
/admin/support/[id]
/admin/users
/admin/users/[id]
/admin/users/[id]/edit
/admin/verifications

/admin/communications
/admin/communications/bulk
/admin/communications/conversations
/admin/communications/history
/admin/communications/send
/admin/communications/templates
```

## Route Tree By Platform Branch

```text
Public Experience
├── /
├── /ziwaphi
├── /events/[id]
├── /artists
├── /artists/[id]
├── /crew
├── /crew/[id]
├── /organizers
├── /organizers/[id]
├── /about
├── /faq
├── /terms
├── /privacy
├── /refunds
├── /for/groovists
├── /for/organizers
├── /for/artists
├── /for/crew
└── /support

Identity and Access
├── /auth/signin
├── /auth/signup
├── /auth/reset-password
├── /auth/error
├── /auth/mfa-setup
├── /auth/mfa-challenge
└── /auth/admin-otp

Core User Surfaces
├── /dashboard
├── /dashboard/settings
├── /dashboard/settings/notifications
├── /dashboard/notifications
├── /dashboard/tickets
├── /dashboard/event-work
├── /dashboard/event-work/accept
├── /messages
├── /wallet
├── /profile
├── /support/[id]
└── /tickets/claim

Organizer Branch
├── /dashboard/organizer
├── /dashboard/organizer/reviews
├── /dashboard/organizer/crew
├── /dashboard/organizer/book
├── /dashboard/organizer/book-artist/[id]
├── /dashboard/organizer/book-crew/[id]
└── /dashboard/organizer/events
    ├── /new
    └── /[id]
        ├── /book
        ├── /bookings
        ├── /checkin
        ├── /edit
        ├── /manage
        ├── /media
        └── /team

Artist Branch
├── /dashboard/artist
├── /dashboard/artist/setup
├── /dashboard/artist/media
├── /dashboard/artist/discography
└── /dashboard/artist/social

Provider Branch
├── /dashboard/provider
├── /dashboard/provider/setup
├── /dashboard/provider/services
├── /dashboard/provider/portfolio
├── /dashboard/provider/media
└── /dashboard/provider/social

Admin Control Plane
└── /admin
    ├── /analytics
    ├── /audit-logs
    ├── /communications
    │   ├── /bulk
    │   ├── /conversations
    │   ├── /history
    │   ├── /send
    │   └── /templates
    ├── /disputes
    ├── /events
    │   └── /[id]
    ├── /finance
    │   ├── /payouts
    │   ├── /refunds
    │   ├── /transactions
    │   └── /wallets
    ├── /reports
    │   └── /[id]
    ├── /reviews
    ├── /settings
    ├── /support
    │   └── /[id]
    ├── /users
    │   └── /[id]
    │       └── /edit
    └── /verifications
```

## Route Maintenance Rule

When a new page is added under `src/app`, update this file immediately.

Minimum update steps:

1. Add the exact route path to the correct section.
2. Add it to the branch tree.
3. If it introduces a new product branch, update [01-platform-tree.md](./01-platform-tree.md).
