/**
 * EVENT ATTENDANCE API
 * GET /api/events/[id]/attendance
 * 
 * Returns attendance statistics for an event
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getEventAccessForUser } from '@/lib/event-team';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const access = await getEventAccessForUser(supabaseAdmin, eventId, user.id);

    if (!access.event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    if (!access.isOwner && !access.permissions.canViewAttendees) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    // Get attendance stats
    const { count: totalTickets } = await supabaseAdmin
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

    const { count: checkedIn } = await supabaseAdmin
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('is_used', true);

    const { count: guestTotal, error: guestTotalError } = await supabaseAdmin
      .from('event_access_passes')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

    const { count: guestCheckedIn, error: guestCheckedInError } = await supabaseAdmin
      .from('event_access_passes')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('checked_in', true);

    // Get check-in timeline (hourly breakdown)
    const { data: checkins } = await supabaseAdmin
      .from('tickets')
      .select('used_at')
      .eq('event_id', eventId)
      .eq('is_used', true)
      .order('used_at', { ascending: true });

    // Group by hour
    const hourlyCheckins: Record<string, number> = {};
    checkins?.forEach(ticket => {
      if (ticket.used_at) {
        const hour = new Date(ticket.used_at).getHours();
        const key = `${hour}:00`;
        hourlyCheckins[key] = (hourlyCheckins[key] || 0) + 1;
      }
    });

    // Get ticket type breakdown
    const { data: ticketTypes } = await supabaseAdmin
      .from('tickets')
      .select('ticket_type, is_used')
      .eq('event_id', eventId);

    const typeBreakdown: Record<string, { total: number; checkedIn: number }> = {};
    ticketTypes?.forEach(ticket => {
      const type = ticket.ticket_type || 'General';
      if (!typeBreakdown[type]) {
        typeBreakdown[type] = { total: 0, checkedIn: 0 };
      }
      typeBreakdown[type].total += 1;
      if (ticket.is_used) {
        typeBreakdown[type].checkedIn += 1;
      }
    });

    return NextResponse.json({
      eventId,
      eventTitle: access.event.title,
      stats: {
        totalTickets: (totalTickets || 0) + ((guestTotalError?.code === 'PGRST205' ? 0 : guestTotal) || 0),
        checkedIn: (checkedIn || 0) + ((guestCheckedInError?.code === 'PGRST205' ? 0 : guestCheckedIn) || 0),
        notCheckedIn: ((totalTickets || 0) + ((guestTotalError?.code === 'PGRST205' ? 0 : guestTotal) || 0)) - ((checkedIn || 0) + ((guestCheckedInError?.code === 'PGRST205' ? 0 : guestCheckedIn) || 0)),
        attendanceRate: ((totalTickets || 0) + ((guestTotalError?.code === 'PGRST205' ? 0 : guestTotal) || 0))
          ? Math.round(((checkedIn || 0) + ((guestCheckedInError?.code === 'PGRST205' ? 0 : guestCheckedIn) || 0)) / ((totalTickets || 0) + ((guestTotalError?.code === 'PGRST205' ? 0 : guestTotal) || 0)) * 100)
          : 0,
        paidTickets: totalTickets || 0,
        guestPasses: (guestTotalError?.code === 'PGRST205' ? 0 : guestTotal) || 0,
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
