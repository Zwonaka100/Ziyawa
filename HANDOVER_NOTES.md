# Ziyawa - Client Handover Notes

## Items to Change Before Production

This document lists all temporary configurations that need to be updated when handing over to the client.

---

### 1. Email Service (Resend)

**File:** `.env.local`

| Current (Zande) | Client Should Replace With |
|-----------------|---------------------------|
| `RESEND_API_KEY=re_eeZUqWEb_GSgHBh5cqW8pq3UcixQXU4Qj` | Client's own Resend API key |
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
3. Set up webhook URL: `https://ziyawa.vercel.app/api/payments/webhook`
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
- [ ] Run all database migrations on production
- [ ] Test payment flow with small real transaction
- [ ] Test email delivery
- [ ] Set up error monitoring (Sentry recommended)
- [ ] Configure analytics (if needed)

---

*Last Updated: February 2026*
*Prepared by: Zande Technologies*
