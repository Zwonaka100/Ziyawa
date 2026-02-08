/**
 * TICKET CHECK-IN API
 * POST /api/tickets/checkin
 * 
 * Marks a ticket as checked in
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { ticketCode, eventId, ticketId } = body;

    // Validate input - need either ticketCode or ticketId
    if (!ticketCode && !ticketId) {
      return NextResponse.json(
        { error: 'Ticket code or ticket ID is required' },
        { status: 400 }
      );
    }

    // Find ticket
    let query = supabase
      .from('tickets')
      .select(`
        id,
        ticket_code,
        ticket_type,
        checked_in,
        checked_in_at,
        event_id,
        user_id,
        events (
          id,
          title,
          date,
          organizer_id
        ),
        profiles:user_id (
          full_name
        )
      `);

    if (ticketId) {
      query = query.eq('id', ticketId);
    } else {
      query = query.eq('ticket_code', ticketCode.toUpperCase());
    }

    const { data: ticket, error: ticketError } = await query.single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Ticket not found',
          message: 'This ticket code does not exist.'
        },
        { status: 404 }
      );
    }

    // Verify event matches if provided
    if (eventId && ticket.event_id !== eventId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Wrong event',
          message: 'This ticket is for a different event.'
        },
        { status: 400 }
      );
    }

    // Check authorization (must be organizer)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = ticket.events as any;
    if (event?.organizer_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to check in tickets for this event' },
        { status: 403 }
      );
    }

    // Check if already checked in
    if (ticket.checked_in) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profile = ticket.profiles as any;
      return NextResponse.json({
        success: false,
        alreadyCheckedIn: true,
        message: `Already checked in at ${new Date(ticket.checked_in_at!).toLocaleTimeString()}`,
        ticket: {
          id: ticket.id,
          code: ticket.ticket_code,
          type: ticket.ticket_type,
          holder: profile?.full_name || 'Guest',
          checkedInAt: ticket.checked_in_at,
        },
      });
    }

    // Check event date (allow check-in on event day and day before)
    const eventDate = new Date(event?.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff > 1) {
      return NextResponse.json({
        success: false,
        error: 'Too early',
        message: `Check-in for this event opens on ${eventDate.toLocaleDateString()}`,
      }, { status: 400 });
    }

    if (daysDiff < -1) {
      return NextResponse.json({
        success: false,
        error: 'Event ended',
        message: 'This event has already ended.',
      }, { status: 400 });
    }

    // Perform check-in
    const checkedInAt = new Date().toISOString();
    
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        checked_in: true,
        checked_in_at: checkedInAt,
        checked_in_by: user.id,
      })
      .eq('id', ticket.id);

    if (updateError) {
      console.error('Check-in update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to check in ticket' },
        { status: 500 }
      );
    }

    // Get updated attendance count
    const { count: checkedInCount } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', ticket.event_id)
      .eq('checked_in', true);

    const { count: totalCount } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', ticket.event_id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = ticket.profiles as any;
    
    return NextResponse.json({
      success: true,
      message: 'Check-in successful!',
      ticket: {
        id: ticket.id,
        code: ticket.ticket_code,
        type: ticket.ticket_type,
        holder: profile?.full_name || 'Guest',
        checkedInAt,
      },
      attendance: {
        checkedIn: checkedInCount || 0,
        total: totalCount || 0,
      },
    });

  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { error: 'Check-in failed' },
      { status: 500 }
    );
  }
}
