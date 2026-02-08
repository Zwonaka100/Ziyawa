/**
 * EVENT ATTENDANCE API
 * GET /api/events/[id]/attendance
 * 
 * Returns attendance statistics for an event
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get event and verify ownership
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, organizer_id, tickets_sold')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    if (event.organizer_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    // Get attendance stats
    const { count: totalTickets } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

    const { count: checkedIn } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('checked_in', true);

    // Get check-in timeline (hourly breakdown)
    const { data: checkins } = await supabase
      .from('tickets')
      .select('checked_in_at')
      .eq('event_id', eventId)
      .eq('checked_in', true)
      .order('checked_in_at', { ascending: true });

    // Group by hour
    const hourlyCheckins: Record<string, number> = {};
    checkins?.forEach(ticket => {
      if (ticket.checked_in_at) {
        const hour = new Date(ticket.checked_in_at).getHours();
        const key = `${hour}:00`;
        hourlyCheckins[key] = (hourlyCheckins[key] || 0) + 1;
      }
    });

    // Get ticket type breakdown
    const { data: ticketTypes } = await supabase
      .from('tickets')
      .select('ticket_type, checked_in')
      .eq('event_id', eventId);

    const typeBreakdown: Record<string, { total: number; checkedIn: number }> = {};
    ticketTypes?.forEach(ticket => {
      const type = ticket.ticket_type || 'General';
      if (!typeBreakdown[type]) {
        typeBreakdown[type] = { total: 0, checkedIn: 0 };
      }
      typeBreakdown[type].total += 1;
      if (ticket.checked_in) {
        typeBreakdown[type].checkedIn += 1;
      }
    });

    return NextResponse.json({
      eventId,
      eventTitle: event.title,
      stats: {
        totalTickets: totalTickets || 0,
        checkedIn: checkedIn || 0,
        notCheckedIn: (totalTickets || 0) - (checkedIn || 0),
        attendanceRate: totalTickets ? Math.round((checkedIn || 0) / totalTickets * 100) : 0,
      },
      timeline: hourlyCheckins,
      byType: typeBreakdown,
    });

  } catch (error) {
    console.error('Attendance API error:', error);
    return NextResponse.json(
      { error: 'Failed to get attendance data' },
      { status: 500 }
    );
  }
}
