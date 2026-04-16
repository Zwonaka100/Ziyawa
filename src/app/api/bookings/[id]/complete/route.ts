import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateHoldUntil, releaseEligibleHeldFunds } from '@/lib/payments/escrow'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, admin_role, is_artist')
      .eq('id', user.id)
      .single()

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, organizer_id, artist_id, state, completed_at, organizer_completed_at, artist_completed_at, payout_hold_until, completion_notes')
      .eq('id', id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    let isArtistOwner = false
    if (booking.artist_id) {
      const { data: artist } = await supabase
        .from('artists')
        .select('profile_id')
        .eq('id', booking.artist_id)
        .single()

      isArtistOwner = artist?.profile_id === user.id
    }

    const isAdmin = Boolean(profile?.is_admin || profile?.admin_role === 'super_admin')
    const isOrganizer = booking.organizer_id === user.id

    if (!isAdmin && !isOrganizer && !isArtistOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({})) as { notes?: string }
    const now = new Date().toISOString()

    const updates: Record<string, string> = {
      payout_hold_until: booking.payout_hold_until || calculateHoldUntil(booking.completed_at || now, Number(process.env.BOOKING_PAYOUT_HOLD_HOURS || '24')),
      completion_notes: body.notes || booking.completion_notes || '',
    }

    if (isAdmin) {
      updates.organizer_completed_at = booking.organizer_completed_at || now
      updates.artist_completed_at = booking.artist_completed_at || now
      updates.completed_at = booking.completed_at || now
      updates.state = 'completed'
    } else if (isOrganizer) {
      updates.organizer_completed_at = now
    } else if (isArtistOwner) {
      updates.artist_completed_at = now
    }

    const organizerCompletedAt = updates.organizer_completed_at || booking.organizer_completed_at
    const artistCompletedAt = updates.artist_completed_at || booking.artist_completed_at

    if (organizerCompletedAt && artistCompletedAt) {
      updates.state = 'completed'
      updates.completed_at = booking.completed_at || now
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to confirm booking completion' }, { status: 500 })
    }

    const releaseResult = updates.state === 'completed'
      ? await releaseEligibleHeldFunds({ bookingId: id })
      : { checked: 0, released: 0, skipped: 0, failures: [] }

    return NextResponse.json({
      success: true,
      bookingId: id,
      fullyCompleted: updates.state === 'completed',
      releaseResult,
      payoutHoldUntil: updates.payout_hold_until,
    })
  } catch (error) {
    console.error('Booking completion error:', error)
    return NextResponse.json({ error: 'Failed to complete booking' }, { status: 500 })
  }
}
