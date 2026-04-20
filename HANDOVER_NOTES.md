# Ziyawa - Client Handover Notes

## Items to Change Before Production

This document lists all temporary configurations that need to be updated when handing over to the client.

---

### 1. Email Service (Resend)

**File:** `.env.local`

| Current (Zande) | Client Should Replace With |
|-----------------|---------------------------|
| `RESEND_API_KEY=YOUR_RESEND_API_KEY` | Client's own Resend API key |
| `FROM_EMAIL=Ziyawa <noreply@zande.io>` | Client's verified domain email (e.g., `noreply@ziyawa.co.za`) |

**Steps for client:**
1. Create account at [resend.com](https://resend.com)
2. Add and verify domain (e.g., ziyawa.co.za)
3. Create API key
4. Update `.env.local` with new values

---

### 2. Payment Gateway (Paystack)

**File:** `.env.local`

| Current (Test Mode) | Client Should Replace With |
|---------------------|---------------------------|
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...` | Live public key from Paystack |
| `PAYSTACK_SECRET_KEY=sk_test_...` | Live secret key from Paystack |
| `PAYSTACK_WEBHOOK_SECRET=` | Set in Paystack dashboard |

**Steps for client:**
1. Complete Paystack business verification
2. Get live API keys from dashboard
3. Set up webhook URL: `https://ziyawa.vercel.app/api/webhooks/paystack`
4. Update `.env.local` with live keys

---

### 3. Supabase

**File:** `.env.local`

Current setup uses the development Supabase project. For production:

| Item | Action |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | May need new production project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Update if new project |
| `SUPABASE_SERVICE_ROLE_KEY` | Update if new project |

**Considerations:**
- Decide if using same project or creating production-specific one
- Enable email confirmations in Auth settings
- Set up proper RLS policies review
- Configure custom SMTP for auth emails
- Set Site URL to `https://ziyawa.vercel.app`
- Add `https://ziyawa.vercel.app/auth/callback` to redirect URLs

---

### 4. App URL

**File:** `.env.local`

| Current | Production |
|---------|------------|
| `NEXT_PUBLIC_APP_URL=http://localhost:3000` | `https://ziyawa.vercel.app` |

---

### 5. Domain & Hosting

| Item | Notes |
|------|-------|
| Domain | Currently using `ziyawa.vercel.app` (can add custom domain later) |
| Hosting | Deploy to Vercel (recommended) |
| SSL | Automatic with Vercel |

---

## Files Containing Hardcoded References

Check these files for any hardcoded URLs or values:

- `/lib/email-templates.ts` - Contains `ziyawa.co.za` references
- `/lib/email.ts` - Uses env vars (should be fine)

---

## Checklist Before Go-Live

- [ ] Replace Resend API key with client's
- [ ] Verify client's email domain in Resend
- [ ] Replace Paystack test keys with live keys
- [ ] Set Paystack webhook secret
- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain
- [ ] **Run all database migrations on production Supabase** (including `016_conversation_controls.sql` and `017_fix_rls_recursion.sql`)
- [ ] Test payment flow with small real transaction
- [ ] Test email delivery
- [ ] Set up error monitoring (Sentry recommended)
- [ ] Configure analytics (if needed)

---

## Development Phases

> Reference for ongoing development. Update as phases complete.

### Phase 1 — Core MVP ✅ Complete
Event discovery, ticket purchase, Paystack integration, auth, role-based dashboards, artist booking, admin dashboard.

### Phase 2 — Crew & Provider Marketplace ✅ Complete
Provider profiles with work modes, service catalogue, provider booking, crew discovery, crew dashboard, reviews, notifications.

### Phase 3 — UX Polish, Comms Policy & Platform Trust ✅ Complete (April 2026)

**Key decisions made in this phase — do not revert without business sign-off:**

| Decision | Why |
|---|---|
| No phone/email on public profiles | All contact stays on-platform. Prevents off-platform deal-making and lost bookings |
| No cold messaging — must book first | Uber-style: opens the conversation automatically when you make a booking |
| Conversations auto-close on complete/decline | Clean lifecycle — no dangling open chats after job is done |
| All messages permanently stored | Admin can pull conversation history for any dispute |
| New booking re-opens closed chat | One thread per pair — no duplicate conversations |
| Platform messaging is the only path | Removes incentive for parties to exchange personal contacts |

**What was built:**
- Booking-gated `/api/conversations/start` — checks `provider_bookings`, `bookings`, `event_team_members` for active booking before allowing chat
- Auto-start conversation after booking (org sees messages page immediately after booking)
- Closed chat state in messages UI (lock banner, disabled input when `is_closed = true`)
- Migration `016_conversation_controls.sql` — adds `is_closed`/`closed_at`/`closed_reason` columns, DB triggers for auto-close, admin RLS
- Admin Conversation Logs at `/admin/communications/conversations` — full audit trail for disputes
- Crew profile, badge, and edit form UX fixes across all affected pages

**⚠️ Action required:** Run `supabase/migrations/016_conversation_controls.sql` in Supabase SQL Editor before testing messaging flows on production.

### Phase 4 — Booking Lifecycle & Payment Hardening 🚧 Next
- Provider/crew payment flow via Paystack (artist done, crew not yet wired)
- Organizer UI to mark crew bookings as completed
- Wallet release for crew on booking completion
- Booking confirmation + status change emails
- Work invite payout per shift

### Phase 5 — Mobile Polish & Pre-Launch ⬜ Planned
- Mobile responsiveness audit
- Push notifications
- Production key rotation
- Smoke test coverage

---

### Phases 8A–8D — Hardening & Polish ✅ Complete (April 2026)

**Phase 8A — Legal & Compliance** ✅
- Terms of Service, Privacy Policy, Refund Policy pages
- Cookie consent banner (POPIA compliant)
- PAIA manual route, Info Regulator registration ref: 2025-066656

**Phase 8B — SEO & Social Sharing** ✅
- Full metadata, OpenGraph, and Twitter cards on all public pages
- Structured data (JSON-LD) for events
- Sitemap, robots.txt

**Phase 8C — UX & Design Polish** ✅
- Logo finalized (V1 sound wave / equalizer)
- Typewriter hero text on homepage
- Consistent grayscale/neutral design system

**Phase 8D — Hardening & Cleanup** ✅
- 137 ESLint warnings → 0 across ~60 files
- Replaced `<img>` with `<Image>` (Next.js optimized)
- Fixed `react-hooks/exhaustive-deps`, `set-state-in-effect` patterns
- Removed unused logo comparison page and backup logo files
- Added `varsIgnorePattern: "^_"` to ESLint config
- Clean production build: 0 errors, 0 warnings, 105 routes

**⚠️ Action required:** Run `supabase/migrations/017_fix_rls_recursion.sql` in Supabase SQL Editor to fix events search RLS infinite recursion.

---

*Last Updated: April 2026*
*Prepared by: Zande Technologies*
