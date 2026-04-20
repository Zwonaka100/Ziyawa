/**
 * BOOKING PAYMENT API
 * POST /api/payments/booking
 *
 * Initialises a Paystack payment for an artist booking or provider (crew) booking.
 * Body: { bookingId, bookingType: 'artist' | 'provider' }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initializePayment, generatePaymentReference } from '@/lib/paystack'
import { calculateArtistCommission, calculateVendorCommission } from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { bookingId, bookingType } = body as {
      bookingId: string
      bookingType: 'artist' | 'provider'
    }

    if (!bookingId || !['artist', 'provider'].includes(bookingType)) {
      return NextResponse.json({ error: 'bookingId and bookingType are required' }, { status: 400 })
    }

    // ── Get payer profile ──────────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name, wallet_balance')
      .eq('id', user.id)
      .single()

    if (!profile?.email) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
    }

    // ── Load booking ───────────────────────────────────────────────────────────
    if (bookingType === 'artist') {
      const { data: booking, error: bErr } = await supabase
        .from('bookings')
        .select(`
          id, state, offered_amount, final_amount, organizer_id,
          artists (id, stage_name, profile_id,
            profiles:profile_id (id, full_name)
          ),
          events (id, title)
        `)
        .eq('id', bookingId)
        .single()

      if (bErr || !booking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }

      if (booking.organizer_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      if (booking.state !== 'accepted') {
        return NextResponse.json(
          { error: `Booking must be accepted before payment. Current state: ${booking.state}` },
          { status: 400 }
        )
      }

      const amountRands = Number(booking.final_amount ?? booking.offered_amount)
      const amountCents = Math.round(amountRands * 100)

      const { commissionAmount, artistPayout } = calculateArtistCommission(amountCents)

      // Artist recipient profile id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const artistArr = booking.artists as any
      const artistRec = Array.isArray(artistArr) ? artistArr[0] : artistArr
      const recipientProfileId = Array.isArray(artistRec?.profiles)
        ? artistRec.profiles[0]?.id
        : artistRec?.profiles?.id ?? artistRec?.profile_id ?? null

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const eventsArr = booking.events as any
      const eventRec = Array.isArray(eventsArr) ? eventsArr[0] : eventsArr

      const reference = generatePaymentReference('BKA')

      const { data: txn, error: txnErr } = await supabase
        .from('transactions')
        .insert({
          reference,
          type: 'artist_booking',
          state: 'initiated',
          amount: amountCents,
          platform_fee: commissionAmount,
          net_amount: artistPayout,
          payer_id: user.id,
          recipient_id: recipientProfileId,
          recipient_type: 'artist',
          booking_id: bookingId,
          gateway_provider: 'paystack',
          gateway_response: {
            booking_id: bookingId,
            booking_type: 'artist',
            artist_name: artistRec?.stage_name,
            event_title: eventRec?.title,
          },
        })
        .select('id')
        .single()

      if (txnErr || !txn) {
        return NextResponse.json({ error: 'Failed to create transaction record' }, { status: 500 })
      }

      const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/payments/callback`

      const paystack = await initializePayment({
        email: profile.email,
        amount: amountCents,
        reference,
        callback_url: callbackUrl,
        metadata: {
          type: 'booking_payment',
          booking_id: bookingId,
          booking_type: 'artist',
          transaction_id: txn.id,
          user_id: user.id,
        },
      })

      return NextResponse.json({
        authorizationUrl: paystack.data.authorization_url,
        reference,
        amountRands,
        commissionPercent: Math.round((commissionAmount / amountCents) * 100),
        artistPayout: artistPayout / 100,
      })
    }

    // ── Provider (crew) booking ────────────────────────────────────────────────
    const { data: booking, error: bErr } = await supabase
      .from('provider_bookings')
      .select(`
        id, state, offered_amount, final_amount, organizer_id,
        providers (id, business_name, profile_id),
        provider_services (id, title),
        events (id, title)
      `)
      .eq('id', bookingId)
      .single()

    if (bErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (booking.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (booking.state !== 'accepted') {
      return NextResponse.json(
        { error: `Booking must be accepted before payment. Current state: ${booking.state}` },
        { status: 400 }
      )
    }

    const amountRands = Number(booking.final_amount ?? booking.offered_amount)
    const amountCents = Math.round(amountRands * 100)

    const { commissionAmount, vendorPayout } = calculateVendorCommission(amountCents)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provArr = booking.providers as any
    const provRec = Array.isArray(provArr) ? provArr[0] : provArr
    const recipientProfileId = provRec?.profile_id ?? null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svcArr = booking.provider_services as any
    const svcRec = Array.isArray(svcArr) ? svcArr[0] : svcArr

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const evArr = booking.events as any
    const evRec = Array.isArray(evArr) ? evArr[0] : evArr

    const reference = generatePaymentReference('BKP')

    const { data: txn, error: txnErr } = await supabase
      .from('transactions')
      .insert({
        reference,
        type: 'vendor_service',
        state: 'initiated',
        amount: amountCents,
        platform_fee: commissionAmount,
        net_amount: vendorPayout,
        payer_id: user.id,
        recipient_id: recipientProfileId,
        recipient_type: 'vendor',
        provider_booking_id: bookingId,
        gateway_provider: 'paystack',
        gateway_response: {
          booking_id: bookingId,
          booking_type: 'provider',
          provider_name: provRec?.business_name,
          service_title: svcRec?.title,
          event_title: evRec?.title,
        },
      })
      .select('id')
      .single()

    if (txnErr || !txn) {
      return NextResponse.json({ error: 'Failed to create transaction record' }, { status: 500 })
    }

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/payments/callback`

    const paystack = await initializePayment({
      email: profile.email,
      amount: amountCents,
      reference,
      callback_url: callbackUrl,
      metadata: {
        type: 'booking_payment',
        booking_id: bookingId,
        booking_type: 'vendor',
        transaction_id: txn.id,
        user_id: user.id,
      },
    })

    return NextResponse.json({
      authorizationUrl: paystack.data.authorization_url,
      reference,
      amountRands,
      commissionPercent: Math.round((commissionAmount / amountCents) * 100),
      providerPayout: vendorPayout / 100,
    })
  } catch (error) {
    console.error('Booking payment init error:', error)
    return NextResponse.json({ error: 'Failed to initialise payment' }, { status: 500 })
  }
}
