# Launch Readiness Audit

This audit answers one question:

Can Ziyawa reliably support a real organizer running a real event with real money, real tickets, real check-in, real bookings, and real payouts?

Short answer:

- ticketing, check-in, booking creation, booking payment initiation, escrow holding, and wallet withdrawal flows are substantially real
- refunds, provider response workflow parity, employee payroll payout flow, and full end-to-end operational confidence are not yet at the same level
- the platform is close to pilot-ready for controlled events, but not yet fully hardened for unrestricted production operations without tighter testing and a few high-risk fixes

## Locked Product Decisions

These decisions are now fixed and should drive implementation:

1. Refunds are not automatic.
2. All refunds require admin or super admin review and approval.
3. Refunds go back to the user's Ziyawa wallet, not directly back to card.
4. Users can withdraw refunded money from wallet and standard withdrawal fees still apply.
5. If an organizer cancels an event, the platform must notify admin and create an admin refund workflow for affected customers.
6. Admins can process those refunds in bulk or manually.
7. Attendees need a clear post-event reporting path for incidents or problems tied to events they attended.
8. Employee payments are on-platform: organizers pay employees into employee wallets, platform fees apply, and employees withdraw with withdrawal fees.

## Readiness Summary

| Branch | Status | Notes |
|---|---|---|
| Event discovery and public pages | Green | Core public browse experience exists and production build passes. |
| Ticket buying | Yellow-Green | Payment init and webhook processing are real, but full live-event regression coverage is missing. |
| Ticket QR and check-in | Green | Validation and check-in flows exist with organizer/team access control. |
| Organizer event ops | Yellow | Core event management exists, but cancellation and refund ops are not fully hardened. |
| Artist booking lifecycle | Yellow-Green | Stronger than crew flow, includes gate, request, response, counter-offer, payment, escrow. |
| Crew/provider service booking | Yellow | Request flow is real, but provider-side response workflow is weaker and inconsistent. |
| Event staff and employee management | Red | Product decision is now on-platform payroll, but implementation is still bookkeeping-only. |
| Wallet deposits and withdrawals | Yellow-Green | Withdrawal and payout logic is real, but needs more live reconciliation testing. |
| Refunds and reversals | Red | Refund direction is now decided, but admin approval workflow, wallet-credit rules, event-cancel triggers, and policy text still need to be aligned and implemented. |
| Notifications and email side effects | Yellow | Many flows send notifications, but coverage is inconsistent and some surfaces still show placeholder-era patterns. |
| Admin dispute handling | Yellow | Admin dispute resolution exists, but wallet-credit outcomes differ from public policy wording. |
| Automated verification of platform health | Red | Smoke tests are intentionally lightweight and do not test money, bookings, or event-day execution. |

## Findings

### 1. Refund branch rules were undecided before, and the current implementation/public policy still do not match the locked product decision
Severity: Critical

The locked product rule is now clear:

- refunds are never automatic
- refunds must be approved by admin or super admin
- approved refunds credit the user's wallet
- users withdraw from wallet under normal withdrawal-fee rules

The current public policy and implementation do not yet reflect that model consistently.

Evidence:

- [src/app/refunds/page.tsx](src/app/refunds/page.tsx#L37)
- [src/app/api/admin/disputes/resolve/route.ts](src/app/api/admin/disputes/resolve/route.ts#L143)
- [src/app/api/webhooks/paystack/route.ts](src/app/api/webhooks/paystack/route.ts#L566)
- [src/app/admin/finance/refunds/page.tsx](src/app/admin/finance/refunds/page.tsx)

Operational impact:

- If an organizer cancels an event or a ticket refund is required, the actual customer outcome is still ambiguous unless admin intervenes carefully.
- This remains the highest trust and operations risk in the platform.

What must happen:

1. Rewrite the refund policy to match the wallet-credit, admin-approved model.
2. Create a cancellation trigger path so organizer event cancellation notifies admin and creates refund work items for all affected customers.
3. Make refund approval explicit in admin workflows.
4. Support both bulk admin processing and manual per-user processing.
5. Verify that refunded wallet money can be withdrawn cleanly with normal fees.

### 2. Provider booking response flow is weaker than artist booking flow
Severity: High

Artist bookings now use server-side response endpoints with notifications and stricter validation, but provider bookings still appear to accept or decline from the client by writing directly to the database.

Evidence:

- [src/app/dashboard/provider/page.tsx](src/app/dashboard/provider/page.tsx#L213)
- [src/app/dashboard/provider/page.tsx](src/app/dashboard/provider/page.tsx#L220)
- [src/app/dashboard/provider/page.tsx](src/app/dashboard/provider/page.tsx#L221)

Operational impact:

- Crew/service bookings do not have the same reliability guarantees as artist bookings.
- Notifications, timestamps, validation rules, and state transition discipline can drift.
- This increases the chance of “it looked accepted in UI but downstream flow broke” situations.

What must happen:

1. Add provider equivalents of artist response endpoints.
2. Move accept and decline logic off the client.
3. Add provider-side counter-offer parity if that is intended product behavior.

### 3. Employee payment is now a confirmed product branch, but current code is still only tracking and bookkeeping
Severity: High

The product decision is now fixed: employee payment is on-platform. Organizers should be able to process employee pay into employee wallets, Ziyawa should take platform fees, and employees should later withdraw through the wallet flow.

The current code does not yet do that. It stores payment plans and marks them paid, but it does not integrate those employee payments into wallet, escrow, transaction, or Paystack payout flows.

Evidence:

- [src/app/api/events/[id]/team/route.ts](src/app/api/events/[id]/team/route.ts#L300)
- [src/app/api/events/[id]/team/route.ts](src/app/api/events/[id]/team/route.ts#L321)
- [src/app/api/events/[id]/team/route.ts](src/app/api/events/[id]/team/route.ts#L345)
- [src/components/events/event-staff-manager.tsx](src/components/events/event-staff-manager.tsx)

Operational impact:

- You can manage staff and track who should be paid.
- You cannot yet rely on Ziyawa to actually pay event employees as a real platform money flow.
- Today this is workforce coordination plus bookkeeping, while the product now requires true payout behavior.

What must happen:

1. Model employee payment transactions explicitly.
2. Decide whether employee funds are paid immediately to wallet or held until event completion.
3. Add organizer payment action that credits employee wallet minus platform fee.
4. Add employee-facing payout visibility in My Work or wallet history.
5. Reconcile those payments with withdrawal and payout webhooks.

### 4. A visible API surface exists for provider bookings but is effectively empty
Severity: Medium-High

There is a provider bookings API route file that exports nothing meaningful.

Evidence:

- [src/app/api/provider-bookings/route.ts](src/app/api/provider-bookings/route.ts#L1)

Operational impact:

- This creates architecture drift and false confidence because the route exists in the tree but not as a functional contract.
- Even if current UI paths bypass it, it is dead or misleading surface area.

What must happen:

1. Either implement it properly.
2. Or remove it from the surface and documentation.

### 5. The current smoke suite does not validate business-critical event operations
Severity: Medium-High

The existing smoke tests explicitly avoid bookings and charges.

Evidence:

- [docs/SMOKE_TESTS.md](docs/SMOKE_TESTS.md#L28)
- [docs/SMOKE_TESTS.md](docs/SMOKE_TESTS.md#L29)

Operational impact:

- You cannot currently say with confidence that a full event lifecycle works just because smoke tests pass.
- The highest-risk branches are still mostly unverified in automated form.

What must happen:

1. Add mission-critical operational smoke scenarios.
2. Add a manual launch drill for event-day operations.
3. Add sandbox payment drills before organizer onboarding opens widely.

### 6. Ticketing and check-in look real, but still need live-drill validation
Severity: Medium

Ticket validation and check-in routes are implemented with access control and event-day checks, and they support both paid tickets and access passes.

Evidence:

- [src/app/api/tickets/validate/route.ts](src/app/api/tickets/validate/route.ts)
- [src/app/api/tickets/checkin/route.ts](src/app/api/tickets/checkin/route.ts)
- [src/app/dashboard/organizer/events/[id]/checkin/page.tsx](src/app/dashboard/organizer/events/[id]/checkin/page.tsx)
- [src/app/api/events/[id]/team-access/route.ts](src/app/api/events/[id]/team-access/route.ts)

Operational impact:

- This is one of the stronger branches in the app.
- The remaining risk is operational rather than structural: camera scanning, staff onboarding, duplicate scans, and event-day network/device behavior need real drills.

What must happen:

1. Run a mock door test with multiple tickets and guest passes.
2. Test both manual code entry and camera scan flow.
3. Test with organizer account and team-member account.

### 7. Post-event attendee incident reporting needs a dedicated operational path
Severity: Medium

You decided that attendees should be able to report problems related to events they attended. The current reporting branch exists, but the audit should now treat attended-event incident reporting as a launch requirement, not an optional moderation feature.

Operational impact:

- After a real event, customers need a clean way to report safety incidents, organizer misconduct, no-show issues, or other problems tied to that event.
- Without an attended-event report path, disputes and post-event trust handling stay too ad hoc.

What must happen:

1. Add a clear report action on attended events and/or attended tickets surfaces.
2. Pre-fill event context when the user came from an attended event.
3. Route those reports to admin review with event-specific classification.

### 8. Notification and email architecture is functional but unevenly trusted
Severity: Medium

Notification sending does call email code, but there are still placeholder-era comments and mixed reliability across flows.

Evidence:

- [src/lib/notifications.ts](src/lib/notifications.ts#L345)
- [src/lib/notifications.ts](src/lib/notifications.ts#L348)

Operational impact:

- Some core branches send side effects correctly.
- But the platform still needs a branch-by-branch audit of which user communications are guaranteed and which are only best effort.

What must happen:

1. Build a notification matrix for ticketing, bookings, disputes, payouts, support, and event reminders.
2. Verify each row with an actual triggered event.

## What Is Strong Today

These areas appear materially real and useful:

1. Ticket purchase initialization and webhook processing.
2. Escrow bucket model for held, available, and pending payout balances.
3. Wallet withdrawal initiation with Paystack transfer recipient and transfer handling.
4. Artist booking gate and server-created booking requests.
5. Artist response and counter-offer flow.
6. Event check-in and ticket validation routes.
7. Team-access permission checks for door staff.

## What Is Not Yet Safe To Overclaim

Do not currently overstate these in sales or organizer onboarding until hardened:

1. Admin-approved wallet-credit refunds.
2. Fully integrated employee payroll.
3. Full parity between artist and provider booking operations.
4. Complete launch confidence from current automated tests.
5. End-to-end production-readiness of every event-day branch without a real rehearsal.

## Practical Advice

If you want to start onboarding organizers now, do it as a controlled pilot, not an unrestricted public rollout.

Good pilot scope:

1. One or two trusted organizers.
2. One real event with simple ticketing.
3. One artist booking and one provider booking.
4. One check-in rehearsal before event day.
5. Manual monitoring of webhook, balances, notifications, and support.

## Immediate Action Plan

### Phase 1: Fix money-policy contradictions

1. Rewrite refund policy to the admin-approved wallet-credit model.
2. Define exact refund paths for cancelled events, duplicate charges, provider failure, and artist failure.
3. Implement event-cancel admin notification plus customer refund work-item generation.
4. Implement admin bulk and manual refund flows into wallet.

### Phase 2: Harden booking parity

1. Add server-side provider accept and decline endpoints.
2. Add provider notification parity.
3. Decide whether provider counter-offers are required.

### Phase 3: Build employee-pay branch properly

1. Convert employee pay from tracking-only to true wallet-credit flow.
2. Apply platform fees to employee payments.
3. Add employee payment records to wallet history and reporting.
4. Confirm withdrawal path works for employee earnings.

### Phase 4: Event-day drills

1. Create a real or sandbox event.
2. Buy test tickets.
3. Generate guest passes.
4. Check in from organizer account.
5. Check in from team-member account.
6. Trigger completion and verify escrow release timing behavior.
7. Submit a post-event attendee report from an attended-event context.

### Phase 5: Go-live test matrix

1. Ticket purchase success.
2. Duplicate ticket prevention and ticket issuance integrity.
3. Artist request, accept, counter, pay, complete, payout.
4. Provider request, accept, pay, complete, payout.
5. Withdrawal success and withdrawal failure recovery.
6. Refund and dispute outcomes.
7. Notification and email delivery for each branch.
