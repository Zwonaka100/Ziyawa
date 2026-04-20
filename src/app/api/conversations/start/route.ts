import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/conversations/start
 *
 * Messaging is booking-gated (Uber-style):
 *   1. Org sends a booking/hire request → conversation is auto-created
 *   2. Both parties can chat while booking is pending / accepted / paid
 *   3. On decline → conversation is auto-closed (DB trigger)
 *   4. On completion → conversation is auto-closed (DB trigger)
 *   5. New booking reopens a previously closed conversation
 *
 * Admins bypass the gate entirely for investigation purposes.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { recipientId, contextType, contextId } = await request.json()

    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 })
    }
    if (recipientId === user.id) {
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
    }

    // Admins bypass the booking gate
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('is_admin, role')
      .eq('id', user.id)
      .single()

    const isAdmin = senderProfile?.is_admin || senderProfile?.role === 'super_admin'

    let hasActiveBooking = isAdmin

    if (!hasActiveBooking) {
      // Step 1: resolve provider / artist entity IDs for both users
      const [
        { data: senderProvider },
        { data: recipientProvider },
        { data: senderArtist },
        { data: recipientArtist },
      ] = await Promise.all([
        supabase.from('providers').select('id').eq('profile_id', user.id).maybeSingle(),
        supabase.from('providers').select('id').eq('profile_id', recipientId).maybeSingle(),
        supabase.from('artists').select('id').eq('profile_id', user.id).maybeSingle(),
        supabase.from('artists').select('id').eq('profile_id', recipientId).maybeSingle(),
      ])

      const ACTIVE = ['pending', 'accepted', 'paid']

      // Step 2: parallel booking checks across all relationship types
      const checks = await Promise.all([
        // Org → provider service booking
        recipientProvider?.id
          ? supabase.from('provider_bookings').select('id')
              .eq('organizer_id', user.id).eq('provider_id', recipientProvider.id)
              .in('status', ACTIVE).limit(1).maybeSingle()
          : Promise.resolve({ data: null }),

        // Provider → org (provider viewing their own booking with org)
        senderProvider?.id
          ? supabase.from('provider_bookings').select('id')
              .eq('provider_id', senderProvider.id).eq('organizer_id', recipientId)
              .in('status', ACTIVE).limit(1).maybeSingle()
          : Promise.resolve({ data: null }),

        // Org → artist booking
        recipientArtist?.id
          ? supabase.from('bookings').select('id')
              .eq('organizer_id', user.id).eq('artist_id', recipientArtist.id)
              .in('status', ACTIVE).limit(1).maybeSingle()
          : Promise.resolve({ data: null }),

        // Artist → org (artist responding to booking)
        senderArtist?.id
          ? supabase.from('bookings').select('id')
              .eq('artist_id', senderArtist.id).eq('organizer_id', recipientId)
              .in('status', ACTIVE).limit(1).maybeSingle()
          : Promise.resolve({ data: null }),

        // Crew team member ↔ organizer who invited them
        supabase.from('event_team_members').select('id')
          .eq('user_id', user.id).eq('invited_by', recipientId)
          .eq('status', 'active').limit(1).maybeSingle(),

        supabase.from('event_team_members').select('id')
          .eq('user_id', recipientId).eq('invited_by', user.id)
          .eq('status', 'active').limit(1).maybeSingle(),
      ])

      hasActiveBooking = checks.some(r => r.data !== null)
    }

    if (!hasActiveBooking) {
      return NextResponse.json(
        {
          error: 'no_active_booking',
          message: 'Chat is only available after a booking or hire request has been made. Send a request first to unlock messaging.',
        },
        { status: 403 }
      )
    }

    // Look for an existing conversation (regardless of closed state)
    const { data: existingConvo } = await supabase
      .from('conversations')
      .select('id, is_closed')
      .or(
        `and(participant_one.eq.${user.id},participant_two.eq.${recipientId}),` +
        `and(participant_one.eq.${recipientId},participant_two.eq.${user.id})`
      )
      .maybeSingle()

    if (existingConvo) {
      // Re-open a previously closed conversation when a new booking exists
      if (existingConvo.is_closed) {
        await supabase.from('conversations').update({
          is_closed: false,
          closed_at: null,
          closed_reason: null,
          ...(contextType && { context_type: contextType }),
          ...(contextId && { context_id: contextId }),
        }).eq('id', existingConvo.id)
      }
      return NextResponse.json({ conversationId: existingConvo.id, isNew: false, isClosed: false })
    }

    // Create new conversation linked to this booking
    const now = new Date().toISOString()
    const { data: newConvo, error } = await supabase
      .from('conversations')
      .insert({
        participant_one: user.id,
        participant_two: recipientId,
        context_type: contextType || null,
        context_id: contextId || null,
        initiated_by_booking: true,
        last_message_at: now,
        participant_one_last_read: now,
        participant_two_last_read: now,
        participant_one_unread: 0,
        participant_two_unread: 0,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating conversation:', error)
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    return NextResponse.json({ conversationId: newConvo.id, isNew: true, isClosed: false })

  } catch (error) {
    console.error('Start conversation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

