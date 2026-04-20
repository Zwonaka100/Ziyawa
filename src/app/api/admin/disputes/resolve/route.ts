/**
 * ADMIN RESOLVE DISPUTE
 * POST /api/admin/disputes/resolve
 *
 * Admin-only. Resolves a disputed booking.
 * Body: {
 *   bookingId: string
 *   bookingType: 'artist' | 'provider'
 *   resolution: 'release' | 'refund'
 *   notes?: string
 * }
 *
 * 'release' — funds go to artist/provider; booking → completed
 * 'refund'  — funds return to organizer wallet; booking → cancelled
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { adjustProfileBalanceBuckets } from '@/lib/payments/escrow'
import { createNotification } from '@/lib/notifications'
import { logOpsEvent } from '@/lib/monitoring'

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Admin gate
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, admin_role')
      .eq('id', user.id)
      .single()

    const isAdmin = Boolean(profile?.is_admin || profile?.admin_role === 'super_admin' || profile?.admin_role === 'admin')
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json() as {
      bookingId: string
      bookingType: 'artist' | 'provider'
      resolution: 'release' | 'refund'
      notes?: string
    }

    const { bookingId, bookingType, resolution, notes } = body

    if (!bookingId || !bookingType || !resolution) {
      return NextResponse.json({ error: 'bookingId, bookingType, and resolution are required' }, { status: 400 })
    }
    if (!['artist', 'provider'].includes(bookingType)) {
      return NextResponse.json({ error: 'bookingType must be artist or provider' }, { status: 400 })
    }
    if (!['release', 'refund'].includes(resolution)) {
      return NextResponse.json({ error: 'resolution must be release or refund' }, { status: 400 })
    }

    const tableName = bookingType === 'provider' ? 'provider_bookings' : 'bookings'
    const selectCols = bookingType === 'provider'
      ? 'id, state, organizer_id, provider_id, offered_amount, final_amount, confirmed_at, disputed_at'
      : 'id, state, organizer_id, artist_id, offered_amount, final_amount, confirmed_at, disputed_at'

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from(tableName)
      .select(selectCols)
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (booking.state !== 'disputed') {
      return NextResponse.json({ error: `Booking is not in disputed state (current: ${booking.state})` }, { status: 400 })
    }

    const now = new Date().toISOString()
    const newState = resolution === 'release' ? 'completed' : 'cancelled'

    // Find the held transaction
    const txnQuery = bookingType === 'provider'
      ? supabaseAdmin.from('transactions').select('id, state, amount, net_amount, recipient_id, payer_id').eq('provider_booking_id', bookingId).eq('state', 'held').maybeSingle()
      : supabaseAdmin.from('transactions').select('id, state, amount, net_amount, recipient_id, payer_id').eq('booking_id', bookingId).eq('state', 'held').maybeSingle()

    const { data: txn } = await txnQuery

    // ── Resolution: release to artist/provider ─────────────────────────────────
    if (resolution === 'release') {
      if (txn?.recipient_id) {
        const releaseAmountRands = Math.round(Number(txn.net_amount || txn.amount || 0)) / 100
        await adjustProfileBalanceBuckets(txn.recipient_id, {
          walletDelta: releaseAmountRands,
          heldDelta: -releaseAmountRands,
        })

        await supabaseAdmin
          .from('transactions')
          .update({ state: 'released', released_at: now })
          .eq('id', txn.id)

        await createNotification({
          userId: txn.recipient_id,
          type: 'payment_received',
          title: 'Dispute resolved — payment released',
          message: `Your booking dispute has been resolved in your favour. The payment has been released to your wallet.`,
          link: '/wallet',
          sendEmail: true,
        })
      }

      await createNotification({
        userId: booking.organizer_id,
        type: 'booking_completed',
        title: 'Dispute resolved',
        message: `The dispute on your booking has been resolved. Payment was released to the ${bookingType === 'provider' ? 'provider' : 'artist'}.`,
        link: `/dashboard/organizer/events`,
        sendEmail: false,
      })
    }

    // ── Resolution: refund to organizer ────────────────────────────────────────
    if (resolution === 'refund') {
      if (txn) {
        const refundAmountRands = Math.round(Number(txn.amount || 0)) / 100

        if (txn.recipient_id) {
          const heldAmountRands = Math.round(Number(txn.net_amount || txn.amount || 0)) / 100
          // Remove from recipient held balance
          await adjustProfileBalanceBuckets(txn.recipient_id, {
            heldDelta: -heldAmountRands,
          })
        }

        // Credit full amount back to organizer wallet
        await adjustProfileBalanceBuckets(txn.payer_id, {
          walletDelta: refundAmountRands,
        })

        await supabaseAdmin
          .from('transactions')
          .update({
            state: 'refunded',
            refunded_at: now,
            refund_amount: txn.amount,
            refund_reason: `Dispute resolved in favour of organizer. ${notes || ''}`.trim(),
          })
          .eq('id', txn.id)

        await createNotification({
          userId: txn.payer_id,
          type: 'payment_received',
          title: 'Dispute resolved — refund issued',
          message: `Your booking dispute has been resolved in your favour. The payment has been refunded to your wallet.`,
          link: '/wallet',
          sendEmail: true,
        })
      }

      // Notify the recipient party
      const recipientUserId = bookingType === 'provider' ? null : null // resolved below
      const bookingAsAny = booking as Record<string, unknown>
      const recipientProfileId = await (async () => {
        if (bookingType === 'provider' && bookingAsAny.provider_id) {
          const { data: prov } = await supabaseAdmin
            .from('providers')
            .select('profile_id')
            .eq('id', bookingAsAny.provider_id)
            .single()
          return prov?.profile_id ?? null
        }
        if (bookingType === 'artist' && bookingAsAny.artist_id) {
          const { data: art } = await supabaseAdmin
            .from('artists')
            .select('profile_id')
            .eq('id', bookingAsAny.artist_id)
            .single()
          return art?.profile_id ?? null
        }
        return null
      })()

      if (recipientProfileId) {
        await createNotification({
          userId: recipientProfileId,
          type: 'booking_cancelled',
          title: 'Dispute resolved',
          message: `The booking dispute has been reviewed and resolved. The payment has been refunded to the organizer.`,
          link: '/dashboard',
          sendEmail: false,
        })
      }

      void recipientUserId // suppress unused warning
    }

    // ── Update booking state ───────────────────────────────────────────────────
    const bookingUpdate: Record<string, unknown> = {
      state: newState,
      dispute_resolved_at: now,
      dispute_resolution: resolution,
      dispute_resolved_by: user.id,
      dispute_resolution_notes: notes || null,
    }
    if (newState === 'completed') {
      bookingUpdate.completed_at = now
    } else {
      bookingUpdate.cancelled_at = now
      bookingUpdate.cancellation_reason = `Dispute resolved: ${notes || resolution}`
    }

    await supabaseAdmin.from(tableName).update(bookingUpdate).eq('id', bookingId)

    logOpsEvent('admin-dispute-resolve', 'info', `Dispute resolved: ${bookingType} ${bookingId}`, {
      bookingId,
      bookingType,
      resolution,
      resolvedBy: user.id,
    })

    return NextResponse.json({ success: true, newState })
  } catch (err) {
    console.error('Dispute resolve error:', err)
    return NextResponse.json({ error: 'Failed to resolve dispute' }, { status: 500 })
  }
}
