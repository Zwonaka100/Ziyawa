/**
 * TICKET VALIDATION API
 * POST /api/tickets/validate
 * 
 * Validates a ticket without checking it in
 * Used to preview ticket details before check-in
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
    const { ticketCode, eventId } = body;

    // Validate input
    if (!ticketCode) {
      return NextResponse.json(
        { error: 'Ticket code is required' },
        { status: 400 }
      );
    }

    const normalizedCode = ticketCode.toUpperCase()

    // Find ticket
    const { data: ticket } = await supabase
      .from('tickets')
      .select(`
        id,
        ticket_code,
        ticket_type,
        price_paid,
        checked_in,
        checked_in_at,
        checked_in_by,
        event_id,
        user_id,
        events (
          id,
          title,
          date,
          time,
          venue,
          city,
          organizer_id
        ),
        profiles:user_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('ticket_code', normalizedCode)
      .single();

    let resolvedTicket: Record<string, unknown> | null = ticket as Record<string, unknown> | null

    if (!resolvedTicket) {
      const { data: pass, error: passError } = await supabase
        .from('event_access_passes')
        .select(`
          id,
          code,
          pass_type,
          checked_in,
          checked_in_at,
          checked_in_by,
          event_id,
          full_name,
          events (
            id,
            title,
            date,
            time,
            venue,
            city,
            organizer_id
          )
        `)
        .eq('code', normalizedCode)
        .single();

      if (passError || !pass) {
        return NextResponse.json(
          { 
            valid: false,
            error: 'Ticket not found',
            message: 'This ticket or guest pass does not exist in our system.'
          },
          { status: 404 }
        )
      }

      resolvedTicket = {
        id: pass.id,
        ticket_code: pass.code,
        ticket_type: pass.pass_type,
        price_paid: 0,
        checked_in: pass.checked_in,
        checked_in_at: pass.checked_in_at,
        checked_in_by: pass.checked_in_by,
        event_id: pass.event_id,
        user_id: null,
        events: pass.events,
        profiles: {
          id: null,
          full_name: pass.full_name,
          avatar_url: null,
        },
      }
    }

    const ticketRow = resolvedTicket

    // If eventId provided, verify it matches
    if (eventId && ticketRow.event_id !== eventId) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Wrong event',
          message: 'This ticket is for a different event.'
        },
        { status: 400 }
      );
    }

    // Check if user has permission (must be organizer of the event)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = ticketRow.events as any;
    if (event?.organizer_id !== user.id) {
      // Also check if user is a staff member (future feature)
      return NextResponse.json(
        { error: 'You are not authorized to validate tickets for this event' },
        { status: 403 }
      );
    }
    // Check event date
    const eventDate = new Date(event?.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Determine ticket status
    let status: 'valid' | 'used' | 'early' | 'expired';
    let message: string;

    if (ticketRow.checked_in) {
      status = 'used';
      message = `Already checked in at ${new Date(ticketRow.checked_in_at as string).toLocaleTimeString()}`;
    } else if (daysDiff > 1) {
      status = 'early';
      message = `Event is in ${daysDiff} days. Check-in opens on event day.`;
    } else if (daysDiff < -1) {
      status = 'expired';
      message = 'This event has already ended.';
    } else {
      status = 'valid';
      message = 'Ticket is valid and ready for check-in.';
    }

    return NextResponse.json({
      valid: status === 'valid',
      status,
      message,
      ticket: {
        id: ticketRow.id,
        code: ticketRow.ticket_code,
        type: ticketRow.ticket_type,
        pricePaid: ticketRow.price_paid,
        checkedIn: ticketRow.checked_in,
        checkedInAt: ticketRow.checked_in_at,
        holder: ticketRow.profiles,
        event: ticketRow.events,
      },
    });

  } catch (error) {
    console.error('Ticket validation error:', error);
    return NextResponse.json(
      { error: 'Validation failed' },
      { status: 500 }
    );
  }
}
