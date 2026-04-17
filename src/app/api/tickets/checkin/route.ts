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

    const normalizedCode = ticketCode ? String(ticketCode).toUpperCase() : null;

    let entryId = '';
    let entryCode = '';
    let entryType = '';
    let entryHolder = 'Guest';
    let entryCheckedIn = false;
    let entryCheckedInAt: string | null = null;
    let entryEventId = '';
    let organizerId = '';
    let eventDateValue = '';
    let sourceTable: 'tickets' | 'event_access_passes' = 'tickets';

    // Try normal ticket first
    let ticketQuery = supabase
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
          event_date,
          organizer_id
        ),
        profiles:user_id (
          full_name
        )
      `);

    if (ticketId) {
      ticketQuery = ticketQuery.eq('id', ticketId);
    } else if (normalizedCode) {
      ticketQuery = ticketQuery.eq('ticket_code', normalizedCode);
    }

    const { data: ticket } = await ticketQuery.single();

    if (ticket) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const event = ticket.events as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profile = ticket.profiles as any;

      entryId = ticket.id;
      entryCode = ticket.ticket_code;
      entryType = ticket.ticket_type;
      entryHolder = profile?.full_name || 'Guest';
      entryCheckedIn = ticket.checked_in;
      entryCheckedInAt = ticket.checked_in_at;
      entryEventId = ticket.event_id;
      organizerId = event?.organizer_id || '';
      eventDateValue = event?.event_date || '';
      sourceTable = 'tickets';
    } else {
      let passQuery = supabase
        .from('event_access_passes')
        .select(`
          id,
          code,
          pass_type,
          checked_in,
          checked_in_at,
          event_id,
          full_name,
          events (
            id,
            title,
            event_date,
            organizer_id
          )
        `);

      if (ticketId) {
        passQuery = passQuery.eq('id', ticketId);
      } else if (normalizedCode) {
        passQuery = passQuery.eq('code', normalizedCode);
      }

      const { data: pass, error: passError } = await passQuery.single();

      if (passError || !pass) {
        return NextResponse.json(
          {
            success: false,
            error: 'Ticket not found',
            message: 'This ticket or guest pass does not exist.'
          },
          { status: 404 }
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const event = pass.events as any;

      entryId = pass.id;
      entryCode = pass.code;
      entryType = pass.pass_type;
      entryHolder = pass.full_name || 'Guest';
      entryCheckedIn = pass.checked_in;
      entryCheckedInAt = pass.checked_in_at;
      entryEventId = pass.event_id;
      organizerId = event?.organizer_id || '';
      eventDateValue = event?.event_date || '';
      sourceTable = 'event_access_passes';
    }

    // Verify event matches if provided
    if (eventId && entryEventId !== eventId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Wrong event',
          message: 'This pass is for a different event.'
        },
        { status: 400 }
      );
    }

    if (organizerId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to check in entries for this event' },
        { status: 403 }
      );
    }

    if (entryCheckedIn) {
      return NextResponse.json({
        success: false,
        alreadyCheckedIn: true,
        message: `Already checked in at ${new Date(entryCheckedInAt!).toLocaleTimeString()}`,
        ticket: {
          id: entryId,
          code: entryCode,
          type: entryType,
          holder: entryHolder,
          checkedInAt: entryCheckedInAt,
        },
      });
    }

    // Check event date (allow check-in on event day and day before)
    const eventDate = new Date(eventDateValue);
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
      .from(sourceTable)
      .update({
        checked_in: true,
        checked_in_at: checkedInAt,
        checked_in_by: user.id,
      })
      .eq('id', entryId);

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
      .eq('event_id', entryEventId)
      .eq('checked_in', true);

    const { count: totalCount } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', entryEventId);

    const { count: guestCheckedInCount, error: guestCheckedInError } = await supabase
      .from('event_access_passes')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', entryEventId)
      .eq('checked_in', true);

    const { count: guestTotalCount, error: guestTotalError } = await supabase
      .from('event_access_passes')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', entryEventId);
    
    return NextResponse.json({
      success: true,
      message: 'Check-in successful!',
      ticket: {
        id: entryId,
        code: entryCode,
        type: entryType,
        holder: entryHolder,
        checkedInAt,
      },
      attendance: {
        checkedIn: (checkedInCount || 0) + ((guestCheckedInError?.code === 'PGRST205' ? 0 : guestCheckedInCount) || 0),
        total: (totalCount || 0) + ((guestTotalError?.code === 'PGRST205' ? 0 : guestTotalCount) || 0),
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
