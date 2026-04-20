/**
 * TICKET CHECK-IN API
 * POST /api/tickets/checkin
 * 
 * Marks a ticket as checked in
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getEventAccessForUser } from '@/lib/event-team';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function resolveScannedInput(value: string | null | undefined) {
  const raw = String(value || '').trim();

  if (!raw) {
    return { normalizedCode: null, parsedTicketId: null };
  }

  try {
    const parsed = JSON.parse(raw) as { code?: string; ticket?: string };
    return {
      normalizedCode: parsed.code ? String(parsed.code).trim().toUpperCase() : raw.toUpperCase(),
      parsedTicketId: parsed.ticket ? String(parsed.ticket).trim() : null,
    };
  } catch {
    return {
      normalizedCode: raw.toUpperCase(),
      parsedTicketId: null,
    };
  }
}

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
    const { ticketCode, eventId, ticketId, selfCheckIn = false } = body;

    // Validate input - need either ticketCode or ticketId
    if (!ticketCode && !ticketId) {
      return NextResponse.json(
        { error: 'Ticket code or ticket ID is required' },
        { status: 400 }
      );
    }

    const { normalizedCode, parsedTicketId } = resolveScannedInput(ticketCode);

    let entryId = '';
    let entryCode = '';
    let entryType = '';
    let entryHolder = 'Guest';
    let entryCheckedIn = false;
    let entryCheckedInAt: string | null = null;
    let entryEventId = '';
    let eventDateValue = '';
    let entryUserId: string | null = null;
    let sourceTable: 'tickets' | 'event_access_passes' = 'tickets';

    // Try normal ticket first
    let ticketQuery = supabaseAdmin
      .from('tickets')
      .select(`
        id,
        ticket_code,
        ticket_type,
        is_used,
        used_at,
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

    if (ticketId || parsedTicketId) {
      ticketQuery = ticketQuery.eq('id', ticketId || parsedTicketId);
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
      entryCheckedIn = ticket.is_used;
      entryCheckedInAt = ticket.used_at;
      entryEventId = ticket.event_id;
      eventDateValue = event?.event_date || '';
      entryUserId = ticket.user_id || null;
      sourceTable = 'tickets';
    } else {
      let passQuery = supabaseAdmin
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

      if (ticketId || parsedTicketId) {
        passQuery = passQuery.eq('id', ticketId || parsedTicketId);
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

    const access = await getEventAccessForUser(supabaseAdmin, entryEventId, user.id);
    const isOrganizer = access.isOwner;
    const isTeamMember = access.permissions.canCheckIn;
    const isTicketOwner = sourceTable === 'tickets' && entryUserId === user.id;

    if (!isOrganizer && !isTeamMember && !isTicketOwner) {
      return NextResponse.json(
        { error: 'Not authorized to check in entries for this event' },
        { status: 403 }
      );
    }

    if (selfCheckIn && !isTicketOwner) {
      return NextResponse.json(
        { error: 'Only the ticket holder can self check-in' },
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

    if (selfCheckIn && daysDiff !== 0) {
      return NextResponse.json({
        success: false,
        error: 'Not available yet',
        message: 'Self check-in is available on the event day only.',
      }, { status: 400 });
    }

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
    
    const updatePayload = sourceTable === 'tickets'
      ? {
          is_used: true,
          used_at: checkedInAt,
          checked_in_by: user.id,
        }
      : {
          checked_in: true,
          checked_in_at: checkedInAt,
          checked_in_by: user.id,
        };

    const { error: updateError } = await supabaseAdmin
      .from(sourceTable)
      .update(updatePayload)
      .eq('id', entryId);

    if (updateError) {
      console.error('Check-in update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to check in ticket' },
        { status: 500 }
      );
    }

    // Get updated attendance count
    const { count: checkedInCount } = await supabaseAdmin
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', entryEventId)
      .eq('is_used', true);

    const { count: totalCount } = await supabaseAdmin
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', entryEventId);

    const { count: guestCheckedInCount, error: guestCheckedInError } = await supabaseAdmin
      .from('event_access_passes')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', entryEventId)
      .eq('checked_in', true);

    const { count: guestTotalCount, error: guestTotalError } = await supabaseAdmin
      .from('event_access_passes')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', entryEventId);
    
    return NextResponse.json({
      success: true,
      message: selfCheckIn ? 'You are checked in. The organizer can now find you on the list.' : 'Check-in successful!',
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
