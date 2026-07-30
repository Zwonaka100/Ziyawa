# Benchmark Recommendations Before Coding

This document gives pre-code recommendations for Ziyawa, benchmarked against patterns commonly used by mature ticketing platforms (such as Quicket/Computicket-style operations).

It is written to support explicit approval before implementation.

## Benchmark Framing

This is a product-operations benchmark, not a vendor feature-copy exercise.

It compares three things per branch:

1. Current Ziyawa position.
2. Recommended operating model.
3. Mature-platform pattern to emulate.

## Locked Rules (Already Approved)

1. Refunds are never automatic.
2. Refunds require admin or super-admin approval.
3. Approved refunds credit user wallet, not direct card reversal.
4. Canceled events must trigger admin notification and refund work queue.
5. Admin can process refunds in bulk or manually.
6. Employee payment is on-platform to employee wallets, with platform fees.
7. Employees withdraw via wallet flow and withdrawal fees apply.
8. Attendees need post-event incident reporting tied to attended events.

## Recommendations By Question Area

### 1) Tickets (purchase integrity, issuance, customer trust)

Current Ziyawa:

- Purchase init and webhook flows are present.
- Ticket issuance and dashboard visibility exist.
- Full event-lifecycle regression coverage is limited.

Recommendation:

1. Introduce immutable ticket lifecycle states: `initiated`, `paid`, `issued`, `checked_in`, `refunded`, `voided`.
2. Enforce idempotent webhook finalization with strict duplicate handling.
3. Add ticket ledger events for every state transition (who, when, why).
4. Add organizer-facing incident flags: duplicate payment, late webhook, over-issue attempt.

Quicket/Computicket-style pattern:

- Single source-of-truth ticket state machine with reconciliation-first operations.
- Explicit separation between payment success and ticket issuance completion.

Approval criteria:

1. One payment reference can only produce one final issued ticket set.
2. Replayed webhook events cannot duplicate tickets.
3. Admin can audit full ticket timeline without database forensics.

### 2) Wallets (money custody, clarity, reconciliation)

Current Ziyawa:

- Wallet and withdrawal rails exist.
- Escrow buckets exist (`available`, `held`, `pending payout`).
- Reconciliation and exception handling still need stronger controls.

Recommendation:

1. Add a double-entry wallet ledger table (debit/credit pairs per transaction group).
2. Require reason codes for all wallet mutations (sale, release, refund, withdrawal fee, platform fee, adjustment).
3. Add daily reconciliation job comparing internal ledger vs gateway transfer outcomes.
4. Add exception dashboard with statuses: `open`, `investigating`, `resolved`, `write_off`.

Quicket/Computicket-style pattern:

- Finance-first ledgering with operational exception queues.
- Money movements are auditable events, not just balance snapshots.

Approval criteria:

1. Every wallet balance can be re-derived from ledger entries.
2. Any failed payout auto-creates an exception case.
3. Finance can close daily reconciliation with a signed variance report.

### 3) QR Codes and Check-In (door reliability, anti-fraud)

Current Ziyawa:

- Validation and check-in endpoints exist.
- Organizer/team access checks exist.
- Real event-day load and network-failure drills are limited.

Recommendation:

1. Keep tokenized QR payload (no raw predictable IDs alone).
2. Add scan result taxonomy: `valid`, `already_checked_in`, `wrong_event`, `expired`, `voided`, `refunded`.
3. Add offline-safe fallback protocol (manual code entry and queued sync behavior).
4. Add device-level scan audit with operator ID and timestamp.

Quicket/Computicket-style pattern:

- Fast deterministic door response with clear reject reasons.
- Anti-duplicate controls and auditable staff actions.

Approval criteria:

1. Duplicate scans always return deterministic rejection reason.
2. Staff can continue with manual fallback when camera or network fails.
3. Door audit can identify who checked in each attendee.

### 4) Day-Of Operations (runbook, escalation, failover)

Current Ziyawa:

- Core event management exists.
- Formal command-center runbook and escalation matrix not yet complete.

Recommendation:

1. Introduce event-day runbook phases: `T-24h`, `T-4h`, `Doors Open`, `Peak`, `Close`, `Post+2h`.
2. Define incident severity levels (`P1` to `P4`) with response SLAs.
3. Assign event ops roles: organizer lead, door lead, finance monitor, support escalation owner.
4. Add incident templates for scanner outage, payout delay, webhook lag, oversell risk.

Quicket/Computicket-style pattern:

- Operational command model with predefined playbooks.
- Known failure modes mapped to immediate response actions.

Approval criteria:

1. Each pilot event has a named on-call chain.
2. Every critical incident has a first-response script.
3. Post-event review logs decisions and unresolved actions.

### 5) Bookings (artists and crew/services parity)

Current Ziyawa:

- Artist flow is stronger and more server-owned.
- Crew/provider flow still has parity gaps.

Recommendation:

1. Unify artist and provider booking state machines.
2. Move provider accept/decline/counter logic to server-owned endpoints.
3. Standardize booking events: request, response, counter, accepted, funded, completed, disputed, refunded.
4. Enforce published-upcoming event precondition across both flows.

Quicket/Computicket-style pattern:

- Platform-owned lifecycle transitions, not client-owned updates.
- Consistent rules across parallel booking product lines.

Approval criteria:

1. Artist and provider branches share the same reliability guarantees.
2. Client cannot directly mutate sensitive booking status.
3. Notifications and audit entries fire on every transition.

### 6) Employee Payments (event staff payroll on platform)

Current Ziyawa:

- Staff planning exists.
- True money movement into employee wallets is not yet complete.

Recommendation:

1. Add explicit payroll transaction object tied to event and shift evidence.
2. Require organizer funding confirmation before payroll release.
3. Credit employee wallets minus platform fee with transparent line items.
4. Add employee earnings statement and withdrawal history linking.

Quicket/Computicket-style pattern:

- Workforce payouts treated as controlled disbursement flows.
- Clear fee visibility and payout traceability for worker trust.

Approval criteria:

1. Organizer can fund payroll and see per-worker settlement status.
2. Employee sees gross, fee, and net wallet credit.
3. Finance can reconcile payroll disbursements against wallet ledger.

### 7) Refunds (policy, approvals, execution)

Current Ziyawa:

- You now have a locked policy.
- Code and public wording still need full alignment to that policy.

Recommendation:

1. Introduce refund work-item queue with statuses: `new`, `under_review`, `approved`, `rejected`, `executed`, `failed`.
2. Require admin decision metadata (reason code, approver, timestamp).
3. Execute refunds as wallet credits only.
4. Add event-cancel bulk refund generator with per-user traceability.

Quicket/Computicket-style pattern:

- Centralized refund operations with audit-heavy approvals.
- Bulk and manual modes for operational flexibility.

Approval criteria:

1. No refund executes without explicit admin approval.
2. Canceled event creates complete customer refund queue automatically.
3. Refund timeline is visible to support/admin for dispute handling.

### 8) Weaknesses and Loopholes (fraud, abuse, governance)

Current Ziyawa:

- Core controls exist in parts.
- Cross-branch governance and anomaly detection can be stronger.

Recommendation:

1. Add abuse controls:
   - velocity limits on purchase attempts and payout attempts
   - risk flags for unusual patterns (multi-account, repeated failed withdrawals)
2. Add organizer trust tiers (new, verified, high-trust) affecting limits.
3. Add maker-checker controls for sensitive admin actions (approver cannot be requester for high-value adjustments).
4. Add immutable audit stream for money and ticket state changes.

Quicket/Computicket-style pattern:

- Layered control framework: prevention, detection, response.
- Higher-risk operations require stronger approvals and richer logs.

Approval criteria:

1. High-risk actions have dual control where required.
2. Fraud indicators are visible in one admin risk surface.
3. Incident outcomes can be traced end-to-end.

## Cross-Platform Recommended Targets (First Implementation Wave)

1. Refund queue and admin wallet-credit execution.
2. Provider booking server-owned response parity.
3. Employee payroll wallet-credit flow.
4. Finance ledger and reconciliation baseline.
5. Event-day runbook and incident matrix.

## Suggested Phase Plan (After Your Approval)

Phase 1: Money correctness

1. Refund workflow and policy alignment.
2. Wallet ledger reason codes and reconciliation baseline.

Phase 2: Booking parity

1. Provider server endpoints and state machine parity.
2. Notifications and audit parity.

Phase 3: Workforce payouts

1. Employee payroll transaction model.
2. Wallet credit and worker visibility.

Phase 4: Event-day trust

1. QR and check-in hardening drills.
2. Runbook, escalation, and incident templates.

## Approval Checklist

Approve each box to start step-by-step coding:

- [ ] Tickets recommendation approved.
- [ ] Wallet recommendation approved.
- [ ] QR and check-in recommendation approved.
- [ ] Day-of operations recommendation approved.
- [ ] Bookings parity recommendation approved.
- [ ] Employee payments recommendation approved.
- [ ] Refund recommendation approved.
- [ ] Weakness/loophole control recommendation approved.
- [ ] Phase order approved.

When approved, implementation can start in strict sequence with validation after every box.
