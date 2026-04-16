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
      .select('is_admin, admin_role')
      .eq('id', user.id)
      .single()

    const { data: booking, error: bookingError } = await supabase
      .from('provider_bookings')
      .select('id, organizer_id, provider_id, state, completed_at, organizer_completed_at, provider_completed_at, payout_hold_until, completion_notes')
      .eq('id', id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Provider booking not found' }, { status: 404 })
    }

    let isProviderOwner = false
    if (booking.provider_id) {
      const { data: provider } = await supabase
        .from('providers')
        .select('profile_id')
        .eq('id', booking.provider_id)
        .single()

      isProviderOwner = provider?.profile_id === user.id
    }

    const isAdmin = Boolean(profile?.is_admin || profile?.admin_role === 'super_admin')
    const isOrganizer = booking.organizer_id === user.id

    if (!isAdmin && !isOrganizer && !isProviderOwner) {
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
      updates.provider_completed_at = booking.provider_completed_at || now
      updates.completed_at = booking.completed_at || now
      updates.state = 'completed'
    } else if (isOrganizer) {
      updates.organizer_completed_at = now
    } else if (isProviderOwner) {
      updates.provider_completed_at = now
    }

    const organizerCompletedAt = updates.organizer_completed_at || booking.organizer_completed_at
    const providerCompletedAt = updates.provider_completed_at || booking.provider_completed_at

    if (organizerCompletedAt && providerCompletedAt) {
      updates.state = 'completed'
      updates.completed_at = booking.completed_at || now
    }

    const { error: updateError } = await supabase
      .from('provider_bookings')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to confirm provider booking completion' }, { status: 500 })
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
    console.error('Provider booking completion error:', error)
    return NextResponse.json({ error: 'Failed to complete provider booking' }, { status: 500 })
  }
}
