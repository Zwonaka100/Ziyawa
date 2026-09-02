/**
 * Everything an admin is agreeing to when they complete an event.
 *
 * Completing an event releases the organiser's held funds. Until now the only
 * thing shown before that was `window.confirm('Mark this event as completed?')`
 * — no amounts, no costs, no indication of whether the money is even there.
 *
 * Money units, because they differ by table and mixing them is silent:
 *   cents  transactions.amount / net_amount / platform_fee / gateway_fee_cents
 *   rands  profiles.held_balance, payout_requests.amount
 */

import { createAdminServiceClient } from '@/lib/admin-auth'
import { fetchPaystackBalanceRands } from '@/lib/admin/payouts'
import { PLATFORM_FEES } from '@/lib/constants'

const CENTS = 100

/** Transfers cost this much including VAT, and Ziyawa absorbs it. */
export const TRANSFER_COST_RANDS =
  (PLATFORM_FEES.paystack.transferFeeCents * (1 + PLATFORM_FEES.paystack.vatPercent / 100)) / CENTS

export interface CompletionBreakdown {
  eventId: string
  eventTitle: string
  eventDate: string
  organiserName: string | null
  organiserId: string | null
  organiserVerified: boolean

  ticketsSold: number
  grossTakenRands: number
  bookingFeesRands: number
  paystackFeesRands: number
  ziyawaNetRands: number
  organiserEarnsRands: number

  /** What this organiser currently holds, and what completion would release. */
  organiserHeldRands: number
  releasesRands: number

  /** Whether the released amount would clear the payout floor. */
  minimumPayoutRands: number
  meetsPayoutFloor: boolean
  expectedTransferCostRands: number

  paystackBalanceRands: number | null
  /** Balance minus what this release would owe. Negative means short. */
  balanceAfterReleaseRands: number | null

  alreadyCompleted: boolean
}

export async function loadCompletionBreakdown(
  eventId: string
): Promise<CompletionBreakdown | null> {
  const db = createAdminServiceClient()

  const { data: event } = await db
    .from('events')
    .select('id, title, event_date, organizer_id, completed_at')
    .eq('id', eventId)
    .maybeSingle()

  if (!event) return null

  // Only money that actually moved. An abandoned checkout never took a cent, so
  // including it would overstate what this event earned.
  const [{ data: txns }, { data: organiser }, paystackBalanceRands] = await Promise.all([
    db
      .from('transactions')
      .select('amount, platform_fee, net_amount, gateway_fee_cents, state')
      .eq('event_id', eventId)
      .eq('type', 'ticket_purchase')
      .not('state', 'in', '(initiated,failed)'),
    event.organizer_id
      ? db
          .from('profiles')
          .select('id, full_name, held_balance, is_verified')
          .eq('id', event.organizer_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    fetchPaystackBalanceRands(),
  ])

  const rows = txns || []
  const sum = (key: 'amount' | 'platform_fee' | 'net_amount' | 'gateway_fee_cents') =>
    rows.reduce((total, row) => total + Number(row[key] || 0), 0) / CENTS

  const grossTakenRands = sum('amount')
  const bookingFeesRands = sum('platform_fee')
  const paystackFeesRands = sum('gateway_fee_cents')
  const organiserEarnsRands = sum('net_amount')

  const organiserHeldRands = Number(organiser?.held_balance || 0)
  // Completion releases what is held against this event, which is what the
  // buyers' net amounts added up to.
  const releasesRands = Math.min(organiserHeldRands, organiserEarnsRands) || organiserEarnsRands

  const minimumPayoutRands = PLATFORM_FEES.wallet.minimumWithdrawal / CENTS

  return {
    eventId: event.id,
    eventTitle: event.title,
    eventDate: event.event_date,
    organiserName: organiser?.full_name ?? null,
    organiserId: organiser?.id ?? null,
    organiserVerified: Boolean(organiser?.is_verified),

    ticketsSold: rows.length,
    grossTakenRands,
    bookingFeesRands,
    paystackFeesRands,
    ziyawaNetRands: bookingFeesRands - paystackFeesRands,
    organiserEarnsRands,

    organiserHeldRands,
    releasesRands,

    minimumPayoutRands,
    meetsPayoutFloor: releasesRands >= minimumPayoutRands,
    expectedTransferCostRands: TRANSFER_COST_RANDS,

    paystackBalanceRands,
    balanceAfterReleaseRands:
      paystackBalanceRands === null ? null : paystackBalanceRands - releasesRands,

    alreadyCompleted: Boolean(event.completed_at),
  }
}
