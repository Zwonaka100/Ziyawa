/**
 * Everything an admin needs to decide whether to pay an organiser — and the
 * reasons they might not.
 *
 * Approving a payout is the one irreversible action in the product: money
 * leaves and does not come back. Until now the admin event page showed the
 * description, the tags and the category, and nothing about money at all, so
 * the decision was made on faith.
 *
 * The settlement window is a review period, not a waiting room. An admin who
 * has read this can pay within minutes of completion; the 48 hours only exists
 * for events nobody looks at.
 *
 * Money units, because they differ by table:
 *   CENTS  transactions.amount / net_amount / platform_fee / gateway_fee_cents
 *   RANDS  profiles.*_balance, payout_requests.amount, tickets.price_paid
 */

import { createAdminServiceClient } from '@/lib/admin-auth'
import { fetchPaystackBalanceRands } from '@/lib/admin/payouts'
import { PLATFORM_FEES } from '@/lib/constants'

const CENTS = 100

/** Transfers cost this much including VAT, and Ziyawa absorbs it. */
export const TRANSFER_COST_RANDS =
  (PLATFORM_FEES.paystack.transferFeeCents * (1 + PLATFORM_FEES.paystack.vatPercent / 100)) / CENTS

export type FlagLevel = 'blocker' | 'warning' | 'note'

export interface PayoutFlag {
  level: FlagLevel
  title: string
  detail: string
}

export interface TicketSaleRow {
  reference: string
  buyerName: string
  buyerEmail: string
  state: string
  paidRands: number
  paystackFeeRands: number
  ziyawaFeeRands: number
  organiserRands: number
  purchasedAt: string
}

export interface EventPayoutReview {
  eventId: string
  eventTitle: string
  eventDate: string
  eventState: string
  completedAt: string | null
  completedByAdmin: boolean
  payoutHoldUntil: string | null
  holdElapsed: boolean

  organiser: {
    id: string
    name: string
    email: string
    phone: string | null
    isVerified: boolean
    verifiedAt: string | null
    legalName: string | null
    bankName: string | null
    accountLast4: string | null
    accountHolder: string | null
    hasRecipient: boolean
    recipientError: string | null
    /** Payouts this organiser has already been paid, ever. */
    completedPayouts: number
  }

  sales: TicketSaleRow[]
  totals: {
    ticketsSold: number
    grossRands: number
    paystackFeesRands: number
    ziyawaFeesRands: number
    ziyawaNetRands: number
    organiserRands: number
  }

  balances: {
    heldRands: number
    payableRands: number
    pendingPayoutRands: number
    /** What approving would send. */
    payoutNowRands: number
    transferCostRands: number
    paystackBalanceRands: number | null
    balanceAfterRands: number | null
  }

  activity: {
    ticketsIssued: number
    checkedIn: number
    reviewCount: number
    averageRating: number | null
    openReports: number
    openRefunds: number
    disputedBookings: number
  }

  flags: PayoutFlag[]
  /** True when nothing blocks it. Warnings do not block. */
  canPayOut: boolean
  /** An existing queued payout, if the nightly job already made one. */
  existingPayoutRequestId: string | null
  /**
   * A payout already sent or in flight for this organiser. Approving again
   * would be a second transfer and a second fee, so the button turns off.
   */
  payoutInFlight: { id: string; status: string; amountRands: number } | null
  alreadyPaid: { id: string; amountRands: number; completedAt: string | null } | null
}

export async function loadEventPayoutReview(eventId: string): Promise<EventPayoutReview | null> {
  const db = createAdminServiceClient()

  const { data: event } = await db
    .from('events')
    .select('id, title, event_date, state, organizer_id, completed_at, admin_completed_at, payout_hold_until, created_at')
    .eq('id', eventId)
    .maybeSingle()

  if (!event) return null

  const organiserId = event.organizer_id as string

  const [
    { data: txns },
    { data: profile },
    { data: account },
    { data: tickets },
    { data: reviews },
    { data: reports },
    { data: refunds },
    { data: artistDisputes },
    { data: crewDisputes },
    { data: paidBefore },
    { data: openRequest },
    paystackBalanceRands,
  ] = await Promise.all([
    // Only money that moved. An abandoned checkout never took a cent.
    db
      .from('transactions')
      .select('reference, state, amount, platform_fee, net_amount, gateway_fee_cents, created_at, payer:profiles!transactions_payer_id_fkey(full_name, email)')
      .eq('event_id', eventId)
      .eq('type', 'ticket_purchase')
      .not('state', 'in', '(initiated,failed)')
      .order('created_at', { ascending: false }),
    db
      .from('profiles')
      .select('id, full_name, email, phone, is_verified, verified_at, held_balance, wallet_balance, pending_payout_balance')
      .eq('id', organiserId)
      .maybeSingle(),
    db
      .from('payout_accounts')
      .select('bank_name, account_number, account_holder, legal_name, paystack_recipient_code, recipient_error, created_at')
      .eq('profile_id', organiserId)
      .maybeSingle(),
    // `tickets` records attendance as is_used/used_at — there is no
    // checked_in_at column. Selecting one PostgREST rejects means the whole
    // query returns null and the page quietly reports zero tickets.
    db.from('tickets').select('id, is_used, used_at').eq('event_id', eventId),
    db.from('reviews').select('rating').eq('event_id', eventId),
    db.from('reports').select('id').eq('reported_id', eventId).eq('status', 'pending'),
    db.from('refund_work_items').select('id').eq('event_id', eventId).in('status', ['new', 'under_review']),
    db.from('bookings').select('id').eq('event_id', eventId).eq('state', 'disputed'),
    db.from('provider_bookings').select('id').eq('event_id', eventId).eq('state', 'disputed'),
    db.from('payout_requests').select('id').eq('user_id', organiserId).eq('status', 'completed'),
    db
      .from('payout_requests')
      .select('id, status, amount, completed_at')
      .eq('user_id', organiserId)
      .in('status', ['pending', 'approved', 'processing', 'completed'])
      .order('requested_at', { ascending: false })
      .limit(5),
    fetchPaystackBalanceRands(),
  ])

  const rows = (txns || []) as unknown as {
    reference: string
    state: string
    amount: number
    platform_fee: number
    net_amount: number
    gateway_fee_cents: number | null
    created_at: string
    payer: { full_name: string | null; email: string } | null
  }[]

  const sales: TicketSaleRow[] = rows.map((row) => ({
    reference: row.reference,
    buyerName: row.payer?.full_name || row.payer?.email || 'Unknown buyer',
    buyerEmail: row.payer?.email || '',
    state: row.state,
    paidRands: Number(row.amount || 0) / CENTS,
    paystackFeeRands: Number(row.gateway_fee_cents || 0) / CENTS,
    ziyawaFeeRands: Number(row.platform_fee || 0) / CENTS,
    organiserRands: Number(row.net_amount || 0) / CENTS,
    purchasedAt: row.created_at,
  }))

  const sum = (pick: (r: TicketSaleRow) => number) => sales.reduce((total, r) => total + pick(r), 0)
  const grossRands = sum((r) => r.paidRands)
  const paystackFeesRands = sum((r) => r.paystackFeeRands)
  const ziyawaFeesRands = sum((r) => r.ziyawaFeeRands)
  const organiserRands = sum((r) => r.organiserRands)

  const heldRands = Number(profile?.held_balance || 0)
  const payableRands = Number(profile?.wallet_balance || 0)
  const pendingPayoutRands = Number(profile?.pending_payout_balance || 0)

  // Approving pays whatever this event still owes, capped at what the organiser
  // actually holds — a balance can have moved since the sale.
  const stillHeldOnThisEvent = sales
    .filter((s) => s.state === 'held')
    .reduce((total, s) => total + s.organiserRands, 0)
  const payoutNowRands = Math.min(
    Math.max(stillHeldOnThisEvent + payableRands, 0),
    heldRands + payableRands
  )

  const ticketsIssued = (tickets || []).length
  const checkedIn = (tickets || []).filter((t) => t.is_used).length
  const ratings = (reviews || []).map((r) => Number(r.rating)).filter((n) => Number.isFinite(n))
  const openReports = (reports || []).length
  const openRefunds = (refunds || []).length
  const disputedBookings = (artistDisputes || []).length + (crewDisputes || []).length
  const hasRecipient = Boolean(account?.paystack_recipient_code)

  const recentRequests = (openRequest || []) as unknown as {
    id: string; status: string; amount: number; completed_at: string | null
  }[]
  const inFlight = recentRequests.find((r) => ['approved', 'processing'].includes(r.status)) || null
  const pendingRequest = recentRequests.find((r) => r.status === 'pending') || null
  const paid = recentRequests.find((r) => r.status === 'completed') || null

  const holdUntil = event.payout_hold_until ? new Date(event.payout_hold_until as string) : null
  const holdElapsed = holdUntil ? holdUntil.getTime() <= Date.now() : true

  const balanceAfterRands =
    paystackBalanceRands === null ? null : paystackBalanceRands - payoutNowRands - TRANSFER_COST_RANDS

  // ── Flags ────────────────────────────────────────────────────────────────
  const flags: PayoutFlag[] = []

  if (event.state !== 'completed') {
    flags.push({ level: 'blocker', title: 'Event is not completed', detail: `It is ${event.state}. Only a completed event can be paid out.` })
  }
  if (!profile?.is_verified) {
    flags.push({ level: 'blocker', title: 'Organiser is not verified', detail: 'We only send money to a verified account. Approve their verification first.' })
  }
  if (!hasRecipient) {
    flags.push({
      level: 'blocker',
      title: 'No Paystack recipient on file',
      detail: account?.recipient_error
        ? `Creating it failed: ${account.recipient_error}`
        : 'Their bank details have not been registered with Paystack. Re-run verification approval.',
    })
  }
  if (disputedBookings > 0) {
    flags.push({ level: 'blocker', title: `${disputedBookings} disputed booking${disputedBookings === 1 ? '' : 's'} on this event`, detail: 'Settle the dispute before releasing ticket revenue — some of this money may be owed elsewhere.' })
  }
  if (inFlight) {
    flags.push({
      level: 'blocker',
      title: 'A payout is already on its way',
      detail: `R${Number(inFlight.amount).toFixed(2)} is ${inFlight.status}. Approving again would send a second transfer and pay a second fee. Wait for this one to land.`,
    })
  }
  if (payoutNowRands <= 0) {
    flags.push({ level: 'blocker', title: 'Nothing to pay out', detail: 'This event has no held or payable funds against it.' })
  }
  if (paystackBalanceRands !== null && balanceAfterRands !== null && balanceAfterRands < 0) {
    flags.push({ level: 'blocker', title: 'Paystack balance will not cover this', detail: `Balance is R${paystackBalanceRands.toFixed(2)}; this payout needs R${(payoutNowRands + TRANSFER_COST_RANDS).toFixed(2)} including the transfer fee.` })
  }

  if (openRefunds > 0) {
    flags.push({ level: 'warning', title: `${openRefunds} refund request${openRefunds === 1 ? '' : 's'} still open`, detail: 'Paying out now means any refund comes from Ziyawa rather than from this balance.' })
  }
  if (openReports > 0) {
    flags.push({ level: 'warning', title: `${openReports} unresolved report${openReports === 1 ? '' : 's'} about this event`, detail: 'Someone complained and it has not been reviewed. Read it before sending money.' })
  }
  if (ticketsIssued > 0 && checkedIn === 0) {
    flags.push({ level: 'warning', title: 'No attendee was ever checked in', detail: `${ticketsIssued} ticket${ticketsIssued === 1 ? '' : 's'} sold and none scanned at the door. Normal if they did not use check-in, worth a look if the event may not have happened.` })
  }
  if (account && !hasRecipientNameMatch(account.account_holder, account.legal_name)) {
    flags.push({ level: 'warning', title: 'Bank account name differs from the verified name', detail: `Account holder "${account.account_holder}" against verified "${account.legal_name}". Often just an abbreviation, but confirm it is the same person.` })
  }
  if (account?.created_at && event.completed_at && new Date(account.created_at) > new Date(event.completed_at as string)) {
    flags.push({ level: 'warning', title: 'Bank details were added after the event completed', detail: 'Not unusual for a first payout, but worth noticing if it is a change.' })
  }
  if (event.admin_completed_at) {
    flags.push({ level: 'warning', title: 'An admin completed this, not the organiser', detail: 'The organiser has not personally confirmed the event went ahead.' })
  }

  // The window never sends money on its own. When it closes, the funds are
  // released and queued — an admin still approves every transfer. Saying it
  // "releases automatically" reads as though payment happens without anyone.
  if (holdUntil) {
    const when = holdUntil.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })
    flags.push(
      holdElapsed
        ? {
            level: 'note',
            title: 'Review window closed',
            detail: `The window closed on ${when}. Nothing has been paid — approving is still up to you, but there is no reason left to wait.`,
          }
        : {
            level: 'note',
            title: 'Still inside the review window',
            detail: `It closes on ${when}, when this queues for your approval. No money moves on its own either way — approving now is perfectly normal, the window is for review, not a required wait.`,
          }
    )
  }
  if ((paidBefore || []).length === 0) {
    flags.push({ level: 'note', title: "This is the organiser's first payout", detail: 'Nothing has ever been sent to this bank account before.' })
  }
  if (ratings.length > 0) {
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length
    if (avg < 3) {
      flags.push({ level: 'warning', title: `Attendees rated this ${avg.toFixed(1)} out of 5`, detail: `${ratings.length} review${ratings.length === 1 ? '' : 's'}. A poor score can precede refund requests.` })
    }
  }

  return {
    eventId: event.id as string,
    eventTitle: event.title as string,
    eventDate: event.event_date as string,
    eventState: event.state as string,
    completedAt: (event.completed_at as string) || null,
    completedByAdmin: Boolean(event.admin_completed_at),
    payoutHoldUntil: (event.payout_hold_until as string) || null,
    holdElapsed,

    organiser: {
      id: organiserId,
      name: profile?.full_name || profile?.email || 'Unknown',
      email: profile?.email || '',
      phone: profile?.phone || null,
      isVerified: Boolean(profile?.is_verified),
      verifiedAt: profile?.verified_at || null,
      legalName: account?.legal_name || null,
      bankName: account?.bank_name || null,
      accountLast4: account?.account_number ? String(account.account_number).slice(-4) : null,
      accountHolder: account?.account_holder || null,
      hasRecipient,
      recipientError: account?.recipient_error || null,
      completedPayouts: (paidBefore || []).length,
    },

    sales,
    totals: {
      ticketsSold: sales.length,
      grossRands,
      paystackFeesRands,
      ziyawaFeesRands,
      ziyawaNetRands: ziyawaFeesRands - paystackFeesRands,
      organiserRands,
    },

    balances: {
      heldRands,
      payableRands,
      pendingPayoutRands,
      payoutNowRands,
      transferCostRands: TRANSFER_COST_RANDS,
      paystackBalanceRands,
      balanceAfterRands,
    },

    activity: {
      ticketsIssued,
      checkedIn,
      reviewCount: ratings.length,
      averageRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
      openReports,
      openRefunds,
      disputedBookings,
    },

    flags,
    canPayOut: !flags.some((f) => f.level === 'blocker'),
    existingPayoutRequestId: pendingRequest?.id ?? null,
    payoutInFlight: inFlight
      ? { id: inFlight.id, status: inFlight.status, amountRands: Number(inFlight.amount) }
      : null,
    alreadyPaid: paid
      ? { id: paid.id, amountRands: Number(paid.amount), completedAt: paid.completed_at }
      : null,
  }
}

/**
 * "M.Madiya" against "Mbalentle Madiya" is the same person; "J.Smith" against
 * "Mbalentle Madiya" is not. Compares surnames and initials rather than
 * demanding an exact match, which would flag almost every real account.
 */
function hasRecipientNameMatch(accountHolder?: string | null, legalName?: string | null): boolean {
  if (!accountHolder || !legalName) return true
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean)
  const a = norm(accountHolder)
  const b = norm(legalName)
  if (!a.length || !b.length) return true
  const surnameA = a[a.length - 1]
  const surnameB = b[b.length - 1]
  return surnameA === surnameB
}
