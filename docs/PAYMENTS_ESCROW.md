# Payments, Escrow, and Payout Safety

## Overview

Ziyawa now uses a protected payout model for Paystack:

- ticket and booking payments land in a held transaction state
- only cleared wallet balance can be withdrawn
- event and service payouts release after completion confirmation and a safety hold window
- bank cash-outs move through Paystack Transfers automatically

## Balance Buckets

Each profile can track:

- `wallet_balance` — available to spend or withdraw
- `held_balance` — protected escrow funds not yet released
- `pending_payout_balance` — already requested and waiting on settlement

## Completion Confirmation

### Events

Use `POST /api/events/:id/complete` after the event has happened.

Rules:
- organizer or admin can mark the event complete
- the event moves to `completed`
- the hold window is set using `PAYOUT_HOLD_HOURS` (default 48)
- large payouts wait for stronger trust signals before release

### Artist bookings

Use `POST /api/bookings/:id/complete`.

Rules:
- organizer and artist can each confirm completion
- once both sides confirm, the booking becomes `completed`
- held funds become eligible for wallet release after the safety window

### Provider bookings

Use `POST /api/provider-bookings/:id/complete`.

Rules:
- organizer and provider confirm delivery
- once both sides confirm, the service booking becomes `completed`

## Release Job

Use `POST /api/payments/release` or schedule it with Vercel Cron.

Environment variables:

- `CRON_SECRET` — protects the automated release endpoint
- `PAYOUT_HOLD_HOURS` — default 48
- `BOOKING_PAYOUT_HOLD_HOURS` — default 24
- `MANUAL_REVIEW_THRESHOLD_RANDS` — default 5000
- `PAYSTACK_WEBHOOK_SECRET` — required for production webhook verification

## Withdrawal Flow

1. user requests payout
2. amount moves from available balance to pending payout balance
3. Paystack transfer is initiated automatically
4. webhook marks it settled on success
5. if Paystack fails or reverses, the amount returns to the wallet
