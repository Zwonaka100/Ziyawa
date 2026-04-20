/**
 * OPEN DISPUTE — PROVIDER BOOKING
 * POST /api/provider-bookings/[id]/dispute
 *
 * Organizer or provider can open a dispute on a confirmed booking.
 * Body: { reason: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({})) as { reason?: string }
    const reason = (body.reason ?? '').trim()
    if (!reason) {
      return NextResponse.json({ error: 'A dispute reason is required' }, { status: 400 })
    }

    const { data: booking, error } = await supabase
      .from('provider_bookings')
      .select('id, state, organizer_id, provider_id')
      .eq('id', id)
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
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

    const isOrganizer = booking.organizer_id === user.id
    if (!isOrganizer && !isProviderOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (booking.state !== 'confirmed') {
      return NextResponse.json(
        { error: `Disputes can only be opened on confirmed bookings. Current state: ${booking.state}` },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('provider_bookings')
      .update({
        state: 'disputed',
        disputed_at: now,
        dispute_reason: reason,
        dispute_opened_by: user.id,
      })
      .eq('id', id)

    if (updateError) throw updateError

    // Notify the other party
    const notifyUserId = isOrganizer ? null : booking.organizer_id
    if (notifyUserId) {
      await createNotification({
        userId: notifyUserId,
        type: 'booking_cancelled',
        title: 'Booking dispute opened',
        message: `A dispute has been opened on your service booking. Our team will review and contact both parties. Reason: ${reason}`,
        link: `/dashboard/organizer/events`,
        sendEmail: false,
      })
    }

    return NextResponse.json({ success: true, message: 'Dispute opened. Our team will review within 2 business days.' })
  } catch (err) {
    console.error('Open provider booking dispute error:', err)
    return NextResponse.json({ error: 'Failed to open dispute' }, { status: 500 })
  }
}
