import { createClient } from '@supabase/supabase-js'
import { createNotification } from '@/lib/notifications'

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
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(amount)
}

export function calculateHoldUntil(baseDate: string | null | undefined, holdHours: number): string {
  const base = baseDate ? new Date(baseDate) : new Date()
  return new Date(base.getTime() + holdHours * 60 * 60 * 1000).toISOString()
}

export async function adjustProfileBalanceBuckets(
  userId: string,
  deltas: {
    walletDelta?: number
    heldDelta?: number
    pendingPayoutDelta?: number
  }
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
    return { success: true }
  }

  const fallbackUpdate = {
    wallet_balance: roundCurrency(Number(profile.wallet_balance || 0) + walletDelta),
  }

  const { error: secondUpdateError } = await supabaseAdmin
    .from('profiles')
    .update(fallbackUpdate)
    .eq('id', userId)

  return { success: !secondUpdateError, degraded: true, error: secondUpdateError || updateError }
}

function needsManualReview(amountCents: number) {
  return amountCents / 100 >= MANUAL_REVIEW_THRESHOLD_RANDS
}

function canReleaseEventTransaction(event: EventReleaseCandidate, tx: HeldTransaction) {
  if (event.state !== 'completed' || event.cancelled_at) return false
  if (!(event.organizer_completed_at || event.admin_completed_at || event.completed_at)) return false

  const holdUntil = event.payout_hold_until || calculateHoldUntil(event.completed_at || event.event_date, DEFAULT_EVENT_HOLD_HOURS)
  if (new Date(holdUntil).getTime() > Date.now()) return false

  if (needsManualReview(tx.net_amount || tx.amount) && !event.admin_completed_at) {
    return false
  }

  return true
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

  await createNotification({
    userId: transaction.recipient_id,
    type: 'payment_received',
    title,
    message,
    link,
    transactionId: transaction.id,
    sendEmail: true,
  })

  return releaseAmountRands
}

export async function releaseEligibleHeldFunds(options?: {
  transactionId?: string
  eventId?: string
  bookingId?: string
  providerBookingId?: string
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
    }
  }

  const result: ReleaseResult = {
    checked: transactions?.length || 0,
    released: 0,
    skipped: 0,
    failures: [],
  }

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

        if (!canReleaseEventTransaction(event as EventReleaseCandidate, transaction)) {
          result.skipped += 1
          continue
        }

        await releaseTransactionToWallet(
          transaction,
          'Event revenue released',
          `${formatCurrency(Number(transaction.net_amount || 0) / 100)} from "${event.title}" is now available in your wallet.`,
          '/wallet'
        )

        result.released += 1
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
          'Booking payout released',
          `${formatCurrency(Number(transaction.net_amount || 0) / 100)} is now available in your wallet for your completed booking.`,
          '/wallet'
        )

        result.released += 1
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

  return result
}
