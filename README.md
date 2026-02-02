# Ziyawa 🎵

**Your Event Operating System for South Africa**

Ziyawa is a demo event marketplace connecting event organizers, artists, and groovists (event-goers) across South Africa.

![Demo](https://img.shields.io/badge/Status-Demo-yellow)
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

## 🚧 What's Not Included (Demo Scope)

- ❌ Real payment processing
- ❌ Chat/messaging between users
- ❌ Reviews and ratings
- ❌ Vendor marketplace
- ❌ Mobile app
- ❌ Admin dashboard
- ❌ Email notifications
- ❌ Image uploads (using placeholders)

## 📝 License

This is a demo project for demonstration purposes.

---

**Built with ❤️ in South Africa**
