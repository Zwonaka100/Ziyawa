# ZIYAWA — MASTER REFERENCE DOCUMENT

> **Version:** 2.0 | **Date:** April 2026
> **Company:** Zande Technologies (Pty) Ltd — K2025834311
> **Partner:** Rath Group (Pty) Ltd
> **Info Regulator:** 2025-066656
> **Domain:** ziyawa.com
> **Live app:** https://ziyawa.com (Vercel auto-deploys from GitHub `main`)
> **GitHub:** https://github.com/Zwonaka100/Ziyawa.git
> **Supabase Project ID:** vavjhffuaublqzltohwz

This document is the single source of truth for the Ziyawa platform — for developers, AI assistants, co-founders, and future contributors. Keep it updated as the app evolves.

For the canonical route tree, API tree, and branch maintenance floor plan, use the architecture pack in [docs/architecture/README.md](docs/architecture/README.md).

---

## TABLE OF CONTENTS

1. [What is Ziyawa?](#1-what-is-ziyawa)
2. [Technology Stack](#2-technology-stack)
3. [All Parties & Roles](#3-all-parties--roles)
4. [App Structure & Role Trees](#4-app-structure--role-trees)
5. [How Roles Interact](#5-how-roles-interact)
6. [Full Page & Route Map](#6-full-page--route-map)
7. [All API Routes](#7-all-api-routes)
8. [Database Schema — Complete](#8-database-schema--complete)
9. [State Machines](#9-state-machines)
10. [Core Workflows](#10-core-workflows)
11. [Fee & Commission Structure](#11-fee--commission-structure)
12. [Payment & Escrow System](#12-payment--escrow-system)
13. [Ziwaphi — Event Search AI](#13-ziwaphi--event-search-ai)
14. [Email & Notifications](#14-email--notifications)
15. [Admin System](#15-admin-system)
16. [Security & Auth](#16-security--auth)
17. [Storage (Media Files)](#17-storage-media-files)
18. [Codebase Structure](#18-codebase-structure)
19. [Libraries & Dependencies](#19-libraries--dependencies)
20. [Environment Variables](#20-environment-variables)
21. [Deployment & CI/CD](#21-deployment--cicd)
22. [Coding Conventions](#22-coding-conventions)
23. [Known Issues & Outstanding Work](#23-known-issues--outstanding-work)
24. [Database Migrations Log](#24-database-migrations-log)
25. [Changelog](#25-changelog)

---

## 1. WHAT IS ZIYAWA?

Ziyawa is a South African event marketplace and operating system. The name comes from the Zulu/Xhosa phrase *"Ziwaphi?"* meaning "Where is it going down?" — as in, where are the events happening.

**Core purpose:** Connect event organizers, performing artists, crew/service providers, and event-goers ("groovists") on one platform.

**What it does:**
- Organizers create and publish events, sell tickets, book artists and crew
- Artists get discovered, receive bookings, and get paid via escrow
- Crew (providers) list services (photography, sound, security, etc.), get booked and paid
- Groovists discover events, buy tickets, leave reviews, message each other
- Ziyawa earns a commission on every transaction

**What makes it different:**
- **Trust engine:** Money never moves without a verified state change
- **Escrow:** Funds are held and released only after event completion — protects both sides
- **Neutral platform:** Ziyawa sides with rules, not parties — disputes resolved by evidence
- **Stackable roles:** One person can be a groovist, organizer, artist, AND crew at the same time
- **South Africa-first:** ZAR currency, SA provinces, local payment rails (Paystack), SA slang

**Core design principles (from `src/lib/constants.ts`):**
1. Money never moves without a state change
2. Events are sacred — published events have real consequences
3. One human, many roles — roles are permissions, not identities
4. Ziyawa is a neutral platform

---

## 2. TECHNOLOGY STACK

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Framework | Next.js | 16.1.6 | App Router, Turbopack, TypeScript |
| Runtime | React | 19.2.3 | |
| Database | Supabase (PostgreSQL) | ^2.93.3 | Auth + DB + Storage + Realtime |
| Payments | Paystack | — | ZAR only. Webhooks for confirmation |
| Email | Resend | ^6.9.1 | Transactional from noreply@zande.io |
| Hosting | Vercel | — | Auto-deploys from GitHub main |
| Version Control | GitHub | — | https://github.com/Zwonaka100/Ziyawa.git |
| UI Components | shadcn/ui + Radix UI | ^1.4.3 | Accessible, headless components |
| Styling | Tailwind CSS | ^4 | Utility-first, grayscale/neutral design |
| Icons | Lucide React | ^0.563.0 | Icon library |
| QR Codes | qrcode.react | ^4.2.0 | Ticket QR codes |
| Dates | date-fns | ^4.1.0 | Date manipulation |
| Toasts | sonner | ^2.0.7 | Toast notifications |
| Search/AI | Custom rule-based | — | No external AI costs — see section 13 |

**Design system:** Simple, clean, grayscale/neutral. Minimal. No heavy gradients or colour overload.

---

## 3. ALL PARTIES & ROLES

Roles in Ziyawa are **stackable**. One user can hold multiple roles simultaneously. Roles are stored as boolean flags on the `profiles` table — not as a single enum.

### 3.1 Groovist (`role: user` — default)
The event-goer / fan. Every person who signs up becomes a Groovist by default.

| What they can do | Where |
|---|---|
| Browse and search events | `/`, `/ziwaphi` |
| Buy tickets for events | `/events/[id]` → Paystack |
| View + download tickets (QR codes) | `/dashboard/tickets` |
| Gift tickets to another user | `/dashboard/tickets` |
| Leave reviews on events they attended | `/events/[id]` |
| Message artists/organizers/other users | `/messages` |
| View wallet balance | `/wallet` |
| Deposit funds | `/wallet` |
| Withdraw funds (if verified) | `/wallet` |
| Submit identity verification | `/dashboard/settings` |
| Submit support tickets | `/support` |
| Receive notifications | `/dashboard/notifications` |

### 3.2 Organizer (`is_organizer = true` on profiles)
Creates and manages events. Pays to book artists and crew.

| What they can do | Where |
|---|---|
| Create and manage events | `/dashboard/organizer/events` |
| Set event state: draft → published → locked → completed/cancelled | Event management page |
| Create ticket types (Early Bird, VIP, General) | Event management |
| Set ticket prices and quantities | Event management |
| Upload event media (poster, gallery, YouTube/TikTok) | Event media manager |
| Assign event team members (access passes) | Event team manager |
| Book artists for events | Artists directory / event bookings |
| Pay artist booking fees (escrow) | Payment flow |
| Book crew/providers for events | Crew directory |
| Pay crew booking fees (escrow) | Payment flow |
| View ticket sales and revenue | Organizer dashboard |
| View + respond to reviews on their events | `/dashboard/organizer/reviews` |
| View organizer trust stats | Dashboard |
| Build organizer public profile (company logo, description) | Settings |

Trust stats tracked: `total_events_hosted`, `total_artists_paid`, `total_amount_paid`, `payment_completion_rate`, `organizer_rating`, `organizer_reviews`

### 3.3 Artist (`is_artist = true` on profiles)
Performer who gets discovered and booked for events.

| What they can do | Where |
|---|---|
| Set up artist profile (stage name, bio, genre, base price) | `/dashboard/artist/setup` |
| Upload portfolio (photos, audio samples) | `/dashboard/artist/media` |
| Add discography (singles, EPs, albums) | `/dashboard/artist/discography` |
| Link social accounts (Instagram, TikTok, Spotify etc) | `/dashboard/artist/social` |
| Receive and respond to booking requests | Artist dashboard |
| Accept or decline bookings | Dashboard |
| Get paid via escrow after event completion | Automatic |
| View event team assignments | `/dashboard/event-work` |
| Withdraw earnings to bank | `/wallet` |

Trust stats tracked: `total_bookings`, `completed_bookings`, `cancelled_bookings`, `no_show_count`, `average_rating`, `total_reviews`, `total_earned`, `response_rate`, `avg_response_hours`

### 3.4 Provider / Crew (`is_provider = true` on profiles)
Service provider — photographer, videographer, sound engineer, DJ equipment rental, security, MC, caterer, transport, decor, etc.

| What they can do | Where |
|---|---|
| Set up provider profile (business name, type, bio) | `/dashboard/provider/setup` |
| List multiple services with pricing | `/dashboard/provider/services` |
| Upload portfolio / past work | `/dashboard/provider/portfolio` |
| Upload photos and videos | `/dashboard/provider/media` |
| Link social accounts | `/dashboard/provider/social` |
| Receive crew booking requests | Provider dashboard |
| Accept / decline bookings | Dashboard |
| Get paid via escrow | Automatic |
| Withdraw earnings to bank | `/wallet` |

**Service categories (full list):** Sound & Lighting, Staging & AV, Event Staff, Venue Hire, Catering, Music Licensing, Photography & Video, Decor & Design, Transport, MC & Hosts, Equipment Rental, Marketing & PR, Other

**Pricing types:** Fixed, Hourly, Per Day, Negotiable

### 3.5 Admin (`is_admin = true` + mandatory 2FA)
Platform operator. Only Zande Technologies / Rath Group team members. Must complete TOTP 2FA setup before first access.

Current admins (set in migration 008):
- `mgmakgotho@gmail.com` — super_admin
- `zmabege@zande.io` — super_admin

**Admin roles:**
| Role | Access |
|---|---|
| `super_admin` | Everything |
| `admin` | Most operations, no platform settings |
| `moderator` | Content, reviews, reports |
| `support` | User management, support tickets, communications |

Full admin capabilities covered in Section 15.

**Account moderation powers:**
- `is_suspended` / `suspended_until` — temporary suspension
- `is_banned` — permanent ban
- `warnings_count` — warning tracker
- `suspension_reason` / `ban_reason` — audit trail

### 3.6 Guest (not logged in)
Can browse everything public but cannot transact.

Can access: Homepage, Ziwaphi, event listings, artist/crew/organizer public profiles, About, FAQ, Terms, Privacy, Refunds, Support page (submit ticket — optional login)

---

## 4. APP STRUCTURE & ROLE TREES

Every branch represents a page or action. Follow any path from the root down to the last leaf to understand the full journey for each user type.

```
ZIYAWA PLATFORM
│
├── 🌐  PUBLIC (no login required)
│   ├── Homepage (/)
│   │   ├── Hero video + typewriter tagline ("Hello South Ah 🇿🇦", "Ziwaphi?")
│   │   ├── Featured Events (curated from featured_events table)
│   │   ├── How It Works section
│   │   ├── Why Ziyawa section
│   │   ├── Browse by Province
│   │   └── CTAs → Sign Up / Browse Events
│   │
│   ├── Ziwaphi Event Search (/ziwaphi)
│   │   ├── Type natural language query
│   │   │   Examples: "events in Joburg this weekend", "free concerts Cape Town"
│   │   ├── Filter by city, province, price range, date
│   │   ├── Rule-based NLP parser (no AI API costs)
│   │   └── Results → click → Event Detail
│   │
│   ├── Event Detail (/events/[id])
│   │   ├── Event info (date, venue, address, description, province)
│   │   ├── Ticket types + prices
│   │   ├── Event media gallery (photos + YouTube/TikTok embeds)
│   │   ├── Reviews section (star ratings + comments)
│   │   ├── Contact organizer button
│   │   └── Buy Tickets button → (requires login)
│   │
│   ├── Artist Directory (/artists)
│   │   ├── Filter by genre, province, price range, availability
│   │   └── Artist Profile (/artists/[id])
│   │       ├── Stage name, bio, genres
│   │       ├── Base price
│   │       ├── Portfolio gallery (photos + audio)
│   │       ├── Discography (singles, EPs, albums)
│   │       ├── Social links (Instagram, TikTok, Spotify, SoundCloud, YouTube)
│   │       ├── Trust stats (bookings, rating, reviews)
│   │       └── Book Artist → (requires login + organizer role)
│   │
│   ├── Crew Directory (/crew)
│   │   ├── Filter by service type, province, price
│   │   └── Crew Profile (/crew/[id])
│   │       ├── Business name, tagline, description
│   │       ├── Services list with pricing
│   │       ├── Portfolio gallery
│   │       ├── Trust stats
│   │       └── Book Crew → (requires login + organizer role)
│   │
│   ├── Organizer Directory (/organizers)
│   │   └── Organizer Profile (/organizers/[id])
│   │       ├── Company name, logo, description
│   │       ├── Events history
│   │       └── Trust stats (events hosted, rating)
│   │
│   ├── For You landing pages
│   │   ├── /for/groovists — value prop for event-goers
│   │   ├── /for/organizers — value prop for event organizers
│   │   ├── /for/artists — value prop for performers
│   │   └── /for/crew — value prop for service providers
│   │
│   ├── /about — Company, Zande Technologies + Rath Group
│   ├── /faq — Frequently asked questions
│   ├── /terms — Terms of Service
│   ├── /privacy — POPIA-compliant Privacy Policy
│   ├── /refunds — Ticket and booking refund policy
│   ├── /support — Submit support ticket (login optional)
│   └── /support/[id] — View individual support ticket
│
│
├── 👤  GROOVIST  (role: user — all sign-ups get this)
│   │
│   ├── Auth
│   │   ├── Sign Up (/auth/signup)
│   │   │   └── Email + password → Supabase Auth → profile auto-created
│   │   ├── Sign In (/auth/signin)
│   │   │   └── Email + password → session cookie
│   │   ├── Reset Password (/auth/reset-password)
│   │   └── OAuth Callback (/auth/callback)
│   │
│   ├── Buy Tickets
│   │   ├── Browse events on / or /ziwaphi
│   │   ├── Open event /events/[id]
│   │   ├── Select ticket tier + quantity
│   │   ├── Enter attendee details (name, email, phone)
│   │   ├── POST /api/payments/ticket → Paystack initialize
│   │   ├── Redirected to Paystack payment page (card)
│   │   ├── Paystack processes → webhook fires
│   │   ├── Ticket created → email sent → notification created
│   │   └── Redirect to /payments/callback → confirmation page
│   │
│   ├── My Tickets (/dashboard/tickets)
│   │   ├── List all purchased tickets
│   │   ├── View ticket details (event, date, venue, type)
│   │   ├── View QR code (for door check-in)
│   │   ├── Download / screenshot ticket
│   │   └── Gift ticket → enter recipient email → transfer ownership
│   │
│   ├── Claim Gifted Ticket (/tickets/claim)
│   │   └── Enter claim token from gifted ticket email
│   │
│   ├── Leave a Review
│   │   ├── After event → notification prompts review
│   │   ├── Go to /events/[id]
│   │   ├── Rate 1–5 stars + write comment
│   │   ├── Optionally anonymous
│   │   └── Review verified if a ticket was found for that event
│   │
│   ├── Messages (/messages)
│   │   ├── View all conversations
│   │   ├── Start new conversation with any user
│   │   ├── Real-time chat (Supabase Realtime)
│   │   └── Unread indicator in navbar
│   │
│   ├── Wallet (/wallet)
│   │   ├── View available balance (wallet_balance)
│   │   ├── View held balance (held_balance — escrow)
│   │   ├── View pending payout (pending_payout_balance)
│   │   ├── Deposit funds → POST /api/payments/deposit → Paystack
│   │   └── Withdraw to bank
│   │       ├── Requires is_verified = true (identity check)
│   │       ├── Minimum R100, flat R20 fee
│   │       ├── POST /api/payments/verify-account → confirm account name
│   │       └── POST /api/payments/withdraw → Paystack transfer
│   │
│   ├── Notifications (/dashboard/notifications)
│   │   ├── Bell icon in navbar shows unread count
│   │   ├── Mark individual or all as read
│   │   ├── Click notification → follow link to relevant page
│   │   └── Types: ticket bought, booking updates, event reminders, reviews
│   │
│   ├── Profile (/profile)
│   │   └── Public-facing profile page
│   │
│   ├── Settings (/dashboard/settings)
│   │   ├── Edit profile (name, phone, bio, avatar)
│   │   ├── Enable/disable role flags (become organizer, artist, provider)
│   │   ├── Submit identity verification
│   │   │   ├── Upload ID document (SA ID / passport / driver's licence)
│   │   │   ├── Upload selfie
│   │   │   └── POST /api/verification/submit → stored in Supabase storage
│   │   ├── Bank details (for withdrawals)
│   │   └── Optional 2FA (TOTP) for non-admin users
│   │
│   └── Support (/support → /support/[id])
│       ├── Submit new support ticket (subject, category, description)
│       ├── Categories: general, payment, event, technical, report, refund, account
│       ├── View ticket status (open/in_progress/waiting/resolved/closed)
│       └── Reply to ticket thread
│
│
├── 🎪  ORGANIZER  (is_organizer = true — stacks on top of Groovist)
│   │
│   ├── Organizer Dashboard (/dashboard/organizer)
│   │   ├── Events summary (total, published, upcoming, completed)
│   │   ├── Revenue overview
│   │   └── Upcoming bookings + events
│   │
│   ├── My Events (/dashboard/organizer/events)
│   │   ├── List all events (with state badges)
│   │   └── Create New Event (/dashboard/organizer/events/new)
│   │
│   ├── Manage Single Event (/dashboard/organizer/events/[id])
│   │   │
│   │   ├── Tab: EVENT DETAILS
│   │   │   ├── Title, short description, long description
│   │   │   ├── Venue name, venue address
│   │   │   ├── City (free text) + Province (SA dropdown)
│   │   │   ├── Event date (calendar picker)
│   │   │   ├── Start time, end time, doors open time
│   │   │   ├── Capacity (max attendees)
│   │   │   ├── Category (Music, Sports, Comedy, Arts, etc.)
│   │   │   └── Cover image upload
│   │   │
│   │   ├── Tab: TICKET TYPES
│   │   │   ├── Add ticket tier (name: Early Bird / General / VIP / Custom)
│   │   │   ├── Set price per tier (ZAR, 0 = free)
│   │   │   ├── Set quantity per tier
│   │   │   ├── Set description
│   │   │   ├── Activate / deactivate tiers
│   │   │   └── Sort order (controls display order on event page)
│   │   │
│   │   ├── Tab: EVENT MEDIA
│   │   │   ├── Upload poster image → stored in Supabase storage
│   │   │   ├── Upload gallery photos (multiple)
│   │   │   ├── Add YouTube link (embed ID extracted)
│   │   │   ├── Add TikTok link
│   │   │   └── Reorder / delete media items
│   │   │
│   │   ├── Tab: EVENT TEAM (Access Passes)
│   │   │   ├── Find team member by email
│   │   │   ├── Assign role (Photographer, Stage Manager, Security, DJ, Host, Other)
│   │   │   ├── Set access pass expiry
│   │   │   ├── Generate QR access pass
│   │   │   └── Remove team member
│   │   │
│   │   ├── Tab: ARTIST BOOKINGS
│   │   │   ├── Search artists
│   │   │   ├── Send booking request (offered amount, notes, requirements)
│   │   │   ├── View booking status (pending / accepted / confirmed / completed)
│   │   │   ├── Pay when artist accepts → POST /api/payments/booking
│   │   │   └── View all bookings for this event
│   │   │
│   │   └── EVENT STATE CONTROLS
│   │       ├── Publish → state: published → visible on Ziwaphi
│   │       ├── Lock → state: locked → no new bookings
│   │       ├── Complete → state: completed → triggers escrow release (48h)
│   │       └── Cancel → state: cancelled → triggers refunds
│   │
│   ├── Book Crew (/dashboard/organizer/book-crew)
│   │   ├── Browse providers by service type and province
│   │   ├── View service details and pricing
│   │   ├── Send crew booking request (offered amount, notes, service date, requirements)
│   │   └── POST /api/payments/booking {bookingType: 'crew'}
│   │
│   ├── My Crew Bookings (/dashboard/organizer/crew)
│   │   ├── View all crew bookings across all events
│   │   ├── Filter by status
│   │   └── Pay when crew accepts
│   │
│   ├── Reviews Dashboard (/dashboard/organizer/reviews)
│   │   ├── See all reviews left on all your events
│   │   ├── View average ratings
│   │   └── Respond to reviews (organizer_response field)
│   │
│   └── Organizer Profile (same as Settings → is_organizer section)
│       ├── Company name, logo, description
│       ├── Company website
│       └── Years in business
│
│
├── 🎤  ARTIST  (is_artist = true — stacks on top of Groovist)
│   │
│   ├── Artist Dashboard (/dashboard/artist)
│   │   ├── Profile completeness indicator
│   │   ├── Upcoming confirmed bookings
│   │   ├── Pending booking requests (with accept/decline actions)
│   │   ├── Earnings overview
│   │   └── Quick links to setup sections
│   │
│   ├── Profile Setup (/dashboard/artist/setup)
│   │   ├── Stage name (public display name)
│   │   ├── Short bio + long bio
│   │   ├── Primary genre + additional genres
│   │   ├── Base price (minimum booking fee in ZAR)
│   │   ├── Province / location
│   │   ├── Availability toggle
│   │   ├── Advance notice days required
│   │   ├── Record label (optional)
│   │   ├── Management contact (optional)
│   │   ├── Press kit URL (optional)
│   │   └── Rider document URL (optional)
│   │
│   ├── Media (/dashboard/artist/media)
│   │   ├── Upload profile photo
│   │   ├── Upload cover/banner image
│   │   ├── Upload portfolio gallery (photos)
│   │   └── Upload audio samples (mp3, wav — max 20MB each)
│   │
│   ├── Discography (/dashboard/artist/discography)
│   │   ├── Add release: title, type (single/EP/album/mixtape/compilation/live)
│   │   ├── Cover art upload
│   │   ├── Release date
│   │   ├── Streaming links (Spotify, Apple Music, SoundCloud, etc.)
│   │   └── Delete/edit releases
│   │
│   ├── Social Links (/dashboard/artist/social)
│   │   └── Add links: Instagram, YouTube, TikTok, Facebook, Twitter,
│   │                   Spotify, Apple Music, SoundCloud, Bandcamp, Deezer, website
│   │
│   ├── Booking Requests
│   │   ├── Notification received when organizer sends request
│   │   ├── View request: event details, offered amount, requirements
│   │   ├── Accept → organizer notified → organizer must pay to confirm
│   │   ├── Decline → organizer notified (with optional reason)
│   │   └── After confirmed (paid) → performance locked in
│   │
│   ├── Event Work (/dashboard/event-work)
│   │   ├── Events where assigned as a team member
│   │   ├── View access pass + QR code for event entry
│   │   └── Separate from bookings — this is team assignments by organizer
│   │
│   ├── Earnings & Wallet
│   │   ├── Booking payout held until event Completed + 24h
│   │   ├── Released to wallet_balance
│   │   └── Withdraw to bank → see Wallet flow above
│   │
│   └── Public Profile (/artists/[id])
│       └── Visible to everyone — this is what organizers see when booking
│
│
├── 🎥  CREW / PROVIDER  (is_provider = true — stacks on top of Groovist)
│   │
│   ├── Provider Dashboard (/dashboard/provider)
│   │   ├── Active crew bookings
│   │   ├── Pending requests
│   │   └── Earnings overview
│   │
│   ├── Profile Setup (/dashboard/provider/setup)
│   │   ├── Business name
│   │   ├── Tagline
│   │   ├── Description
│   │   ├── Primary service category
│   │   ├── Work mode: looking_for_work / offering_services / both
│   │   ├── Province
│   │   ├── Base rate + rate type (fixed/hourly/daily/negotiable)
│   │   ├── Business phone + email + website
│   │   ├── Years in business
│   │   ├── Team size
│   │   └── Availability notes
│   │
│   ├── Services (/dashboard/provider/services)
│   │   ├── Add service: name, category, description, price, price type
│   │   ├── Upload service image
│   │   ├── Activate / deactivate individual services
│   │   └── Delete services
│   │
│   ├── Portfolio (/dashboard/provider/portfolio)
│   │   └── Upload work samples / past event photos
│   │
│   ├── Media (/dashboard/provider/media)
│   │   ├── Profile photo
│   │   └── Gallery photos + videos
│   │
│   ├── Social Links (/dashboard/provider/social)
│   │   └── Instagram, YouTube, Facebook, website, LinkedIn, etc.
│   │
│   ├── Crew Booking Requests
│   │   ├── Notification when organizer sends request
│   │   ├── View request: event, service, date, offered amount
│   │   ├── Accept → organizer pays → escrow held
│   │   └── Decline → organizer notified
│   │
│   ├── Event Work (/dashboard/event-work)
│   │   └── Team assignments (same as Artist section)
│   │
│   ├── Earnings & Wallet
│   │   └── Crew payout released after event Completed + 24h
│   │
│   └── Public Profile (/crew/[id])
│       └── Visible to all — organizers book from here
│
│
└── 🛡️  ADMIN  (is_admin = true + mandatory 2FA — Zande Technologies only)
    │
    ├── 2FA Login Gate (enforced by middleware)
    │   ├── First login → /auth/mfa-setup
    │   │   ├── Auto-cleans stale unverified factors
    │   │   ├── QR code displayed for Google Authenticator / Authy
    │   │   ├── Enter 6-digit code to verify
    │   │   └── Enrolled → redirected to /admin
    │   └── Every subsequent login → /auth/mfa-challenge
    │       ├── Enter 6-digit TOTP code
    │       └── Session upgraded to aal2 → /admin access granted
    │
    ├── Admin Dashboard (/admin)
    │   ├── Total users (growth chart)
    │   ├── Active events
    │   ├── Total revenue
    │   ├── Pending verifications count
    │   └── Open disputes count
    │
    ├── Users (/admin/users)
    │   ├── Search / filter all users
    │   ├── View full profile (all fields)
    │   ├── Edit: name, email, phone, bio, avatar
    │   ├── Toggle role flags: is_organizer, is_artist, is_provider, is_admin
    │   ├── Set admin_role
    │   ├── Issue warning (user_warnings table)
    │   ├── Suspend account (is_suspended, suspended_until, suspension_reason)
    │   └── Ban account (is_banned, ban_reason)
    │
    ├── Identity Verifications (/admin/verifications)
    │   ├── View all pending verification requests
    │   ├── View uploaded ID document + selfie
    │   ├── Approve → is_verified = true → withdrawal unlocked → user notified
    │   └── Reject → reason recorded → user notified
    │
    ├── Events (/admin/events)
    │   ├── View all events across all organizers
    │   ├── Filter by state, province, date
    │   ├── View event details
    │   ├── Force state change (emergency override)
    │   └── Feature event (adds to featured_events table with position + expiry)
    │
    ├── Finance (/admin/finance)
    │   ├── View all transactions
    │   ├── Filter by type, state, date, user
    │   ├── View escrow balances per user
    │   └── Manually release held funds → POST /api/payments/release
    │
    ├── Disputes (/admin/disputes)
    │   ├── View all open disputes (booking.state = 'disputed')
    │   ├── View evidence from both parties
    │   ├── Add admin notes
    │   └── Resolve → POST /api/admin/disputes/resolve
    │       ├── Resolve for organizer → booking cancelled → refund
    │       └── Resolve for artist → booking completed → payout
    │
    ├── Reviews (/admin/reviews)
    │   ├── View all reviews across platform
    │   ├── Filter by rating, event, user
    │   └── Remove inappropriate reviews
    │
    ├── Reports (/admin/reports)
    │   ├── View all user/event/review reports
    │   ├── Assign to admin
    │   ├── Update status (pending/under_review/resolved/dismissed)
    │   └── Write resolution
    │
    ├── Communications (/admin/communications)
    │   ├── Individual email → POST /api/admin/send-email
    │   │   ├── Select user by email
    │   │   ├── Write subject + body
    │   │   └── Sent from noreply@zande.io via Resend
    │   └── Bulk email → POST /api/admin/bulk-email
    │       ├── Target: all users / organizers / artists / providers
    │       └── Write subject + body
    │
    ├── Audit Logs (/admin/audit-logs)
    │   ├── Every admin action logged in admin_audit_logs table
    │   ├── Filter by admin, action type, date
    │   └── View action details (target, old value, new value, IP)
    │
    ├── Analytics (/admin/analytics)
    │   ├── User growth (by role)
    │   ├── Ticket sales (volume + revenue)
    │   ├── Booking stats (by type)
    │   └── Top events, top organizers, top artists
    │
    ├── Settings (/admin/settings)
    │   └── platform_settings table (key/value pairs — commission rate, support email, etc.)
    │
    └── Support Tickets (/admin/support)
        ├── View all support tickets
        ├── Filter by status, category, priority
        ├── Assign ticket to admin
        ├── Reply to ticket (is_admin_reply = true)
        └── Change status + resolve
```

---

## 5. HOW ROLES INTERACT

```
┌─────────────────────────────────────────────────────────────┐
│                     ZIYAWA PLATFORM                         │
│                  (neutral trust engine)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
  ┌──────────┐      ┌────────────┐     ┌──────────────┐
  │GROOVIST  │      │ ORGANIZER  │     │ ADMIN        │
  └────┬─────┘      └─────┬──────┘     └──────┬───────┘
       │                  │                   │
       │ buys tickets      │ creates events    │ approves IDs
       │ leaves reviews    │ books artists     │ resolves disputes
       │ messages anyone   │ books crew        │ releases escrow
       │                  │ sells tickets      │ manages users
       │                  │ manages payouts    │ sends bulk email
       │                  │                   │
       ▼                  │            ┌──────┴──────────────┐
  Ticket → event          │            │ monitors all flows  │
  QR at door ←────────────┤            │ full audit trail    │
  review on event ─────── ┘            └─────────────────────┘
                          │
              ┌───────────┴────────────┐
              │                        │
              ▼                        ▼
        ┌──────────┐            ┌──────────────┐
        │  ARTIST  │            │ CREW/PROVIDER│
        └────┬─────┘            └──────┬───────┘
             │                         │
             │ receives booking request│ receives crew booking
             │ accepts/declines        │ accepts/declines
             │ gets paid via escrow    │ gets paid via escrow
             │ after event complete    │ after event complete
             │                         │
             └──────────┬──────────────┘
                        ▼
               Withdraw to SA bank
               (Paystack transfer, R20 fee)
               after identity verification
```

### Money Flow

```
GROOVIST                ORGANIZER                ARTIST / CREW
    │                        │                        │
    │  pays for ticket        │                        │
    ├───────────────────────►│                        │
    │                        │  pays for booking       │
    │                        ├───────────────────────►│
    │                        │                        │
    │           PAYSTACK collects → Webhook confirms   │
    │                        │                        │
    │           Funds placed in ESCROW (held_balance)  │
    │                        │                        │
    │           Event COMPLETED                       │
    │           + 48h (tickets) / 24h (bookings) delay│
    │                        │                        │
    │                    ────┼────────────────────────│
    │                        │                        │
    │                        ▼                        ▼
    │               Organizer wallet          Artist/Crew wallet
    │               (wallet_balance)          (wallet_balance)
    │               credited                  credited minus fee
    │
    │   ← if event CANCELLED → full refund to groovist wallet
```

### Communication Channels

| From | To | How |
|---|---|---|
| Groovist | Organizer | Messages (/messages) |
| Groovist | Artist | Messages (/messages) |
| Groovist | Any user | Messages (/messages) |
| Organizer | Artist | Booking request → notification + messages |
| Organizer | Crew | Crew booking request → notification |
| Artist | Organizer | Accept/Decline → notification |
| Crew | Organizer | Accept/Decline → notification |
| Platform | Any user | In-app notification (auto from code) |
| Platform | Any user | Email via Resend (auto from code) |
| Admin | Any user | Individual email (/admin/communications) |
| Admin | All users | Bulk email (/admin/communications) |
| Admin | User | Support ticket reply |

---

## 6. FULL PAGE & ROUTE MAP

### Public Pages (no login)

| Route | Description |
|---|---|
| `/` | Homepage — hero video, featured events, how it works, CTAs |
| `/about` | Company info, Zande Technologies + Rath Group partnership |
| `/faq` | Frequently asked questions |
| `/terms` | Terms of Service |
| `/privacy` | Privacy Policy (POPIA compliant) |
| `/refunds` | Refund Policy |
| `/ziwaphi` | Ziwaphi AI event search |
| `/events/[id]` | Event detail — info, tickets, gallery, reviews |
| `/artists` | Artist directory with filters |
| `/artists/[id]` | Public artist profile + booking button |
| `/crew` | Crew/provider directory with filters |
| `/crew/[id]` | Public provider profile + booking button |
| `/organizers` | Organizer directory |
| `/organizers/[id]` | Public organizer profile |
| `/for/groovists` | Landing page for event-goers |
| `/for/organizers` | Landing page for event organizers |
| `/for/artists` | Landing page for performers |
| `/for/crew` | Landing page for service providers |
| `/support` | Support ticket submission (login optional) |
| `/support/[id]` | Individual support ticket view |
| `/robots.ts` | robots.txt (auto-generated) |
| `/sitemap.ts` | sitemap.xml (auto-generated) |

### Auth Pages

| Route | Description |
|---|---|
| `/auth/signin` | Email + password sign in |
| `/auth/signup` | Register new account |
| `/auth/callback` | Supabase OAuth + magic link callback |
| `/auth/error` | Auth error display page |
| `/auth/reset-password` | Password reset |
| `/auth/mfa-setup` | First-time 2FA setup (admin only) |
| `/auth/mfa-challenge` | 2FA code entry (every admin login) |

### Dashboard Pages (login required)

| Route | Who | Description |
|---|---|---|
| `/dashboard` | All | Redirect based on role |
| `/dashboard/settings` | All | Account settings, verification, 2FA |
| `/dashboard/notifications` | All | Notification centre |
| `/dashboard/tickets` | All | My purchased tickets + QR codes |
| `/dashboard/event-work` | Artist/Provider | Event team assignments |
| `/dashboard/artist` | Artist | Artist dashboard overview |
| `/dashboard/artist/setup` | Artist | Profile setup wizard |
| `/dashboard/artist/media` | Artist | Photos + audio samples |
| `/dashboard/artist/discography` | Artist | Add / manage releases |
| `/dashboard/artist/social` | Artist | Social platform links |
| `/dashboard/organizer` | Organizer | Organizer overview |
| `/dashboard/organizer/events` | Organizer | My events list |
| `/dashboard/organizer/events/new` | Organizer | Create new event |
| `/dashboard/organizer/events/[id]` | Organizer | Manage event (details, tickets, team, media, bookings) |
| `/dashboard/organizer/events/[id]/edit` | Organizer | Edit event details |
| `/dashboard/organizer/events/[id]/manage` | Organizer | Manage live event |
| `/dashboard/organizer/events/[id]/media` | Organizer | Media manager |
| `/dashboard/organizer/events/[id]/team` | Organizer | Team member management |
| `/dashboard/organizer/events/[id]/bookings` | Organizer | Artist bookings for this event |
| `/dashboard/organizer/events/[id]/book` | Organizer | Book an artist for this event |
| `/dashboard/organizer/events/[id]/checkin` | Organizer | Ticket check-in tool |
| `/dashboard/organizer/reviews` | Organizer | Reviews on my events |
| `/dashboard/organizer/book-crew` | Organizer | Browse + book crew |
| `/dashboard/organizer/crew` | Organizer | My crew bookings |
| `/dashboard/provider` | Provider | Provider dashboard |
| `/dashboard/provider/setup` | Provider | Profile setup |
| `/dashboard/provider/services` | Provider | Services management |
| `/dashboard/provider/portfolio` | Provider | Portfolio management |
| `/dashboard/provider/media` | Provider | Photos + videos |
| `/dashboard/provider/social` | Provider | Social links |
| `/messages` | All | Messaging inbox |
| `/wallet` | All | Wallet — balance, deposit, withdraw |
| `/profile` | All | My public profile |
| `/payments/callback` | All | Paystack redirect after payment |
| `/tickets/claim` | All | Claim a gifted ticket |

### Admin Pages (login + 2FA + is_admin)

| Route | Description |
|---|---|
| `/admin` | Admin overview dashboard |
| `/admin/analytics` | Analytics and stats |
| `/admin/audit-logs` | Full audit trail |
| `/admin/communications` | Email users (individual + bulk) |
| `/admin/disputes` | Dispute management |
| `/admin/events` | All events management |
| `/admin/finance` | Transactions, escrow, payouts |
| `/admin/reports` | User/event/review reports |
| `/admin/reviews` | Review moderation |
| `/admin/settings` | Platform settings |
| `/admin/support` | Support ticket management |
| `/admin/users` | User management |
| `/admin/verifications` | Identity verification approvals |

---

## 7. ALL API ROUTES

### Payments

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/payments/ticket` | User | Initialize ticket purchase via Paystack |
| POST | `/api/payments/booking` | Organizer | Initialize artist or crew booking payment |
| POST | `/api/payments/deposit` | User | Add funds to wallet via Paystack |
| POST | `/api/payments/withdraw` | Verified user | Withdraw from wallet to SA bank account |
| GET | `/api/payments/verify` | User | Verify Paystack payment by reference |
| POST | `/api/payments/verify-account` | User | Verify SA bank account via Paystack |
| GET | `/api/payments/banks` | User | List all SA banks supported by Paystack |
| GET | `/api/payments/release` | Admin/Cron | Preview releasable escrow funds |
| POST | `/api/payments/release` | Admin/Cron | Release held escrow funds |

### Webhooks

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/webhooks/paystack` | Paystack HMAC-SHA512 | Handle: `charge.success`, `transfer.success`, `transfer.failed`, `transfer.reversed` |

### Tickets

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/tickets/[id]` | Owner | Get ticket details |
| POST | `/api/tickets/[id]/resend` | Owner | Resend ticket email |
| POST | `/api/tickets/checkin` | Organizer | Check in a ticket (mark used) |
| POST | `/api/tickets/validate` | Organizer | Validate ticket QR code without checking in |
| GET | `/api/tickets/claim` | Public | Look up a claim token |
| POST | `/api/tickets/claim` | User | Claim a gifted ticket |

### Events

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/events/search` | Public | Search/filter published events |
| GET | `/api/events/[id]` | Public | Get event + ticket types + reviews |
| PUT | `/api/events/[id]` | Organizer (owner) | Update event |
| DELETE | `/api/events/[id]` | Organizer (owner) | Delete draft event |
| GET | `/api/events/[id]/team` | Organizer | Get event team members |
| POST | `/api/events/[id]/team` | Organizer | Add team member (access pass) |
| GET | `/api/events/[id]/team-access` | Team member | Verify team access |
| GET | `/api/events/[id]/attendees` | Organizer | Get attendee list |
| POST | `/api/events/[id]/attendees` | Organizer | Add attendee manually |
| GET | `/api/events/[id]/guest-list` | Organizer | Get guest list |
| POST | `/api/events/[id]/guest-list` | Organizer | Add guest |
| GET | `/api/events/[id]/attendance` | Organizer | Attendance stats |
| POST | `/api/events/[id]/complete` | Organizer | Mark event as completed |
| POST | `/api/events/[id]/contact-organizer` | User | Send message to organizer |

### Bookings (Artist)

| Method | Route | Auth | Description |
|---|---|---|---|
| GET/PATCH | `/api/bookings/[id]` | Organizer/Artist | Get or update booking state |
| POST | `/api/bookings/[id]/complete` | Organizer + Artist | Mark booking as completed (dual confirmation) |
| POST | `/api/bookings/[id]/dispute` | Organizer/Artist | Raise a dispute on a booking |

### Provider Bookings (Crew)

| Method | Route | Auth | Description |
|---|---|---|---|
| GET/PATCH | `/api/provider-bookings` | Provider/Organizer | List or update provider bookings |
| PATCH | `/api/provider-bookings/[id]` | Provider/Organizer | Update single provider booking |
| POST | `/api/provider-bookings/[id]/complete` | Organizer + Provider | Mark crew booking as completed |
| POST | `/api/provider-bookings/[id]/dispute` | Organizer/Provider | Raise dispute |

### Notifications

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications` | User | Get notifications (paginated, unread count) |
| PATCH | `/api/notifications` | User | Mark notifications as read |
| DELETE | `/api/notifications` | User | Delete notifications |
| GET | `/api/notifications/preferences` | User | Get notification preferences |
| PATCH | `/api/notifications/preferences` | User | Update notification preferences |

### Reviews

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/reviews` | Public | Get reviews (by eventId or userId) |
| POST | `/api/reviews` | User (ticket holder) | Submit a review |
| GET | `/api/reviews/[id]` | Public | Get single review |
| PATCH | `/api/reviews/[id]` | Owner | Edit review |
| DELETE | `/api/reviews/[id]` | Owner/Admin | Delete review |
| POST | `/api/reviews/[id]/helpful` | User | Vote review as helpful |
| GET | `/api/reviews/[id]/helpful` | Public | Check if user voted |

### Conversations / Messaging

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/conversations/start` | User | Start a new conversation with another user |

### Event Work

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/event-work` | Artist/Provider | Get all events where I'm a team member |
| POST | `/api/event-work/accept` | Team member | Accept event team assignment |

### Verification

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/verification/submit` | User | Submit identity documents |
| GET | `/api/verification/submit` | User | Get own verification status |

### Ziwaphi

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/ziwaphi/search` | Public | Rule-based NLP event search |

### Admin

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/admin/send-email` | Admin | Send individual email to user |
| POST | `/api/admin/bulk-email` | Admin | Send bulk email to user segment |
| GET | `/api/admin/verifications` | Admin | List verification requests |
| POST | `/api/admin/verifications/[id]/review` | Admin | Approve or reject verification |
| POST | `/api/admin/disputes/resolve` | Admin | Resolve a dispute |

### Auth Helpers

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/mfa-verify` | User | Server-side MFA code verification |

### Cron Jobs (Vercel Cron)

| Method | Route | Schedule | Description |
|---|---|---|---|
| GET | `/api/cron/event-lifecycle` | Daily | Lock upcoming events, send reminders, mark completed, trigger escrow release |

---

## 8. DATABASE SCHEMA — COMPLETE

### All Tables

| Table | Purpose |
|---|---|
| `profiles` | All users — extends Supabase auth.users |
| `artists` | Artist profiles (linked to profiles) |
| `providers` | Crew/provider profiles (linked to profiles) |
| `provider_services` | Individual services offered by a provider |
| `events` | Events created by organizers |
| `event_ticket_types` | Ticket tiers per event (VIP, General, etc.) |
| `tickets` | Purchased tickets |
| `bookings` | Artist bookings (organizer → artist) |
| `provider_bookings` | Crew bookings (organizer → provider) |
| `transactions` | Full financial audit trail |
| `payouts` | Bank payout records |
| `notifications` | In-app notifications |
| `reviews` | Event reviews and ratings |
| `review_helpful_votes` | Helpful votes on reviews |
| `event_rating_summaries` | Computed avg rating per event |
| `conversations` | Messaging threads |
| `messages` | Individual messages in conversations |
| `event_media` | Photos/videos/YouTube links per event |
| `artist_media` | Artist portfolio media |
| `provider_media` | Provider portfolio media |
| `organizer_media` | Organizer media |
| `artist_social_links` | Artist social platform links |
| `provider_social_links` | Provider social platform links |
| `organizer_social_links` | Organizer social platform links |
| `event_team_members` | Team members assigned to an event |
| `event_access_passes` | QR access passes for event team |
| `verification_requests` | Identity verification submissions |
| `dispute_tracking` | Dispute evidence and resolution |
| `reports` | User reports on users/events/reviews |
| `user_warnings` | Admin-issued user warnings |
| `support_tickets` | Customer support tickets |
| `ticket_replies` | Replies within support tickets |
| `email_templates` | Admin-managed email templates |
| `email_logs` | Log of all sent emails |
| `admin_audit_logs` | Full audit trail of admin actions |
| `platform_settings` | Key/value platform config |
| `featured_events` | Curated featured events for homepage |
| `audit_log` | General system audit trail |

---

### Detailed Table Schemas

#### `profiles`
```sql
id UUID PK (references auth.users)
email TEXT UNIQUE
full_name TEXT
phone TEXT
avatar_url TEXT
bio TEXT
location sa_province (TEXT from migration 003)

-- Role flags (stackable)
is_artist BOOLEAN DEFAULT false
is_organizer BOOLEAN DEFAULT false
is_provider BOOLEAN DEFAULT false
is_admin BOOLEAN DEFAULT false
admin_role TEXT ('super_admin'|'admin'|'moderator'|'support')

-- Wallet (3 buckets)
wallet_balance DECIMAL(12,2) DEFAULT 0
held_balance DECIMAL(12,2) DEFAULT 0          -- escrow
pending_payout_balance DECIMAL(12,2) DEFAULT 0 -- in-transit

-- Bank
bank_name TEXT
bank_account_number TEXT
bank_account_holder TEXT

-- Verification
is_verified BOOLEAN DEFAULT false
verified_at TIMESTAMPTZ

-- Organizer fields
company_name TEXT
company_description TEXT
company_logo TEXT
company_website TEXT
years_in_business INTEGER

-- Organizer trust stats
total_events_hosted INTEGER DEFAULT 0
total_artists_paid INTEGER DEFAULT 0
total_amount_paid DECIMAL(14,2) DEFAULT 0
payment_completion_rate DECIMAL(5,2) DEFAULT 100
organizer_rating DECIMAL(3,2) DEFAULT 0
organizer_reviews INTEGER DEFAULT 0
total_organizer_reviews INTEGER DEFAULT 0
organizer_verified_at TIMESTAMPTZ

-- Account moderation
is_suspended BOOLEAN DEFAULT false
suspended_at TIMESTAMPTZ
suspended_until TIMESTAMPTZ
suspension_reason TEXT
is_banned BOOLEAN DEFAULT false
banned_at TIMESTAMPTZ
ban_reason TEXT
warnings_count INTEGER DEFAULT 0

created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

#### `artists`
```sql
id UUID PK
profile_id UUID UNIQUE (ref profiles)
stage_name TEXT
bio TEXT
bio_long TEXT
genre TEXT
location sa_province
profile_image TEXT
base_price DECIMAL(12,2)
is_available BOOLEAN DEFAULT true
advance_notice_days INTEGER DEFAULT 7
years_active INTEGER
record_label TEXT
management_contact TEXT
rider_document_url TEXT
press_kit_url TEXT

-- Trust stats
total_bookings INTEGER DEFAULT 0
completed_bookings INTEGER DEFAULT 0
cancelled_bookings INTEGER DEFAULT 0
no_show_count INTEGER DEFAULT 0
average_rating DECIMAL(3,2) DEFAULT 0
total_reviews INTEGER DEFAULT 0
total_earned DECIMAL(14,2) DEFAULT 0
response_rate DECIMAL(5,2) DEFAULT 100
avg_response_hours INTEGER DEFAULT 24
verified_at TIMESTAMPTZ

created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

#### `providers`
```sql
id UUID PK
profile_id UUID UNIQUE (ref profiles)
business_name TEXT
tagline TEXT
description TEXT
primary_category service_category
work_mode crew_work_mode ('looking_for_work'|'offering_services'|'both')
base_rate DECIMAL
rate_type price_type ('fixed'|'hourly'|'daily'|'negotiable')
availability_notes TEXT
work_roles TEXT[]
location sa_province
profile_image TEXT
business_phone TEXT
business_email TEXT
website TEXT
is_available BOOLEAN DEFAULT true
advance_notice_days INTEGER DEFAULT 3
years_in_business INTEGER
team_size INTEGER
insurance_verified BOOLEAN DEFAULT false

-- Trust stats
total_bookings INTEGER DEFAULT 0
completed_bookings INTEGER DEFAULT 0
cancelled_bookings INTEGER DEFAULT 0
average_rating DECIMAL(3,2) DEFAULT 0
total_reviews INTEGER DEFAULT 0
total_earned DECIMAL(14,2) DEFAULT 0
response_rate DECIMAL(5,2) DEFAULT 100
avg_response_hours INTEGER DEFAULT 24
verified_at TIMESTAMPTZ

created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

#### `provider_services`
```sql
id UUID PK
provider_id UUID (ref providers)
category service_category
service_name TEXT
description TEXT
image_url TEXT
base_price DECIMAL(12,2)
price_type TEXT ('fixed'|'hourly'|'daily'|'negotiable')
is_available BOOLEAN DEFAULT true
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
UNIQUE(provider_id, service_name)
```

#### `events`
```sql
id UUID PK
organizer_id UUID (ref profiles)
title TEXT
description TEXT
venue TEXT
venue_address TEXT
location sa_province
event_date DATE
start_time TIME
end_time TIME
doors_open TIME
ticket_price DECIMAL(12,2)  -- base price if no ticket types
capacity INTEGER
tickets_sold INTEGER DEFAULT 0
cover_image TEXT
state event_state DEFAULT 'draft'
is_published BOOLEAN DEFAULT false  -- legacy, synced with state
published_at TIMESTAMPTZ
locked_at TIMESTAMPTZ
completed_at TIMESTAMPTZ
organizer_completed_at TIMESTAMPTZ  -- dual-confirm completion
admin_completed_at TIMESTAMPTZ
payout_hold_until TIMESTAMPTZ       -- when escrow releases
completion_notes TEXT
cancelled_at TIMESTAMPTZ
cancellation_reason TEXT
total_revenue DECIMAL(12,2) DEFAULT 0
total_booking_costs DECIMAL(12,2) DEFAULT 0
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

#### `event_ticket_types`
```sql
id UUID PK
event_id UUID (ref events)
name TEXT           -- e.g. "VIP", "Early Bird", "General"
description TEXT
price DECIMAL(12,2)
quantity INTEGER    -- total available
sold_count INTEGER DEFAULT 0
is_active BOOLEAN DEFAULT true
sort_order INTEGER DEFAULT 0
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

#### `tickets`
```sql
id UUID PK
event_id UUID (ref events)
user_id UUID (ref profiles)
transaction_id UUID (ref transactions)
ticket_type_id UUID (ref event_ticket_types)  -- nullable
ticket_code TEXT UNIQUE    -- QR code value (format: ZYW-XXXXXXXX)
ticket_type TEXT DEFAULT 'general'
price_paid DECIMAL(12,2)
is_used BOOLEAN DEFAULT false
used_at TIMESTAMPTZ
checked_in_by UUID (ref profiles)
buyer_name TEXT
buyer_email TEXT
attendee_name TEXT
attendee_email TEXT
attendee_phone TEXT
claim_token TEXT UNIQUE     -- for gifting
claimed_at TIMESTAMPTZ
delivery_status TEXT
original_owner_id UUID (ref profiles)
transferred_at TIMESTAMPTZ
created_at TIMESTAMPTZ
```

#### `bookings`
```sql
id UUID PK
event_id UUID (ref events)
artist_id UUID (ref artists)
organizer_id UUID (ref profiles)
state booking_state DEFAULT 'pending'
offered_amount DECIMAL(12,2)
final_amount DECIMAL(12,2)
platform_fee DECIMAL(12,2)
artist_payout DECIMAL(12,2)
set_duration_minutes INTEGER
performance_time TIME
special_requirements TEXT
organizer_notes TEXT
artist_notes TEXT
accepted_at TIMESTAMPTZ
declined_at TIMESTAMPTZ
confirmed_at TIMESTAMPTZ
completed_at TIMESTAMPTZ
organizer_completed_at TIMESTAMPTZ
artist_completed_at TIMESTAMPTZ
payout_hold_until TIMESTAMPTZ
completion_notes TEXT
cancelled_at TIMESTAMPTZ
cancellation_reason TEXT
cancelled_by UUID (ref profiles)
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
UNIQUE(event_id, artist_id)
```

#### `provider_bookings`
```sql
id UUID PK
event_id UUID (ref events)
provider_id UUID (ref providers)
service_id UUID (ref provider_services)
organizer_id UUID (ref profiles)
state provider_booking_state DEFAULT 'pending'
offered_amount DECIMAL(12,2)
final_amount DECIMAL(12,2)
platform_fee DECIMAL(12,2)
provider_payout DECIMAL(12,2)
service_date DATE
start_time TIME
end_time TIME
quantity INTEGER DEFAULT 1
special_requirements TEXT
organizer_notes TEXT
provider_notes TEXT
accepted_at TIMESTAMPTZ
declined_at TIMESTAMPTZ
confirmed_at TIMESTAMPTZ
completed_at TIMESTAMPTZ
organizer_completed_at TIMESTAMPTZ
provider_completed_at TIMESTAMPTZ
payout_hold_until TIMESTAMPTZ
completion_notes TEXT
cancelled_at TIMESTAMPTZ
cancellation_reason TEXT
cancelled_by UUID (ref profiles)
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
UNIQUE(event_id, provider_id, service_id)
```

#### `transactions`
```sql
id UUID PK
reference TEXT UNIQUE      -- Paystack reference
type transaction_type
state transaction_state DEFAULT 'initiated'
amount DECIMAL(12,2)       -- total charged to payer
platform_fee DECIMAL(12,2) DEFAULT 0
net_amount DECIMAL(12,2)   -- amount - platform_fee
payer_id UUID (ref profiles)
recipient_id UUID (ref profiles)
recipient_type recipient_type
event_id UUID (ref events)
booking_id UUID (ref bookings)
provider_booking_id UUID (ref provider_bookings)
ticket_id UUID (ref tickets)
gateway_provider TEXT DEFAULT 'paystack'
gateway_reference TEXT
gateway_response JSONB
authorized_at TIMESTAMPTZ
held_at TIMESTAMPTZ
released_at TIMESTAMPTZ
settled_at TIMESTAMPTZ
refunded_at TIMESTAMPTZ
failed_at TIMESTAMPTZ
failure_reason TEXT
refund_amount DECIMAL(12,2)
refund_reason TEXT
parent_transaction_id UUID (ref transactions)
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

#### `notifications`
```sql
id UUID PK
user_id UUID (ref profiles)
type notification_type
title TEXT
message TEXT
link TEXT
event_id UUID
booking_id UUID
transaction_id UUID
metadata JSONB DEFAULT '{}'
read BOOLEAN DEFAULT false
read_at TIMESTAMPTZ
email_sent BOOLEAN DEFAULT false
email_sent_at TIMESTAMPTZ
created_at TIMESTAMPTZ
```

**Notification types (enum):** `booking_request`, `booking_accepted`, `booking_declined`, `booking_confirmed`, `booking_cancelled`, `booking_completed`, `payment_received`, `payment_failed`, `payout_sent`, `payout_completed`, `refund_issued`, `ticket_purchased`, `ticket_checkin`, `event_reminder`, `event_cancelled`, `event_updated`, `review_requested`, `welcome`, `profile_verified`, `review_received`, `message_received`

#### `reviews`
```sql
id UUID PK
event_id UUID (ref events)
user_id UUID (ref auth.users)
rating INTEGER (1-5)
title VARCHAR(100)
comment TEXT
is_verified_attendee BOOLEAN DEFAULT false
is_anonymous BOOLEAN DEFAULT false
helpful_count INTEGER DEFAULT 0
organizer_response TEXT
organizer_responded_at TIMESTAMPTZ
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
UNIQUE(event_id, user_id)
```

#### `event_media`
```sql
id UUID PK
event_id UUID (ref events)
media_type media_type
url TEXT
thumbnail_url TEXT
title TEXT
description TEXT
embed_id TEXT        -- YouTube/TikTok video ID
is_poster BOOLEAN DEFAULT false
is_featured BOOLEAN DEFAULT false
display_order INTEGER DEFAULT 0
uploaded_by UUID
created_at TIMESTAMPTZ
```

**Media types (enum):** `image`, `youtube_video`, `tiktok_video`, `instagram_post`, `instagram_reel`, `facebook_video`, `video_url`, `audio`

#### `artist_social_links`
```sql
id UUID PK
artist_id UUID (ref artists)
platform social_platform
url TEXT
username TEXT
follower_count INTEGER
is_verified BOOLEAN DEFAULT false
display_order INTEGER DEFAULT 0
UNIQUE(artist_id, platform)
```

**Social platforms (enum):** `instagram`, `youtube`, `tiktok`, `facebook`, `twitter`, `linkedin`, `spotify`, `apple_music`, `soundcloud`, `bandcamp`, `deezer`, `website`, `other`

#### `event_team_members`
```sql
id UUID PK
event_id UUID (ref events)
user_id UUID (ref profiles)
role TEXT           -- event role (Photographer, Stage Manager, etc.)
status TEXT         -- active/expired/removed
expires_at TIMESTAMPTZ
created_by UUID
created_at TIMESTAMPTZ
```

#### `support_tickets`
```sql
id UUID PK
ticket_number TEXT UNIQUE
user_id UUID (ref profiles)
subject TEXT
category TEXT ('general'|'payment'|'event'|'technical'|'report'|'refund'|'account'|'other')
priority TEXT ('low'|'medium'|'high'|'urgent')
status TEXT ('open'|'in_progress'|'waiting'|'resolved'|'closed')
assigned_to UUID (ref profiles)
created_at, updated_at, resolved_at, closed_at TIMESTAMPTZ
```

#### `reports`
```sql
id UUID PK
reporter_id UUID (ref profiles)
reported_type TEXT ('user'|'organizer'|'artist'|'vendor'|'event'|'review')
reported_id UUID
reason TEXT ('spam'|'fraud'|'harassment'|'inappropriate'|'scam'|'no_show'|'poor_service'|'fake'|'other')
description TEXT
evidence_urls TEXT[]
status TEXT ('pending'|'under_review'|'resolved'|'dismissed')
priority TEXT ('low'|'medium'|'high'|'urgent')
assigned_to UUID
admin_notes TEXT
resolution TEXT
resolved_by UUID
resolved_at TIMESTAMPTZ
```

#### `admin_audit_logs`
```sql
id UUID PK
admin_id UUID (ref profiles)
action TEXT
action_type TEXT  -- 'user_view'|'user_edit'|'user_suspend'|'user_ban'|'event_approve'|etc.
target_type TEXT
target_id UUID
details JSONB
ip_address TEXT
created_at TIMESTAMPTZ
```

#### `platform_settings`
```sql
key TEXT UNIQUE
value TEXT
description TEXT
updated_by UUID
updated_at TIMESTAMPTZ

-- Default values:
platform_name = 'Ziyawa'
commission_rate = '10'
minimum_payout = '100'
auto_approve_events = 'true'
require_organizer_verification = 'false'
maintenance_mode = 'false'
support_email = 'support@ziyawa.co.za'
```

#### `featured_events`
```sql
id UUID PK
event_id UUID (ref events)
featured_by UUID (ref profiles)
position INTEGER DEFAULT 0
starts_at TIMESTAMPTZ
ends_at TIMESTAMPTZ
created_at TIMESTAMPTZ
```

---

### Key SQL Functions & Triggers

| Function | Purpose |
|---|---|
| `handle_new_user()` | Trigger on auth.users INSERT → auto-creates profile row |
| `update_updated_at()` | Trigger on all tables → auto-updates `updated_at` column |
| `update_event_ticket_count()` | Trigger on tickets INSERT → increments `events.tickets_sold` |
| `update_artist_stats()` | Trigger on bookings → updates artist booking/completion stats |
| `update_provider_stats()` | Trigger on provider_bookings → updates provider stats |
| `update_organizer_stats()` | Trigger on events completed → increments events_hosted |
| `update_event_rating_summary()` | Trigger on reviews → refreshes event_rating_summaries |
| `update_review_helpful_count()` | Trigger on helpful votes → refreshes review.helpful_count |
| `validate_event_state_transition()` | Trigger on events UPDATE → blocks invalid state changes |
| `validate_booking_state_transition()` | Trigger on bookings UPDATE → blocks invalid transitions |
| `is_event_team_member(event_uuid)` | SECURITY DEFINER → used in RLS without recursion |
| `calculate_platform_fee(amount, percent)` | Utility for fee calculation |
| `generate_ticket_code()` | Generates unique `ZYW-XXXXXXXX` ticket codes |
| `generate_transaction_reference()` | Generates unique payment reference strings |
| `log_audit(...)` | Writes to audit_log table |

### Database Views

| View | Purpose |
|---|---|
| `v_public_artists` | Public artist data (excludes private fields like bank details) |
| `v_public_events` | Public event data with organizer info |
| `event_rating_summaries` | Computed rating distribution per event |

---

## 9. STATE MACHINES

### Event State Machine
```
DRAFT ──────────► PUBLISHED ──────────► LOCKED ──────────► COMPLETED
  │                    │                   │
  └───────────────────────────────────────►  CANCELLED
  (can cancel from any state before completion)
```

| State | Visible | Tickets | Bookings | Notes |
|---|---|---|---|---|
| `draft` | Organizer only | No | No | Default on create |
| `published` | Everyone | Yes | Yes | Live on Ziwaphi |
| `locked` | Everyone | Maybe | No | Auto or manual, near event date |
| `completed` | Everyone | No | No | Triggers escrow release |
| `cancelled` | Everyone | No | No | Triggers refunds |

### Booking State Machine (Artist)
```
PENDING ──► ACCEPTED ──► CONFIRMED ──► COMPLETED
         │            │              │
         ▼            ▼              ▼
       DECLINED    CANCELLED      DISPUTED ──► COMPLETED or CANCELLED
```

| State | Meaning |
|---|---|
| `pending` | Request sent, waiting for artist |
| `accepted` | Artist accepted, organizer must pay |
| `declined` | Artist declined (final) |
| `confirmed` | Payment received, locked in |
| `completed` | Event done, payout released |
| `cancelled` | Cancelled, refund rules apply |
| `disputed` | Under admin review |

Provider bookings follow the exact same state machine.

### Transaction State Machine
```
INITIATED ──► AUTHORIZED ──► HELD ──► RELEASED ──► SETTLED
                                    └──► REFUNDED
                          └──► FAILED
```

| State | Meaning |
|---|---|
| `initiated` | User started payment, no money moved |
| `authorized` | Paystack confirmed, money received |
| `held` | Money in escrow, conditions pending |
| `released` | Conditions met, payout triggered |
| `settled` | Money in recipient's bank |
| `refunded` | Refund processed |
| `failed` | Transaction failed |

---

## 10. CORE WORKFLOWS

### 10.1 Ticket Purchase
```
1. Groovist opens /events/[id]
2. Selects ticket tier + quantity (1–10)
3. Enters attendee details (name, email, phone per attendee)
4. Clicks "Buy Now"
5. POST /api/payments/ticket
   → validates event state (published or locked)
   → validates capacity (tickets_sold + quantity ≤ capacity)
   → creates transaction record (state: initiated)
   → calls Paystack initialize API
6. Redirected to Paystack hosted payment page
7. Paystack processes card payment
8. Paystack calls POST /api/webhooks/paystack (charge.success)
9. Webhook handler:
   → verifies HMAC-SHA512 signature
   → looks up transaction by reference
   → updates transaction state: authorized → held
   → creates ticket records (one per attendee)
   → increments events.tickets_sold
   → credits organizer held_balance (ticket price - platform fee)
   → creates in-app notification for buyer
   → sends ticket confirmation email (Resend) with QR code
10. Redirect to /payments/callback → buyer sees confirmation
11. Escrow released 48h after event end (cron job)
```

### 10.2 Artist Booking
```
1. Organizer finds artist on /artists or from event management
2. Clicks "Book Artist" → booking form:
   → offered amount, performance notes, requirements
3. Booking record created (state: pending)
4. Notification sent to artist
5. Artist opens dashboard → sees pending request
6. Reviews: event details, offered amount
7. Artist clicks Accept OR Decline
   → If Declined: state: declined, organizer notified
   → If Accepted: state: accepted, organizer notified
8. Organizer pays: POST /api/payments/booking {bookingId, bookingType: 'artist'}
9. Paystack initialize → organizer redirected to payment
10. Paystack webhook charge.success:
    → transaction state: held
    → booking state: confirmed
    → booking.artist_payout = amount - commission
    → both parties notified
11. After event completion:
    → payout_hold_until = completed_at + 24h
    → Cron or manual release: transaction state: released → settled
    → artist.wallet_balance += artist_payout
12. Artist withdraws: POST /api/payments/withdraw → Paystack transfer
```

### 10.3 Crew Booking
Identical to Artist Booking but uses `provider_bookings` table. Commission is vendor rate (lower). `bookingType: 'crew'` in the payment API.

### 10.4 Wallet Deposit
```
1. User goes to /wallet → clicks "Add Funds"
2. Enters amount (minimum R50)
3. POST /api/payments/deposit → Paystack initialize
4. Paystack payment page → pays
5. Webhook charge.success → wallet_balance credited (minus 2.5% + R3 fee)
```

### 10.5 Wallet Withdrawal
```
1. User must have is_verified = true
2. Minimum R100, fee R20
3. User enters bank account number + bank code
4. POST /api/payments/verify-account → Paystack resolves account name
5. User confirms account holder name matches
6. POST /api/payments/withdraw
   → deducts amount + R20 fee from wallet_balance
   → creates transaction (state: initiated)
   → creates Paystack Transfer Recipient
   → initiates Paystack Transfer
7. Webhook transfer.success → transaction state: settled
8. Webhook transfer.failed → refunds wallet_balance, user notified
```

### 10.6 Event Lifecycle (State Machine)
```
Create event → Draft (invisible to public)
    ↓
Organizer clicks Publish → Published (live on Ziwaphi, tickets selling)
    ↓
Event date approaches / manual → Locked (no new bookings)
    ↓
Event happens → Organizer clicks Complete → Completed
    ↓
Cron job runs → holds lifted after 48h
    ↓
Organizer's wallet_balance credited for all ticket revenue

At any stage before Completed → Cancel → Cancelled
    → All unscanned tickets refunded to buyer wallets
    → All confirmed bookings refunded to organizer wallets

Automated by /api/cron/event-lifecycle (daily Vercel Cron):
  - Events within 2 days → send reminder emails to ticket holders
  - Events past date → send follow-up emails + review prompts
  - Events with payout_hold_until passed → release escrow
```

### 10.7 Identity Verification
```
1. User goes to /dashboard/settings → Verification tab
2. Uploads: government ID document (ID/passport/driver's) + selfie
3. POST /api/verification/submit
   → files stored in Supabase storage (media bucket, private path)
   → verification_request record created (status: pending)
4. Admin sees pending count on /admin/verifications
5. Admin reviews documents
6. Approve: is_verified = true → email to user → can now withdraw
   Reject: status: rejected, reason recorded → email to user
```

### 10.8 Dispute Resolution
```
1. Booking is in state: confirmed
2. Either party raises dispute: state → disputed
3. POST /api/bookings/[id]/dispute (or /api/provider-bookings/[id]/dispute)
   → dispute_tracking record created
   → admin notified
4. Both parties submit evidence (text + file URLs)
5. Admin opens /admin/disputes
6. Reviews evidence, writes admin notes
7. POST /api/admin/disputes/resolve {resolution: 'organizer'|'artist', reason}
   → If organizer wins: booking → cancelled, refund to organizer
   → If artist wins: booking → completed, payout to artist
   → Funds released appropriately
```

### 10.9 Review Flow
```
1. Day after event → automatic notification to all ticket holders
2. User visits /events/[id]
3. Sees "Leave a Review" section (only if event is completed)
4. Rates 1–5 stars + writes title + comment
5. Optionally anonymous
6. POST /api/reviews
   → checks if user has a ticket for this event
   → is_verified_attendee = true if ticket found
7. Review stored → event_rating_summaries updated (trigger)
8. Organizer sees review on /dashboard/organizer/reviews
9. Organizer can respond (organizer_response field)
10. Users can mark review helpful (review_helpful_votes)
```

### 10.10 Admin 2FA Login
```
1. Admin navigates to /admin/*
2. src/middleware.ts checks:
   a. Is user logged in? No → /auth/signin
   b. Is user is_admin? No → 403
   c. Does user have MFA enrolled?
      No → /auth/mfa-setup
   d. Is current session aal2?
      No (aal1) → /auth/mfa-challenge
      Yes → allow
3. /auth/mfa-setup:
   a. Supabase checks for existing TOTP factors
   b. Any unverified factors are cleaned up (stale from previous attempts)
   c. New TOTP factor enrolled → QR code displayed
   d. User scans with Google Authenticator / Authy / Microsoft Authenticator
   e. User enters 6-digit code → verified → session is now aal2
   f. Redirect to /admin
4. /auth/mfa-challenge (every login after setup):
   a. Enter 6-digit TOTP code
   b. POST /api/auth/mfa-verify
   c. Session upgraded to aal2
   d. Redirect to /admin
```

### 10.11 Messaging Flow
```
1. User A clicks "Message" on user B's profile or event page
2. POST /api/conversations/start → creates conversation record
3. /messages page opens with that conversation active
4. Messages sent and received via Supabase Realtime subscriptions
5. Unread count shown in navbar via useUnreadMessages hook
6. Notification created on message_received
```

---

## 11. FEE & COMMISSION STRUCTURE

All amounts in ZAR. Source of truth: `src/lib/constants.ts` → `PLATFORM_FEES`

### A. Ticket Sales

| Ticket Price | Platform Fee | Booking Fee (added to price) |
|---|---|---|
| All prices | 10% of ticket price | R5 (≤R100 ticket) |
| — | — | R7 (R101–R300 ticket) |
| — | — | R10 (R301+ ticket) |

> Total Ziyawa take = 10% commission + booking fee (paid by buyer on top of ticket price)
> Organizer receives: ticket_price × 0.90

### B. Artist Booking Commission (tiered — bigger deals = lower %)

| Booking Amount | Ziyawa Commission | Artist Receives |
|---|---|---|
| Under R20,000 | 20% | 80% |
| R20,000 – R100,000 | 15% | 85% |
| Over R100,000 | 10% | 90% |

### C. Vendor / Crew Booking Commission (tiered)

| Booking Amount | Ziyawa Commission | Provider Receives |
|---|---|---|
| Under R15,000 | 10% | 90% |
| R15,000 – R75,000 | 7.5% | 92.5% |
| Over R75,000 | 5% | 95% |

### D. Wallet Operations

| Operation | Fee |
|---|---|
| Deposit funds | 2.5% + R3 |
| Withdraw to bank | R20 flat fee |
| Minimum withdrawal | R100 |

### E. Paystack Fees (deducted by Paystack — not Ziyawa's)

| Transaction | Paystack Fee |
|---|---|
| Local SA card | 1.5% (capped at R2,000) |
| International card | 3.9% |
| Bank payout (transfer) | ~R10 per transfer |

---

## 12. PAYMENT & ESCROW SYSTEM

### Three-Bucket Wallet

Every profile has 3 balance fields:

| Field | Meaning | Can withdraw? |
|---|---|---|
| `wallet_balance` | Available — yours right now | Yes |
| `held_balance` | In escrow — conditions pending | No |
| `pending_payout_balance` | Queued for Paystack transfer | No |

Balances are managed via `adjustProfileBalanceBuckets()` in `src/lib/payments/escrow.ts`.

### Escrow Rules

**Ticket Revenue (organizer):**
- Payment received → organizer `held_balance` += ticket_price_net
- Event state = `completed` + 48h → `held_balance` → `wallet_balance`

**Artist Booking:**
- Payment confirmed → held in escrow
- Event/booking completed + 24h → `wallet_balance` credited
- Disputed → frozen until admin resolves

**Crew Booking:**
- Same as Artist Booking

**Release mechanism:**
- `payout_hold_until` timestamp set on completion
- Cron job (`/api/cron/event-lifecycle`) runs daily and checks all held transactions
- `PAYOUT_HOLD_HOURS` env var (default 48h for events, 24h for bookings)
- Manual override: Admin via `/api/payments/release` or finance panel
- Large payouts (> `MANUAL_REVIEW_THRESHOLD_RANDS`, default R5,000) may be flagged for manual review

### Payment Flow (Technical)

```
Client → POST /api/payments/[ticket|booking|deposit]
       → Server: creates transaction (initiated)
       → Server: calls Paystack initialize
       → Returns: {authorization_url, reference}

Client → Redirected to Paystack payment page
       → Customer pays
       → Paystack processes

Paystack → POST /api/webhooks/paystack (signed)
         → Server: verifies signature
         → Server: updates transaction state
         → Server: updates balances
         → Server: creates tickets / confirms bookings
         → Server: sends emails + notifications

Paystack redirect → Client: /payments/callback?reference=...
                  → GET /api/payments/verify?reference=...
                  → Shows confirmation page
```

---

## 13. ZIWAPHI — EVENT SEARCH AI

Ziwaphi is **NOT an external AI model**. It is 100% custom, rule-based, costs nothing per query.

**Files:**
- `src/lib/ziwaphi/query-parser.ts` — NLP parser
- `src/lib/ziwaphi/knowledge-base.ts` — FAQ + quick actions
- `src/app/api/ziwaphi/search/route.ts` — Search API
- `src/app/ziwaphi/` — Frontend page
- `src/app/ziwaphi/ziwaphi-client.tsx` — Client component

### How It Works

```
User types: "events in Joburg this weekend under R200"
                    ↓
query-parser.ts parses the text:
  - Intent: search_events
  - Location: city="johannesburg", province="gauteng"
  - Date range: this weekend (Saturday–Sunday)
  - Price: max=200
                    ↓
/api/ziwaphi/search → Supabase query:
  SELECT * FROM events
  WHERE is_published = true
    AND location = 'gauteng'
    AND event_date BETWEEN [sat] AND [sun]
    AND ticket_price <= 200
  ORDER BY event_date ASC
                    ↓
Results returned to UI
```

### Query Parser Capabilities

**Date detection:**
- today, tonight, tomorrow
- this weekend / next weekend
- this week / next week / next month
- Specific days: "on Friday", "on Saturday"

**Location detection:**
- All SA major cities (Johannesburg, Cape Town, Durban, Pretoria, etc.)
- All 9 SA provinces (Gauteng, Western Cape, KwaZulu-Natal, etc.)
- Slang: "Joburg" → Johannesburg, "CT" → Cape Town, "DBN" → Durban

**Category detection:**
- Music, concerts, festivals, sport, comedy, arts, markets, food, fitness, family, business, networking

**Price detection:**
- "free", "under R200", "less than 500", "between R100 and R500"

**FAQ detection:**
- Matches questions about tickets, refunds, bookings, payments, accounts
- Returns pre-written answers from knowledge-base.ts without a DB query

### Quick Actions
Pre-defined shortcut queries shown to users:
- "Events this weekend"
- "Free events near me"
- "Events in Cape Town"
- "Amapiano events"
- etc.

---

## 14. EMAIL & NOTIFICATIONS

### Email Provider
**Resend** — `RESEND_API_KEY` env var required.

Source: `src/lib/email.ts`, `src/lib/email-templates.ts`

**From addresses:**
| From | Used for |
|---|---|
| `noreply@zande.io` | Tickets, booking confirmations, verifications |
| `info@zande.io` | Event reminders, follow-ups (from cron) |
| `support@zande.io` | Admin communications, support replies |

### Transactional Emails (Auto-sent)

| Trigger | Email sent to | Content |
|---|---|---|
| Ticket purchased | Buyer | Ticket confirmation + QR code per ticket |
| Ticket gifted to user | Recipient | "You've been gifted a ticket" + claim link |
| Event reminder (1 day before) | Ticket holders | "Your event is tomorrow" |
| Event follow-up (1 day after) | Ticket holders | "Hope you had fun! Leave a review" |
| Booking request sent | Artist | "You have a new booking request" |
| Booking accepted | Organizer | "Artist accepted! Please pay to confirm" |
| Booking declined | Organizer | "Booking was declined" + reason |
| Booking confirmed (paid) | Artist | "Booking confirmed! Payment received" |
| Booking cancelled | Both parties | "Booking cancelled" |
| Booking completed | Artist | "Payout released!" |
| Identity verification approved | User | "You can now withdraw funds" |
| Identity verification rejected | User | "Verification failed — reason" |
| Payout sent | Recipient | "Your withdrawal is on the way" |

### In-App Notifications
Source: `src/lib/notifications.ts`

- Created via `createNotification()` function
- Stored in `notifications` table
- Read via `GET /api/notifications`
- Mark as read via `PATCH /api/notifications`
- Unread count shown in navbar (real-time via Supabase subscription)
- `useUnreadMessages` hook for messages count

### Notification Preferences
Users can configure which notifications to receive via `/api/notifications/preferences`.

---

## 15. ADMIN SYSTEM

### Access Control
- URL prefix: `/admin`
- Requires: `profiles.is_admin = true` + session `aal` = `aal2` (2FA complete)
- Enforced in: `src/middleware.ts`
- Uses Supabase service role key for data access (bypasses RLS)

### Admin Roles

| Role | Description |
|---|---|
| `super_admin` | Full access to everything |
| `admin` | Most operations, cannot change platform settings |
| `moderator` | Content: events, reviews, reports |
| `support` | Users, support tickets, communications |

### Capabilities Reference

**User Management (`/admin/users`):**
- Search by name/email
- View full profile
- Edit: name, email, phone, bio, avatar, location
- Toggle: is_organizer, is_artist, is_provider, is_admin
- Set admin_role
- Issue warning → user_warnings table
- Suspend → is_suspended, suspended_until, suspension_reason
- Ban → is_banned, ban_reason
- View suspension/ban history

**Verifications (`/admin/verifications`):**
- Queue of pending verification requests
- Preview ID document + selfie
- Approve → `PATCH /api/admin/verifications/[id]/review` `{action: 'approve'}`
- Reject → same endpoint `{action: 'reject', reason: '...'}`

**Events (`/admin/events`):**
- View all events across all organizers
- Filter by state, location, date
- Force state change (e.g. manually complete stuck event)
- Feature event → adds to featured_events table with position + time range

**Finance (`/admin/finance`):**
- Full transaction history with filters
- Escrow view: all users with held_balance > 0
- Manual release → `POST /api/payments/release {transactionId}`

**Disputes (`/admin/disputes`):**
- Open dispute queue
- View both parties' evidence
- Admin notes
- Resolve → `POST /api/admin/disputes/resolve {bookingId, resolution, reason}`

**Communications (`/admin/communications`):**
- Individual email: select user → write → `POST /api/admin/send-email`
- Bulk email: select segment (all/organizers/artists/providers) → write → `POST /api/admin/bulk-email`
- All emails logged in `email_logs` table

**Audit Logs (`/admin/audit-logs`):**
- Every admin action recorded in `admin_audit_logs`
- Filter by admin, action type, date range
- Immutable — no deletes

**Analytics (`/admin/analytics`):**
- User growth chart
- Revenue by period
- Top events (by tickets sold)
- Top organizers (by revenue)
- Booking volume by type

**Platform Settings (`/admin/settings`):**
- Edit `platform_settings` key/value pairs
- Changes logged in admin_audit_logs

---

## 16. SECURITY & AUTH

### Authentication Flow
1. User signs up / signs in via Supabase Auth (email/password)
2. Supabase issues a JWT stored as HTTP-only cookie
3. Next.js middleware reads session on each request using `@supabase/ssr`
4. `createClient()` (client) and `createClient()` (server) are separate — server version has access to auth context

### MFA (2FA)
- Provider: TOTP via Supabase MFA
- Mandatory for: all admins (`is_admin = true`)
- Optional for: all other users
- Enrollment at `/auth/mfa-setup`
- Challenge at `/auth/mfa-challenge`
- Session level: `aal1` = password only, `aal2` = password + TOTP
- Admin routes require `aal2`
- Bug fix (Apr 2026): stale `unverified` factors auto-cleaned before new enrollment using `(f.status as string) === 'unverified'` cast (Supabase types only declare `verified`)

### Row Level Security (RLS)
Every table has RLS enabled. Key policies:

| Table | Policy |
|---|---|
| `profiles` | User can read/write own row; admins can read all |
| `events` | Owner can do anything; `is_published = true` → public read |
| `bookings` | Artist and organizer can read own bookings |
| `tickets` | Owner can read own tickets |
| `notifications` | User sees only own notifications |
| `reviews` | Anyone reads; only owner writes |
| `event_team_members` | Uses `is_event_team_member()` SECURITY DEFINER function |
| `admin_*` tables | Admin only (via service role or `is_admin` check) |

**RLS recursion fix:** `event_team_members` previously caused infinite recursion. Fixed by creating `is_event_team_member(event_uuid UUID)` as a `SECURITY DEFINER` function that bypasses RLS.

### Webhook Security
- Paystack webhooks: verified via HMAC-SHA512 `x-paystack-signature` header
- Secret: `PAYSTACK_SECRET_KEY` used for signature verification
- Invalid signature → 401 returned

### Cron Security
- `/api/cron/event-lifecycle` protected by `?secret=CRON_SECRET`
- Vercel cron user-agent also accepted in production

### Payment Security
- All Paystack secret keys server-side only — never in client bundles
- Bank account verified before any payout transfer
- Identity verification required before first withdrawal
- All transactions have audit trail (gateway_response JSONB)

### OWASP Top 10 Considerations
- No user input is rendered as raw HTML (React escaping)
- SQL injection not possible via Supabase SDK (parameterized)
- CSRF protected by Supabase session model
- Rate limiting: Paystack and Supabase have their own rate limits
- File uploads validated server-side (type + size checks in `src/lib/storage.ts`)

---

## 17. STORAGE (MEDIA FILES)

**Provider:** Supabase Storage
**Bucket name:** `media` (public bucket)
**Max file sizes:** Images 10MB, Videos 50MB, Audio 20MB

### Folder Structure
```
media/
├── artists/{userId}/
│   ├── profile/        ← Profile pictures
│   ├── cover/          ← Cover/banner images
│   └── gallery/        ← Portfolio photos + audio
│
├── providers/{userId}/
│   ├── profile/
│   ├── cover/
│   └── portfolio/      ← Work samples
│
├── organizers/{userId}/
│   ├── profile/
│   ├── cover/
│   └── gallery/
│
└── events/{eventId}/
    ├── poster/         ← Event poster image
    ├── gallery/        ← Event photo gallery
    └── promo/          ← Promo videos
```

### Bucket Policies (manual setup in Supabase Dashboard)
- **Public read:** `USING (true)` — all files publicly accessible by URL
- **Authenticated upload:** `WITH CHECK ((storage.foldername(name))[2] = auth.uid()::text)`
- **Owner update/delete:** `USING ((storage.foldername(name))[2] = auth.uid()::text)`

### File Validation (`src/lib/storage.ts`)
- Images: JPEG, PNG, WebP, GIF — max 10MB
- Videos: MP4, WebM, QuickTime — max 50MB
- Audio: MP3, WAV — max 20MB
- Filenames: auto-generated as `{timestamp}-{random}.{ext}` to avoid collisions

### Allowed Image Sources (`next.config.ts`)
- `vavjhffuaublqzltohwz.supabase.co` — production storage
- `*.supabase.co` — all Supabase instances
- `images.unsplash.com` — placeholder images
- `i.ytimg.com`, `img.youtube.com` — YouTube thumbnails

---

## 18. CODEBASE STRUCTURE

```
ziyawa/
│
├── public/
│   ├── hero.mp4                  ← Homepage hero background video
│   └── favicon.ico
│
├── supabase/
│   ├── schema.sql                ← Original schema (v1)
│   ├── schema-v2.sql             ← Current schema (v2) — authoritative
│   ├── seed.sql                  ← Test/demo seed data
│   └── migrations/
│       ├── 002_providers.sql     ← Provider/crew system
│       ├── 003_advanced_profiles.sql  ← Trust stats, social links, media galleries
│       ├── 004_storage_bucket.sql     ← Storage setup instructions
│       ├── 005_notifications.sql      ← Notifications table
│       ├── 006_reviews.sql            ← Reviews + rating summaries
│       ├── 007_fix_events_rls.sql     ← RLS fix + is_published column
│       ├── 008_admin_system.sql       ← Full admin system tables
│       └── 010_service_images.sql     ← image_url on provider_services
│
├── docs/
│   └── SUPABASE_EMAIL_TEMPLATES.md   ← Supabase auth email template configs
│
├── MASTER.md                     ← This file
├── HANDOVER_NOTES.md             ← Handover notes
├── next.config.ts                ← Next.js config (allowed image domains)
├── tsconfig.json
├── components.json               ← shadcn/ui config
│
└── src/
    │
    ├── middleware.ts             ← Route protection + MFA enforcement
    │
    ├── types/
    │   ├── index.ts              ← Re-exports all types
    │   └── database.ts           ← All TypeScript types for DB tables + enums
    │
    ├── lib/
    │   ├── constants.ts          ← Platform config, state machines, fee structure
    │   ├── helpers.ts            ← formatCurrency, formatDate, calculations
    │   ├── utils.ts              ← cn() tailwind class merge utility
    │   ├── email.ts              ← Resend email send functions
    │   ├── email-templates.ts    ← HTML email template builders
    │   ├── notifications.ts      ← createNotification(), NotificationTemplates
    │   ├── paystack.ts           ← Paystack API: initialize, verify, transfer
    │   ├── storage.ts            ← uploadUserFile(), validateFile()
    │   ├── ticketing.ts          ← Ticket generation + validation logic
    │   ├── event-team.ts         ← Event team + access pass utilities
    │   ├── monitoring.ts         ← logOpsEvent(), captureServerError()
    │   ├── supabase/
    │   │   ├── client.ts         ← Browser Supabase client
    │   │   ├── server.ts         ← Server Supabase client (cookies)
    │   │   └── middleware.ts     ← Supabase session refresh middleware
    │   ├── payments/
    │   │   └── escrow.ts         ← adjustProfileBalanceBuckets(), releaseEscrow()
    │   └── ziwaphi/
    │       ├── query-parser.ts   ← NLP rule-based query parser
    │       └── knowledge-base.ts ← FAQ database + quick actions
    │
    ├── hooks/
    │   ├── use-toast.ts          ← Toast notification hook
    │   └── use-unread-messages.ts ← Real-time unread message count hook
    │
    ├── components/
    │   ├── ui/                   ← shadcn/ui base: Button, Input, Dialog, etc.
    │   ├── layout/
    │   │   ├── header.tsx        ← Main navigation header
    │   │   ├── footer.tsx        ← Site footer with legal links + social icons
    │   │   └── navbar.tsx        ← Mobile/desktop nav
    │   ├── home/
    │   │   ├── hero.tsx          ← Hero video section
    │   │   ├── typewriter-hero.tsx ← Typewriter text animation
    │   │   ├── featured-events.tsx
    │   │   ├── how-it-works.tsx
    │   │   └── why-ziyawa.tsx
    │   ├── events/
    │   │   ├── event-details.tsx ← Full event detail component
    │   │   ├── event-card.tsx    ← Event card for listings
    │   │   └── event-form.tsx    ← Create/edit event form
    │   ├── artists/
    │   │   ├── artist-profile.tsx
    │   │   ├── artist-profile-enhanced.tsx
    │   │   ├── artists-grid.tsx
    │   │   └── artists-filter.tsx
    │   ├── bookings/
    │   │   ├── book-artist-form.tsx ← Booking request form
    │   │   └── booking-actions.tsx  ← Accept/decline + pay buttons
    │   ├── dashboard/
    │   │   ├── dashboard-header.tsx
    │   │   └── organizer-reviews-dashboard.tsx
    │   ├── payments/
    │   │   └── payment-flow.tsx
    │   ├── tickets/
    │   │   └── ticket-card.tsx   ← Ticket with QR code
    │   ├── reviews/
    │   │   └── review-form.tsx
    │   ├── notifications/
    │   │   └── notification-bell.tsx
    │   ├── media/
    │   │   └── media-upload.tsx
    │   ├── providers/
    │   │   └── provider-booking-form.tsx
    │   ├── search/
    │   │   └── search-bar.tsx
    │   ├── shared/
    │   │   └── report-dialog.tsx ← Report user/event/review
    │   └── ziwaphi/
    │       └── ziwaphi-chat.tsx  ← Ziwaphi chat interface
    │
    └── app/                      ← Next.js App Router
        ├── page.tsx              ← Homepage
        ├── layout.tsx            ← Root layout
        ├── globals.css           ← Global CSS + Tailwind base
        ├── robots.ts             ← robots.txt generator
        ├── sitemap.ts            ← sitemap.xml generator
        │
        ├── about/page.tsx
        ├── faq/page.tsx
        ├── terms/page.tsx
        ├── privacy/page.tsx
        ├── refunds/page.tsx
        ├── for/[role]/page.tsx   ← Dynamic for-you pages
        │
        ├── auth/
        │   ├── signin/page.tsx
        │   ├── signup/page.tsx
        │   ├── callback/route.ts ← Supabase OAuth handler
        │   ├── error/page.tsx
        │   ├── reset-password/page.tsx
        │   ├── mfa-setup/page.tsx
        │   └── mfa-challenge/page.tsx
        │
        ├── events/[id]/page.tsx
        ├── artists/page.tsx
        ├── artists/[id]/page.tsx
        ├── crew/page.tsx
        ├── crew/[id]/page.tsx
        ├── organizers/page.tsx
        ├── organizers/[id]/page.tsx
        ├── ziwaphi/page.tsx
        ├── ziwaphi/ziwaphi-client.tsx
        ├── messages/page.tsx
        ├── messages/messages-client.tsx
        ├── wallet/page.tsx
        ├── profile/page.tsx
        ├── support/page.tsx
        ├── support/[id]/page.tsx
        ├── tickets/claim/page.tsx
        ├── payments/callback/page.tsx
        │
        ├── dashboard/
        │   ├── page.tsx          ← Role-based redirect
        │   ├── settings/page.tsx
        │   ├── notifications/page.tsx
        │   ├── tickets/page.tsx
        │   ├── event-work/page.tsx
        │   ├── artist/
        │   │   ├── page.tsx
        │   │   ├── setup/page.tsx
        │   │   ├── media/page.tsx
        │   │   ├── discography/page.tsx
        │   │   └── social/page.tsx
        │   ├── organizer/
        │   │   ├── page.tsx
        │   │   ├── events/page.tsx
        │   │   ├── events/new/page.tsx
        │   │   ├── events/[id]/(tabs)/  ← edit, manage, media, team, bookings, book, checkin
        │   │   ├── reviews/page.tsx
        │   │   ├── book-crew/page.tsx
        │   │   └── crew/page.tsx
        │   └── provider/
        │       ├── page.tsx
        │       ├── setup/page.tsx
        │       ├── services/page.tsx
        │       ├── portfolio/page.tsx
        │       ├── media/page.tsx
        │       └── social/page.tsx
        │
        ├── admin/
        │   ├── layout.tsx        ← Admin shell layout
        │   ├── page.tsx          ← Admin overview
        │   ├── analytics/page.tsx
        │   ├── audit-logs/page.tsx
        │   ├── communications/page.tsx
        │   ├── disputes/page.tsx
        │   ├── events/page.tsx
        │   ├── finance/page.tsx
        │   ├── reports/page.tsx
        │   ├── reviews/page.tsx
        │   ├── settings/page.tsx
        │   ├── support/page.tsx
        │   ├── users/page.tsx
        │   └── verifications/page.tsx
        │
        └── api/                  ← All API routes (see Section 7)
```

---

## 19. LIBRARIES & DEPENDENCIES

### Production Dependencies

| Package | Version | Purpose |
|---|---|---|
| `next` | 16.1.6 | Framework |
| `react` | 19.2.3 | UI runtime |
| `react-dom` | 19.2.3 | DOM rendering |
| `@supabase/supabase-js` | ^2.93.3 | DB + Auth + Realtime |
| `@supabase/ssr` | ^0.8.0 | SSR-compatible Supabase client |
| `resend` | ^6.9.1 | Email sending |
| `qrcode.react` | ^4.2.0 | QR code generation |
| `lucide-react` | ^0.563.0 | Icons |
| `date-fns` | ^4.1.0 | Date manipulation |
| `sonner` | ^2.0.7 | Toast notifications |
| `tailwind-merge` | ^3.4.0 | Tailwind class merging |
| `clsx` | ^2.1.1 | Conditional class names |
| `class-variance-authority` | ^0.7.1 | shadcn/ui variants |
| `radix-ui` | ^1.4.3 | Accessible UI primitives |
| `@radix-ui/react-checkbox` | ^1.3.3 | Checkbox primitive |
| `@radix-ui/react-popover` | ^1.1.15 | Popover primitive |
| `@radix-ui/react-progress` | ^1.1.8 | Progress bar |
| `@radix-ui/react-scroll-area` | ^1.2.10 | Scroll area |
| `@radix-ui/react-switch` | ^1.2.6 | Toggle switch |
| `react-day-picker` | ^9.13.1 | Calendar date picker |
| `next-themes` | ^0.4.6 | Theme (dark/light mode) |

### Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| `typescript` | ^5 | Type checking |
| `tailwindcss` | ^4 | CSS framework |
| `@tailwindcss/postcss` | ^4 | PostCSS integration |
| `eslint` | ^9 | Linting |
| `eslint-config-next` | 16.1.6 | Next.js ESLint rules |
| `tw-animate-css` | ^1.4.0 | Tailwind animations |

---

## 20. ENVIRONMENT VARIABLES

All must be set in `.env.local` (local dev) and Vercel project settings (production).

| Variable | Required | Where Used | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client + Server | Supabase anon key (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only | Bypasses RLS — NEVER expose to client |
| `PAYSTACK_SECRET_KEY` | Yes | Server only | Paystack secret key |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Yes | Client | Paystack public key |
| `RESEND_API_KEY` | Yes | Server only | Resend email service |
| `CRON_SECRET` | Yes | Cron routes | Protects `/api/cron/*` endpoints |
| `NEXT_PUBLIC_APP_URL` | Yes | Client + Server | e.g. `https://ziyawa.vercel.app` |
| `PAYOUT_HOLD_HOURS` | Optional | Escrow service | Default: 48 |
| `BOOKING_PAYOUT_HOLD_HOURS` | Optional | Escrow service | Default: 24 |
| `MANUAL_REVIEW_THRESHOLD_RANDS` | Optional | Escrow service | Default: 5000 |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Optional | Footer | Contact email displayed |
| `FROM_EMAIL` | Optional | Email service | Default: `noreply@zande.io` |
| `SUPPORT_EMAIL` | Optional | Email service | Default: `support@zande.io` |
| `SUPPORT_FROM_EMAIL` | Optional | Admin comms | From address for support emails |
| `INFO_FROM_EMAIL` | Optional | Cron emails | From address for reminders |
| `INFO_EMAIL` | Optional | Cron emails | Reply-to for info emails |

---

## 21. DEPLOYMENT & CI/CD

### Production
- **Platform:** Vercel
- **Auto-deploy:** Every push to `main` branch triggers a Vercel build
- **Build command:** `next build`
- **Node version:** as per Vercel defaults
- **Environment variables:** Set in Vercel Project Settings → Environment Variables

### Vercel Cron Jobs
Configure in `vercel.json` (create if not present):
```json
{
  "crons": [
    {
      "path": "/api/cron/event-lifecycle?secret=CRON_SECRET",
      "schedule": "0 6 * * *"
    }
  ]
}
```
The cron runs daily at 06:00 UTC and handles event reminders + escrow releases.

### Local Development
```powershell
cd "c:\Users\Zwonaka Mabege\Desktop\Zande Technologies\Ziyawa\ziyawa"
npm run dev       # starts on localhost:3000 with Turbopack
npm run build     # CAUTION: kills dev server, run separately
npm run lint      # ESLint check
```

### GitHub
- **Repo:** https://github.com/Zwonaka100/Ziyawa.git
- **Branch:** `main` is the production branch
- **Last stable commit:** 47e1622

### Running Migrations
1. Open Supabase Dashboard → SQL Editor
2. Paste migration SQL
3. Run → verify no errors
4. Verify tables: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`

---

## 22. CODING CONVENTIONS

### TypeScript
- All files TypeScript (`.ts` / `.tsx`)
- No `any` types — use specific types from `src/types/database.ts`
- State machine types imported from `src/types/database.ts`
- Use `(value as string)` cast only when Supabase types are too narrow (known edge case with MFA factor status)

### Components
- Server Components by default (no `"use client"` unless needed)
- Client Components for: interactivity, state, real-time, forms
- File naming: `kebab-case.tsx`
- Component naming: `PascalCase`

### API Routes
- All in `src/app/api/`
- Always verify auth: `const { data: { user } } = await supabase.auth.getUser()`
- Always validate inputs before DB queries
- Always return proper HTTP status codes
- Use `createClient` from `@/lib/supabase/server` for user-context routes
- Use service role client for webhooks and cron (no user context)

### Supabase Clients
```typescript
// Browser (client components)
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// Server (API routes, server components)
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// Service role (webhooks, cron — bypasses RLS)
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

### Currency / Money
- All monetary values stored as `DECIMAL(12,2)` in ZAR (rands) in the database
- Paystack uses **cents** — multiply × 100 before sending to Paystack, divide ÷ 100 after receiving
- Always use `formatCurrency()` from `src/lib/helpers.ts` for display
- Use `Math.round()` for all money arithmetic to avoid float precision errors

### State Machines
- Never skip states — use `EVENT_STATE_TRANSITIONS` from `src/types/database.ts`
- Never update state directly in client code — always go through API routes
- State changes are one-way (forward only) except cancellation

### Error Handling
- API routes: always try/catch → log with `captureServerError()` → return appropriate status
- Client components: use `sonner` toast for user-facing errors
- Never expose internal error messages or stack traces to clients

### Styling
- Tailwind CSS — no custom CSS unless absolutely necessary
- Design: grayscale/neutral, simple, clean, minimal
- Mobile-first responsive design
- Dark mode support via `next-themes`

### New Tables
- Always enable RLS
- Always add `created_at` and `updated_at`
- Add `update_updated_at` trigger
- Document in MASTER.md and create migration file

---

## 23. KNOWN ISSUES & OUTSTANDING WORK

### Bugs / Issues

| Issue | Status | Notes |
|---|---|---|
| Moloko 2FA stale factor | Fixed | Auto-cleanup added to mfa-setup page |
| TypeScript build error on Vercel (MFA status type) | Fixed | Cast to `(f.status as string)` |
| RLS infinite recursion on event_team_members | Fixed | SECURITY DEFINER function added |
| YouTube URL in event media manager | Unverified | `event_media` table may not exist on live DB — check migration 003 ran |
| Footer social icon links are `#` placeholders | Pending | Real social links needed |
| `vercel.json` cron not configured | Pending | Add cron schedule to enable event lifecycle automation |

### Outstanding Work

| Item | Priority | Notes |
|---|---|---|
| Verify live DB has all expected tables | HIGH | Run verification SQL below on live Supabase |
| Moloko: reset 2FA — delete both Google Authenticator entries + re-enroll | HIGH | Run: `DELETE FROM auth.mfa_factors WHERE user_id = '<moloko-user-id>'` in Supabase SQL Editor, then re-setup at /auth/mfa-setup |
| Confirm migrations 003–010 all ran on live DB | HIGH | Some tables may be missing |
| Add `vercel.json` with cron schedule | MEDIUM | For event lifecycle automation |
| Add real social media links to footer | MEDIUM | Instagram, TikTok, YouTube handles |
| Ticket gifting end-to-end flow | MEDIUM | Backend logic exists, UI may need work |
| Provider social links dashboard UI | LOW | Backend + DB exists, similar to artist social links |

### Live DB Verification SQL
Run in Supabase SQL Editor to check all expected tables exist:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected tables:** `admin_audit_logs`, `artist_media`, `artist_social_links`, `artists`, `audit_log`, `bookings`, `conversations`, `dispute_tracking`, `email_logs`, `email_templates`, `event_access_passes`, `event_media`, `event_rating_summaries`, `event_team_members`, `event_ticket_types`, `events`, `featured_events`, `messages`, `notifications`, `organizer_media`, `organizer_social_links`, `platform_settings`, `provider_bookings`, `provider_media`, `provider_services`, `provider_social_links`, `providers`, `reports`, `review_helpful_votes`, `reviews`, `support_tickets`, `ticket_replies`, `tickets`, `transactions`, `user_warnings`, `verification_requests`

---

## 24. DATABASE MIGRATIONS LOG

| File | Status | What It Does |
|---|---|---|
| `schema-v2.sql` | Applied | Core tables: profiles, artists, events, bookings, transactions, tickets, payouts, audit_log |
| `002_providers.sql` | Applied | Provider system: providers, provider_services, provider_bookings |
| `003_advanced_profiles.sql` | Applied | Trust stats, social links, media galleries, discography, conversations/messages |
| `004_storage_bucket.sql` | Applied (manual) | Instructions for creating `media` storage bucket in Supabase dashboard |
| `005_notifications.sql` | Applied | Notifications table + RLS |
| `006_reviews.sql` | Applied | Reviews, helpful votes, rating summaries |
| `007_fix_events_rls.sql` | Applied | Fixed broken RLS + added `is_published` column to events |
| `008_admin_system.sql` | Applied | Reports, warnings, support_tickets, email_templates, email_logs, admin_audit_logs, platform_settings, featured_events + sets initial admins (Moloko + Zwonaka) |
| `010_service_images.sql` | Applied | Adds `image_url` to `provider_services` |

---

## 25. CHANGELOG

### April 2026
- Added `MASTER.md` v2.0 — comprehensive complete platform reference (this document)
- Fixed admin 2FA setup page: auto-cleans stale unverified MFA factors before new enrollment
- Fixed TypeScript build error: `(f.status as string) === 'unverified'` cast
- Footer legal links centered on desktop (`md:justify-center`)
- Hero video integrated (`public/hero.mp4`) with dark overlay
- Typewriter hero updated: "Hello South Ah! 🇿🇦", "Ziwaphi?", "Well, you've come to the right place.", "Clicka daar!"
- RLS infinite recursion fixed (event_team_members SECURITY DEFINER function)
- Phase 8D: ESLint warnings resolved (137 → 0)
- Rath Group partnership added to About, FAQ, Terms, Privacy, Refunds pages
- Ziwaphi confirmed rule-based NLP (zero external AI API costs)
- All changes deployed to Vercel (commit 47e1622)

### Earlier 2026
- Provider/crew system added (migration 002)
- Advanced artist profiles: trust stats, social links, media, discography (migration 003)
- Notifications system (migration 005)
- Reviews and ratings (migration 006)
- Admin system: users, verifications, disputes, finance, audit logs (migration 008)
- Messaging (conversations + messages tables)
- Ziwaphi natural language event search
- Paystack payment integration (tickets, bookings, deposits, withdrawals)
- Three-bucket escrow system
- Vercel auto-deploy from GitHub main

---

*Last updated: April 2026 — Zande Technologies (Pty) Ltd*
