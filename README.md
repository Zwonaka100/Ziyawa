# Ziyawa 🎵

**Your Event Operating System for South Africa**

Ziyawa is a demo event marketplace connecting event organizers, artists, and groovists (event-goers) across South Africa.

![MVP](https://img.shields.io/badge/Status-MVP%20Beta-green)
![Next.js](https://img.shields.io/badge/Next.js-14+-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)
![Supabase](https://img.shields.io/badge/Supabase-Database-green)

## 🌟 Features

### For Groovists (Event-goers)
- **Ziwaphi?** ("Where are they?") - Discover upcoming events across all 9 SA provinces
- Filter events by location and date
- Purchase tickets with simulated Paystack checkout
- View and manage your tickets

### For Event Organizers
- Create and manage events
- Book artists for your events
- Track ticket sales and revenue
- Manage booking requests

### For Artists
- Create a public profile with genre and base price
- Receive and manage booking requests
- Accept or decline with notes
- Track earnings in your wallet

## 🛠 Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript
- **Styling**: TailwindCSS, Shadcn UI
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Payments**: Paystack (mocked for demo)

## 📁 Project Structure

```
ziyawa/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── auth/               # Authentication pages
│   │   ├── artists/            # Artist directory & profiles
│   │   ├── dashboard/          # User dashboards
│   │   │   ├── artist/         # Artist dashboard
│   │   │   ├── organizer/      # Organizer dashboard
│   │   │   └── tickets/        # User tickets
│   │   ├── events/             # Event details
│   │   ├── ziwaphi/            # Events discovery page
│   │   └── profile/            # User profile
│   ├── components/
│   │   ├── ui/                 # Shadcn UI components
│   │   ├── auth/               # Auth components
│   │   ├── artists/            # Artist components
│   │   ├── bookings/           # Booking components
│   │   ├── events/             # Event components
│   │   ├── layout/             # Layout components (navbar, footer)
│   │   ├── payments/           # Payment components
│   │   └── providers/          # Context providers
│   ├── lib/
│   │   ├── supabase/           # Supabase clients
│   │   ├── constants.ts        # App constants
│   │   ├── helpers.ts          # Utility functions
│   │   └── utils.ts            # Shadcn utilities
│   └── types/
│       └── database.ts         # TypeScript types
├── supabase/
│   ├── schema.sql              # Database schema
│   └── seed.sql                # Sample data
└── .env.local                  # Environment variables
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Supabase account (free tier works)

### 1. Clone and Install

```bash
cd ziyawa
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. (Optional) Run `supabase/seed.sql` to add sample data
4. Go to **Settings > API** and copy your:
   - Project URL
   - Anon/Public key

### 3. Configure Environment

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Paystack (optional - demo mode works without real keys)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_key_here
PAYSTACK_SECRET_KEY=sk_test_your_key_here
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 👥 User Roles

| Role | Description |
|------|-------------|
| **User/Groovist** | Default role. Can browse events and buy tickets. |
| **Organizer** | Can create events and book artists. |
| **Artist** | Can create a profile and receive/manage bookings. |
| **Admin** | Full access (for future admin features). |

## 💰 Payment Flow (Demo Mode)

1. **Ticket Purchase**: User clicks "Buy Ticket" → simulated Paystack checkout
2. **Transaction Created**: Record saved with platform fee (10%)
3. **Ticket Generated**: Unique ticket code issued
4. **Organizer Credited**: Net amount added to organizer's wallet

> **Note**: This is a demo. In production, you'd integrate real Paystack webhooks.

## 📊 Database Models

### Key Tables

- **profiles**: User data (extends Supabase Auth)
- **artists**: Artist profiles (linked to profiles)
- **events**: Events created by organizers
- **bookings**: Artist booking requests
- **transactions**: All financial movements
- **tickets**: Purchased event tickets

### Row Level Security (RLS)

All tables have RLS policies:
- Users can only view/edit their own data
- Published events are public
- Available artists are public
- Organizers can only book for their events
- Artists can only manage their bookings

## 🎨 UI Components (Shadcn)

Installed components:
- Button, Card, Input, Label
- Select, Badge, Tabs
- Avatar, Dialog, Dropdown Menu
- Separator, Sonner (toast notifications)

## 🔧 Key Files

| File | Purpose |
|------|---------|
| `src/middleware.ts` | Session management |
| `src/lib/supabase/server.ts` | Server-side Supabase client |
| `src/lib/supabase/client.ts` | Browser-side Supabase client |
| `src/components/providers/auth-provider.tsx` | Auth context |
| `src/lib/constants.ts` | Provinces, genres, booking statuses |
| `src/lib/helpers.ts` | Currency formatting, date utils |

## 🧪 Testing the Demo

### As a Groovist:
1. Sign up as a "Groovist"
2. Browse events on "Ziwaphi?"
3. Click an event and buy a ticket
4. Check your tickets in the dashboard

### As an Organizer:
1. Sign up as an "Event Organizer"
2. Create an event in your dashboard
3. Book an artist for the event
4. Wait for artist to accept

### As an Artist:
1. Sign up as an "Artist"
2. Complete your artist profile setup
3. Wait for booking requests
4. Accept or decline bookings

## 📐 Development Phases

### Phase 1 — Core MVP ✅ Complete
- Event discovery (Ziwaphi), ticket purchase, Paystack integration
- Auth, role-based dashboards (Groovist, Organizer, Artist)
- Artist booking flow (request → accept/decline → wallet credit)
- Admin dashboard (users, events, reports, finance, support tickets)

### Phase 2 — Crew & Provider Marketplace ✅ Complete
- Provider (Crew) profiles with `work_mode`: Event Staff / Service Provider / Both
- Service catalogue with pricing (per hour, per day, per unit, fixed)
- Provider booking flow (service booking + event work invite)
- Crew discovery listing page (`/crew`)
- Provider dashboard with active bookings, wallet, and service management
- Review system for both artists and providers
- Notifications foundation

### Phase 3 — UX Polish, Comms Policy & Platform Trust ✅ Complete

All work done in this phase was intentional hardening — no cutting corners.

#### Crew Marketplace UX
- Fixed duplicate badge bug: `work_mode` badges now only reflect actual mode (`looking_for_work` → Event Staff, `offering_services` → category label, `both` → both badges). `primary_category: event_staff` no longer collides with work-mode badge
- Fixed missing Hire/Book CTAs — buttons now appear inside the Work Profile and Services tabs, not just the sidebar
- Edit Crew Profile (`/dashboard/provider/setup`) fully restructured: 3-button work mode selector at top → work profile fields and services fields in clearly separated sections → Skills & Roles field added to work profile section
- Back button added to Edit Crew Profile
- "Add Service" removed from Crew Dashboard header (de-cluttered)
- Navbar: Crew Dashboard dropdown item alignment fixed (removed `justify-between`, badge count uses `ml-2`)
- Public crew profile: phone and email removed — all comms kept on-platform via booking-gated messaging

#### On-Platform Messaging Policy (Uber-style, booking-gated)
Key decisions documented here for future reference:

| Rule | Implementation |
|---|---|
| No cold messaging — chat only after booking | `/api/conversations/start` checks for active booking (`pending/accepted/paid`) across `provider_bookings`, `bookings`, `event_team_members` before allowing a conversation |
| Chat opens automatically when org books | After booking insert, `conversations/start` is called automatically → org redirected straight to messages |
| Crew/artist can message org to negotiate | Existing booking in any `ACTIVE` status unlocks the gate in both directions |
| Declined booking → chat closes | DB trigger on `provider_bookings` + `bookings`: `status = 'declined'` → `is_closed = true`, `closed_reason = 'booking_declined'` |
| Completed + paid → chat closes | Same triggers: `status = 'completed'` → `is_closed = true`, `closed_reason = 'booking_completed'` |
| New booking reopens closed chat | `conversations/start` re-opens a closed conversation if a new active booking exists (no duplicate threads) |
| All messages permanently stored | RLS never deletes messages — all conversations available to admin |
| Messages UI shows locked state | When `is_closed = true`, message input replaced with lock banner |
| Phone/email removed from profiles | No contact details shown publicly — keeps all comms on-platform |

#### Admin Audit Trail
- Admin Conversation Logs at `/admin/communications/conversations`
- Table view of all conversations (participant names, context, last activity, open/closed)
- Click any conversation → full message thread in a side sheet
- Filter by open/closed/all, search by participant name
- "For dispute investigation only" warning shown
- RLS policies added: admins with `is_admin = true` or `role = 'super_admin'` can read all conversations and messages

#### Migration Required
Run `supabase/migrations/016_conversation_controls.sql` in Supabase SQL Editor:
- Adds `is_closed`, `closed_at`, `closed_reason` to `conversations`
- Adds `initiated_by_booking` flag
- Creates DB triggers for auto-close on complete/decline
- Creates admin RLS policies
- Creates RLS policy blocking messages in closed conversations

### Phase 4 — Booking Lifecycle & Payments Hardening 🚧 Next
- Crew booking status lifecycle: `pending → accepted → paid → completed` — build the organizer-side status management UI (currently organizer sees booking but can't mark as completed from a clear UI)
- Payment flow for crew/provider bookings (currently artist payments flow through Paystack; provider bookings need same flow wired up)
- Wallet release for crew: when `provider_booking.status = completed`, release held funds to provider wallet
- Work invite lifecycle: `event_team_members` status transitions + payout per shift
- Booking confirmation emails: trigger Resend emails to both parties on accept/decline/complete
- "Negotiate" flow polish: when crew sends a counter-offer in chat, organizer gets a notification pointing back to the booking

### Phase 5 — Mobile Polish & Pre-Launch ⬜ Planned
- Mobile responsiveness audit across all dashboards and profile pages
- Push notifications (Supabase Realtime → browser push or in-app)
- Onboarding tooltips for first-time crew/organizer users
- Production key rotation (Paystack live, Resend custom domain, Supabase prod project)
- Smoke test coverage expansion
- Performance audit (image optimisation, lazy loading)

---

## 📌 Platform Decisions Log

> Architectural/product decisions made so future developers don't undo them.

| Decision | Reason |
|---|---|
| No cold messaging between any parties | Prevents off-platform business — keeps all comms and payments inside Ziyawa |
| Conversations auto-close on booking completion | Uber-style: once job done and paid, chat closes. All messages retained for disputes |
| All messages permanently stored | Admin/super-admin can pull conversation logs for dispute investigation |
| Phone/email hidden on all public profiles | Prevents direct off-platform contact — messaging only unlocked via booking |
| Booking gate checked on both sides | Both org→crew and crew→org lookups validated so either party can initiate once booked |
| Single conversation per pair | No duplicate threads — re-open on new booking, not a new thread |

---

## 🗄️ Current Migration State

| File | Description | Status |
|---|---|---|
| `schema.sql` | Base schema | ✅ |
| `002_providers.sql` | Provider/crew tables | ✅ |
| `003_advanced_profiles.sql` | Conversations, messages, media | ✅ |
| `004_storage_bucket.sql` | Storage policies | ✅ |
| `005_notifications.sql` | Notifications table | ✅ |
| `006_reviews.sql` | Reviews system | ✅ |
| `007_fix_events_rls.sql` | Events RLS fix | ✅ |
| `008_admin_system.sql` | Admin role + policies | ✅ |
| `010_service_images.sql` | Service image uploads | ✅ |
| `014_event_team_access.sql` | Event team invites + members | ✅ |
| `016_conversation_controls.sql` | Booking-gated messaging + auto-close | ⚠️ **Run this in Supabase** |

---

## 📅 Status (April 2026)


## 📅 Status (April 2026)

### Working now
- ✅ Public event discovery with Ziwaphi
- ✅ Authentication and role-based dashboards
- ✅ Organizer event creation and artist booking flows
- ✅ Ticket purchase flow with Paystack integration in test mode
- ✅ Admin dashboard for users, events, reports, finance, support, and conversation logs
- ✅ Provider/Crew marketplace — discovery, profiles, booking, services, work invites
- ✅ Booking-gated on-platform messaging (Uber-style open/close lifecycle)
- ✅ Reviews, notifications, and wallet foundation
- ✅ All messages permanently stored — admin audit trail via Conversation Logs

### In progress / next up (Phase 4)
- ⚠️ Provider payment flow — wire Paystack to `provider_bookings` (artist payments done, crew not yet)
- ⚠️ Booking status UI for organizers — mark crew bookings as completed from dashboard
- ⚠️ Wallet release for crew on booking completion
- ⚠️ Booking confirmation emails via Resend
- ⚠️ Production key rotation, webhook hardening, monitoring

## 🧪 Smoke Testing

Run the lightweight launch checks against a running local app:

```bash
npm run dev
npm run test:smoke
```

The smoke suite checks the core launch routes for sign-in, event discovery, event details/ticket purchase visibility, organizer booking protection, wallet access, and support access.

## 📝 License

This is a demo project for demonstration purposes.

---

**Built with ❤️ in South Africa**
