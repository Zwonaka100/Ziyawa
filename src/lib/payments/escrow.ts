import { createClient } from '@supabase/supabase-js'
import { createNotification } from '@/lib/notifications'
import { recordBalanceLedgerEntries, type BalanceLedgerContext } from '@/lib/payments/balance-ledger'
import { logOpsEvent } from '@/lib/monitoring'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DEFAULT_EVENT_HOLD_HOURS = Number(process.env.PAYOUT_HOLD_HOURS || '48')
const DEFAULT_BOOKING_HOLD_HOURS = Number(process.env.BOOKING_PAYOUT_HOLD_HOURS || '24')
const MANUAL_REVIEW_THRESHOLD_RANDS = Number(process.env.MANUAL_REVIEW_THRESHOLD_RANDS || '5000')

interface HeldTransaction {
  id: string
  reference: string
  type: string
  state: string
  amount: number
  net_amount: number
  payer_id: string
  recipient_id: string | null
  recipient_type: string | null
  event_id: string | null
  booking_id: string | null
  provider_booking_id: string | null
  created_at: string
  held_at: string | null
}

interface EventReleaseCandidate {
  id: string
  title: string
  state: string
  event_date: string
  completed_at: string | null
  cancelled_at?: string | null
  organizer_completed_at?: string | null
  admin_completed_at?: string | null
  payout_hold_until?: string | null
}

interface BookingReleaseCandidate {
  id: string
  state: string
  completed_at: string | null
  organizer_completed_at?: string | null
  artist_completed_at?: string | null
  provider_completed_at?: string | null
  payout_hold_until?: string | null
}

export interface ReleaseResult {
  checked: number
  released: number
  skipped: number
  failures: Array<{ reference: string; reason: string }>
  /** Ticket revenue held back because the event still owes artists or crew. */
  blockedByObligations: Array<{ reference: string; eventTitle: string; reasons: string[] }>
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

// Intl's en-ZA currency format drops trailing cents, so R90.00 came out as
// "R 90,00" in messages about someone's money. formatMoneyExact is the shared
// helper that does not.
import { formatMoneyExact } from '@/lib/helpers'

export function calculateHoldUntil(baseDate: string | null | undefined, holdHours: number): string {
  const base = baseDate ? new Date(baseDate) : new Date()
  return new Date(base.getTime() + holdHours * 60 * 60 * 1000).toISOString()
}

/**
 * Queue a payout for money that has just become available, for an admin to
 * approve. Money never leaves on its own: this only creates the request.
 *
 * Skips anyone without a usable payout destination (unverified, or no Paystack
 * recipient) rather than queueing something that could never be paid.
 *
 * That skip used to be invisible. The claim that such users "surface in the
 * admin panel as blocked" was not true: the blocked list is built from
 * payout_accounts rows, and an unverified organiser has no payout_accounts row
 * to be listed by. They appeared nowhere at all. The outcome is returned now so
 * callers can record it, and the admin dashboard reads the balances directly.
 *
 * Idempotent by design: one pending request per person at a time, so the
 * nightly release sweep cannot pile up duplicates for the same balance.
 *
 * Never throws — a queueing failure must not roll back a completed release, or
 * money would stay stuck in `held` with no way forward.
 */
export type EnqueueOutcome =
  | 'queued'
  | 'already_queued'
  | 'no_balance'
  | 'not_verified'
  | 'no_payout_account'
  | 'error'

export async function enqueuePayoutRequest(profileId: string): Promise<EnqueueOutcome> {
  try {
    const { data: existing } = await supabaseAdmin
      .from('payout_requests')
      .select('id')
      .eq('user_id', profileId)
      .in('status', ['pending', 'approved', 'processing'])
      .limit(1)
      .maybeSingle()

    if (existing?.id) return 'already_queued'

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, is_verified, wallet_balance')
      .eq('id', profileId)
      .single()

    const availableRands = Number(profile?.wallet_balance || 0)

    if (availableRands <= 0) return 'no_balance'

    // Every one of these used to be a bare `return`. Money simply stopped, with
    // no row, no log and nothing anywhere to say why — so an organiser waiting
    // to be paid and an admin looking for something to approve both saw an
    // empty screen and no explanation. The reason is returned now, and callers
    // record it.
    if (!profile?.is_verified) {
      console.warn('Payout not queued: recipient is not verified', { profileId, availableRands })
      return 'not_verified'
    }

    const { data: payoutAccount } = await supabaseAdmin
      .from('payout_accounts')
      .select('bank_name, account_number, account_holder, paystack_recipient_code')
      .eq('profile_id', profileId)
      .maybeSingle()

    if (!payoutAccount?.paystack_recipient_code) {
      console.warn('Payout not queued: no Paystack recipient on file', { profileId, availableRands })
      return 'no_payout_account'
    }

    // There is deliberately no minimum here. A transfer costs Ziyawa about
    // R3.45 either way, and a floor meant an organiser whose first event earned
    // less than it could never be paid at all — their money would sit until
    // they happened to sell more. Every completed event gets paid.
    const { error } = await supabaseAdmin.from('payout_requests').insert({
      user_id: profileId,
      amount: availableRands,
      bank_name: payoutAccount.bank_name,
      account_number: payoutAccount.account_number,
      account_holder: payoutAccount.account_holder,
      status: 'pending',
    })

    if (error) {
      console.error('Failed to queue payout request:', error)
      return 'error'
    }

    return 'queued'
  } catch (error) {
    console.error('Failed to queue payout request:', error)
    return 'error'
  }
}

export async function adjustProfileBalanceBuckets(
  userId: string,
  deltas: {
    walletDelta?: number
    heldDelta?: number
    pendingPayoutDelta?: number
  },
  context?: BalanceLedgerContext
) {
  const walletDelta = deltas.walletDelta || 0
  const heldDelta = deltas.heldDelta || 0
  const pendingPayoutDelta = deltas.pendingPayoutDelta || 0

  const primaryProfileQuery = await supabaseAdmin
    .from('profiles')
    .select('id, wallet_balance, held_balance, pending_payout_balance')
    .eq('id', userId)
    .single()

  if (primaryProfileQuery.error) {
    const fallbackProfileQuery = await supabaseAdmin
      .from('profiles')
      .select('id, wallet_balance')
      .eq('id', userId)
      .single()

    if (fallbackProfileQuery.error || !fallbackProfileQuery.data) {
      return { success: false, error: fallbackProfileQuery.error || primaryProfileQuery.error }
    }

    const fallbackUpdate = {
      wallet_balance: roundCurrency(Number(fallbackProfileQuery.data.wallet_balance || 0) + walletDelta),
    }

    const { error: fallbackUpdateError } = await supabaseAdmin
      .from('profiles')
      .update(fallbackUpdate)
      .eq('id', userId)

    if (!fallbackUpdateError && context && walletDelta !== 0) {
      await recordBalanceLedgerEntries([
        {
          userId,
          bucket: 'wallet',
          deltaAmount: walletDelta,
          balanceAfter: fallbackUpdate.wallet_balance,
          context,
        },
      ])
    }

    return { success: !fallbackUpdateError, degraded: true, error: fallbackUpdateError }
  }

  const profile = primaryProfileQuery.data
  const updatePayload = {
    wallet_balance: roundCurrency(Number(profile.wallet_balance || 0) + walletDelta),
    held_balance: roundCurrency(Math.max(0, Number(profile.held_balance || 0) + heldDelta)),
    pending_payout_balance: roundCurrency(Math.max(0, Number(profile.pending_payout_balance || 0) + pendingPayoutDelta)),
  }

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId)

  if (!updateError) {
    if (context) {
      const ledger = await recordBalanceLedgerEntries([
        {
          userId,
          bucket: 'wallet',
          deltaAmount: walletDelta,
          balanceAfter: updatePayload.wallet_balance,
          context,
        },
        {
          userId,
          bucket: 'held',
          deltaAmount: heldDelta,
          balanceAfter: updatePayload.held_balance,
          context,
        },
        {
          userId,
          bucket: 'pending_payout',
          deltaAmount: pendingPayoutDelta,
          balanceAfter: updatePayload.pending_payout_balance,
          context,
        },
      ])

      // The balance change stands either way — money must not roll back over a
      // failed log write. But this result used to be discarded entirely, and
      // because the ledger table had never actually been created, every balance
      // movement on the platform went unaudited while this function kept
      // reporting success. An unaudited money move has to be visible.
      if (!ledger.success) {
        logOpsEvent('balance-ledger', 'error', 'Balance moved but was not recorded in the audit ledger', {
          userId,
          reasonCode: context.reasonCode,
          walletDelta,
          heldDelta,
          pendingPayoutDelta,
          error: ledger.error,
        })
      }
    }

    return { success: true }
  }

  const fallbackUpdate = {
    wallet_balance: roundCurrency(Number(profile.wallet_balance || 0) + walletDelta),
  }

  const { error: secondUpdateError } = await supabaseAdmin
    .from('profiles')
    .update(fallbackUpdate)
    .eq('id', userId)

  if (!secondUpdateError && context && walletDelta !== 0) {
    await recordBalanceLedgerEntries([
      {
        userId,
        bucket: 'wallet',
        deltaAmount: walletDelta,
        balanceAfter: fallbackUpdate.wallet_balance,
        context,
      },
    ])
  }

  return { success: !secondUpdateError, degraded: true, error: secondUpdateError || updateError }
}

function needsManualReview(amountCents: number) {
  return amountCents / 100 >= MANUAL_REVIEW_THRESHOLD_RANDS
}

function canReleaseEventTransaction(
  event: EventReleaseCandidate,
  tx: HeldTransaction,
  bypassHold = false
) {
  if (event.state !== 'completed' || event.cancelled_at) return false
  if (!(event.organizer_completed_at || event.admin_completed_at || event.completed_at)) return false

  // The settlement window is a safety net for money nobody has looked at. An
  // admin who has opened the event, checked the organiser and decided to pay is
  // a better check than a timer, so they can release now rather than wait for
  // it. Only an authenticated admin route can pass bypassHold.
  if (!bypassHold) {
    const holdUntil = event.payout_hold_until || calculateHoldUntil(event.completed_at || event.event_date, DEFAULT_EVENT_HOLD_HOURS)
    if (new Date(holdUntil).getTime() > Date.now()) return false

    if (needsManualReview(tx.net_amount || tx.amount) && !event.admin_completed_at) {
      return false
    }
  }

  return true
}

/**
 * Ticket revenue is held only while a booking on that event is actively
 * disputed, since an admin has to settle where that money belongs first.
 *
 * It deliberately does NOT hold for `accepted`. Under the agreed model nothing
 * is paid at that point — a non-refundable booking fee falls due when both
 * parties agree, and the performance fee only after the performance — so there
 * is no debt yet for the revenue to cover. Holding there would also strand an
 * organizer's revenue behind a booking that never progresses, and with artist
 * and crew payouts deferred there is currently no reliable way to clear one.
 * That would recreate the stuck-money problem for organizers, which is the
 * opposite of the intent.
 *
 * `pending`, `confirmed`, `completed`, `declined` and `cancelled` never hold.
 *
 * Returns the blocking reasons rather than a boolean so the skip is explainable
 * — money not moving is exactly the thing that needs to be diagnosable.
 */
async function outstandingEventObligations(eventId: string): Promise<string[]> {
  const BLOCKING_STATES = ['disputed']

  const [artistBookings, crewBookings] = await Promise.all([
    supabaseAdmin.from('bookings').select('id, state').eq('event_id', eventId).in('state', BLOCKING_STATES),
    supabaseAdmin.from('provider_bookings').select('id, state').eq('event_id', eventId).in('state', BLOCKING_STATES),
  ])

  const reasons: string[] = []
  for (const booking of artistBookings.data || []) {
    reasons.push(`artist booking ${booking.id} is ${booking.state}`)
  }
  for (const booking of crewBookings.data || []) {
    reasons.push(`crew booking ${booking.id} is ${booking.state}`)
  }
  return reasons
}

function canReleaseBookingTransaction(booking: BookingReleaseCandidate, tx: HeldTransaction) {
  if (booking.state !== 'completed') return false

  const hasCounterpartyConfirmation = Boolean(
    booking.organizer_completed_at && (booking.artist_completed_at || booking.provider_completed_at)
  )

  if (!hasCounterpartyConfirmation && needsManualReview(tx.net_amount || tx.amount)) {
    return false
  }

  const holdUntil = booking.payout_hold_until || calculateHoldUntil(booking.completed_at, DEFAULT_BOOKING_HOLD_HOURS)
  if (new Date(holdUntil).getTime() > Date.now()) return false

  return Boolean(booking.completed_at)
}

async function releaseTransactionToWallet(
  transaction: HeldTransaction,
  title: string,
  message: string,
  link: string
) {
  if (!transaction.recipient_id) {
    throw new Error('Transaction recipient is missing')
  }

  const releaseAmountRands = roundCurrency(Number(transaction.net_amount || transaction.amount || 0) / 100)

  const balanceResult = await adjustProfileBalanceBuckets(transaction.recipient_id, {
    walletDelta: releaseAmountRands,
    heldDelta: -releaseAmountRands,
  })

  if (!balanceResult.success) {
    throw new Error('Could not update wallet buckets for release')
  }

  const { error: transactionError } = await supabaseAdmin
    .from('transactions')
    .update({
      state: 'released',
      released_at: new Date().toISOString(),
      failure_reason: null,
    })
    .eq('id', transaction.id)
    .eq('state', 'held')

  if (transactionError) {
    throw transactionError
  }

  // In-app only, deliberately.
  //
  // This used to email, once per released transaction, so an event with two
  // ticket sales sent two near-identical emails saying money was "available in
  // your wallet" — a thing that does not exist. The organiser's email timeline
  // is completion ("in review") then payout ("on its way"); release sits
  // between them and means nothing to them. It stays in the bell as a record.
  await createNotification({
    userId: transaction.recipient_id,
    type: 'payment_received',
    title,
    message,
    link,
    transactionId: transaction.id,
    sendEmail: false,
  })

  // Deliberately does NOT queue the payout here.
  //
  // This used to call enqueuePayoutRequest per transaction, and that queued
  // HALF an organiser's money. An event with two R90 sales released the first,
  // enqueued R90 against a wallet balance that was only R90 so far, then
  // released the second — at which point enqueue found the existing pending
  // request and returned 'already_queued'. The organiser was paid R90 of the
  // R180 they were owed, and the rest sat in their balance with a queued
  // request that would never grow. It reached a real payout before it was
  // caught.
  //
  // Queueing now happens once, after the whole sweep, in releaseEligibleHeldFunds.
  return releaseAmountRands
}

export async function releaseEligibleHeldFunds(options?: {
  transactionId?: string
  eventId?: string
  bookingId?: string
  providerBookingId?: string
  /**
   * Release without waiting out the settlement window. Admin-initiated only —
   * every caller that reaches this from a user request leaves it unset.
   */
  bypassHold?: boolean
}): Promise<ReleaseResult> {
  let query = supabaseAdmin
    .from('transactions')
    .select('id, reference, type, state, amount, net_amount, payer_id, recipient_id, recipient_type, event_id, booking_id, provider_booking_id, created_at, held_at')
    .eq('state', 'held')

  if (options?.transactionId) query = query.eq('id', options.transactionId)
  if (options?.eventId) query = query.eq('event_id', options.eventId)
  if (options?.bookingId) query = query.eq('booking_id', options.bookingId)
  if (options?.providerBookingId) query = query.eq('provider_booking_id', options.providerBookingId)

  const { data: transactions, error } = await query

  if (error) {
    return {
      checked: 0,
      released: 0,
      skipped: 0,
      failures: [{ reference: 'query', reason: error.message }],
      blockedByObligations: [],
    }
  }

  const result: ReleaseResult = {
    checked: transactions?.length || 0,
    released: 0,
    skipped: 0,
    failures: [],
    blockedByObligations: [],
  }

  // Everyone who had money released in this sweep. Queued once at the end, so
  // a recipient with several sales is queued for the full amount rather than
  // whatever had landed by the time the first one finished.
  const releasedTo = new Set<string>()

  for (const transaction of (transactions || []) as HeldTransaction[]) {
    try {
      if (transaction.type === 'ticket_purchase') {
        if (!transaction.event_id) {
          result.skipped += 1
          continue
        }

        const { data: event, error: eventError } = await supabaseAdmin
          .from('events')
          .select('id, title, state, event_date, completed_at, cancelled_at, organizer_completed_at, admin_completed_at, payout_hold_until')
          .eq('id', transaction.event_id)
          .single()

        if (eventError || !event) {
          result.failures.push({ reference: transaction.reference, reason: 'Event not found for held transaction' })
          continue
        }

        if (!canReleaseEventTransaction(event as EventReleaseCandidate, transaction, options?.bypassHold)) {
          result.skipped += 1
          continue
        }

        // Hold ticket revenue while this event still owes artists or crew.
        const obligations = await outstandingEventObligations(event.id)
        if (obligations.length > 0) {
          result.skipped += 1
          result.blockedByObligations.push({
            reference: transaction.reference,
            eventTitle: event.title,
            reasons: obligations,
          })
          continue
        }

        await releaseTransactionToWallet(
          transaction,
          'Your event earnings are ready',
          `${formatMoneyExact(Number(transaction.net_amount || 0) / 100)} from "${event.title}" has cleared review and is ready to be paid out to your bank.`,
          '/earnings'
        )

        result.released += 1
        if (transaction.recipient_id) releasedTo.add(transaction.recipient_id)
        continue
      }

      // All booking payment types: artist and vendor/crew
      const BOOKING_PAYMENT_TYPES = [
        'booking_payment',  // legacy type used by existing webhook
        'artist_booking',
        'vendor_service',
      ]
      if (BOOKING_PAYMENT_TYPES.includes(transaction.type)) {
        const isVendor = Boolean(transaction.provider_booking_id) ||
          transaction.type === 'vendor_service' ||
          transaction.type === 'vendor_service_payment'
        const relevantBookingId = isVendor
          ? (transaction.provider_booking_id ?? transaction.booking_id)
          : transaction.booking_id

        if (!relevantBookingId) {
          result.skipped += 1
          continue
        }

        const tableName = isVendor ? 'provider_bookings' : 'bookings'
        const selectFields = isVendor
          ? 'id, state, completed_at, organizer_completed_at, provider_completed_at, payout_hold_until'
          : 'id, state, completed_at, organizer_completed_at, artist_completed_at, payout_hold_until'

        const { data: booking, error: bookingError } = await supabaseAdmin
          .from(tableName)
          .select(selectFields)
          .eq('id', relevantBookingId)
          .single()

        if (bookingError || !booking) {
          result.failures.push({ reference: transaction.reference, reason: 'Booking not found for held transaction' })
          continue
        }

        if (!canReleaseBookingTransaction(booking as BookingReleaseCandidate, transaction)) {
          result.skipped += 1
          continue
        }

        await releaseTransactionToWallet(
          transaction,
          'Your booking payment is ready',
          `${formatMoneyExact(Number(transaction.net_amount || 0) / 100)} for your completed booking is ready to be paid out to your bank.`,
          '/earnings'
        )

        result.released += 1
        if (transaction.recipient_id) releasedTo.add(transaction.recipient_id)
        continue
      }

      result.skipped += 1
    } catch (releaseError) {
      result.failures.push({
        reference: transaction.reference,
        reason: releaseError instanceof Error ? releaseError.message : 'Unknown release error',
      })
    }
  }

  // One queue per recipient, once every release in this sweep has landed, so
  // the request is for the whole balance rather than a partial one.
  for (const recipientId of releasedTo) {
    const outcome = await enqueuePayoutRequest(recipientId)
    if (outcome === 'error') {
      result.failures.push({ reference: 'enqueue', reason: `Could not queue a payout for ${recipientId}` })
    }
  }

  return result
}
