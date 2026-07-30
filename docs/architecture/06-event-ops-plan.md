# Event Operations Plan

This is the practical branch-by-branch plan for getting Ziyawa from "feature-rich" to "organizers can safely run real events here".

## Goal

Make every branch needed for a live event operationally trustworthy:

1. organizer can publish and manage an event
2. customers can buy tickets
3. organizer can book artists and services
4. event staff can operate the door
5. valid attendees can be checked in
6. money goes to the right party after the event
7. failures, disputes, and cancellations have a clear money outcome

## Locked Operating Rules

1. Event ticket refunds are admin-approved only.
2. Approved refunds go to user wallet, not directly back to card.
3. Organizer event cancellation must notify admin and generate customer refund work.
4. Admin can process refunds in bulk or manually.
5. Employee pay is on-platform, not off-platform.
6. Organizers fund employee payments, employees receive wallet credit minus platform fee, and employees withdraw through the wallet flow.
7. Attendees need a post-event incident reporting path tied to attended events.

## Branch Plan

### Branch A: Event Setup and Publishing

Success condition:

- organizer can create, edit, publish, and operate an event without needing database intervention

Checks:

1. Event create and edit forms save correctly.
2. Published event appears in discovery.
3. Manage page loads attendees and communications tools.
4. Completion action only works after event date or admin override.

### Branch B: Ticketing

Success condition:

- buyers can purchase valid tickets and receive usable codes

Checks:

1. Tier selection is correct.
2. Checkout math matches webhook math.
3. Ticket record creation matches paid quantity.
4. Buyer and assigned attendee comms are sent.
5. Tickets appear in dashboard.

### Branch C: Door and Event-Day Ops

Success condition:

- organizer or team can validate and check in attendees without confusion

Checks:

1. Manual ticket code validation works.
2. Camera scanning works on target devices.
3. Duplicate scans are blocked clearly.
4. Guest passes work.
5. Attendance totals update correctly.

### Branch D: Artist Booking

Success condition:

- organizer can request, negotiate, pay, and complete an artist booking end to end

Checks:

1. Public CTA routes into organizer gate.
2. Organizer gate enforces published upcoming event rule.
3. Booking request creates conversation and notification.
4. Artist response updates state correctly.
5. Counter-offer path works.
6. Payment moves transaction to held and booking to confirmed.
7. Dual completion releases funds after hold window.

### Branch E: Provider Booking

Success condition:

- organizer can book a service provider with the same reliability as artist flow

Checks:

1. Public CTA routes into crew gate.
2. Service request works.
3. Provider response is server-owned, not client-owned.
4. Payment and completion mirror artist lifecycle.
5. Dispute outcome is clear.

### Branch F: Staff and Employee Ops

Success condition:

- organizer can coordinate temporary event staff safely and actually pay them through Ziyawa

Checks:

1. Invites activate My Work access.
2. Shift logs are usable.
3. Organizer can create an employee payment that credits employee wallet.
4. Platform fee is deducted correctly.
5. Employee can see the earnings in wallet history or work history.
6. Employee withdrawal works after wallet credit.

### Branch G: Wallet, Payout, and Escrow

Success condition:

- payees understand what is held, what is available, and when payouts happen

Checks:

1. Deposit works.
2. Withdrawal works.
3. Failed withdrawal restores funds.
4. Event revenue releases after completed hold window.
5. Booking revenue releases after dual-complete hold window.

### Branch H: Refunds and Disputes

Success condition:

- every failed outcome has one and only one money rule

Checks:

1. Cancelled event triggers admin notification and refund work-item creation.
2. Duplicate payment outcome is explicit and implemented.
3. Booking dispute refund path is explicit and implemented.
4. Approved refunds credit wallet and never bypass admin approval.
5. Public policy matches code.

### Branch I: Post-Event Attendee Safety and Incident Reporting

Success condition:

- attendees can report what went wrong after an event they actually attended

Checks:

1. Attended-event surfaces expose a report action.
2. Event context is prefilled in the report flow.
3. Admin receives an event-linked report with correct type and reason.
4. The report branch connects cleanly to dispute, safety, and support operations where needed.

## Recommended Rollout Order

1. Fix refunds policy and implementation mismatch.
2. Fix provider booking parity.
3. Build employee payments as true on-platform wallet credits.
4. Run internal event simulation.
5. Run pilot event with trusted organizer.
6. Open broader organizer onboarding only after pilot passes.
