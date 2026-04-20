import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getEventRoleLabel } from '@/lib/event-team'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: members, error: membersError } = await supabaseAdmin
      .from('event_team_members')
      .select('id, event_id, role, status, expires_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (membersError) {
      if (membersError.code === 'PGRST205' || membersError.code === '42P01') {
        return NextResponse.json({ assignments: [] })
      }
      throw membersError
    }

    const eventIds = Array.from(new Set((members || []).map((member) => member.event_id).filter(Boolean)))
    if (eventIds.length === 0) {
      return NextResponse.json({ assignments: [] })
    }

    const { data: events } = await supabaseAdmin
      .from('events')
      .select('id, title, event_date, start_time, venue, organizer_id')
      .in('id', eventIds)

    const organizerIds = Array.from(new Set((events || []).map((event) => event.organizer_id).filter(Boolean)))
    const { data: organizers } = organizerIds.length > 0
      ? await supabaseAdmin.from('profiles').select('id, full_name').in('id', organizerIds)
      : { data: [] }

    const eventsById = new Map((events || []).map((event) => [event.id, event]))
    const organizersById = new Map((organizers || []).map((organizer) => [organizer.id, organizer]))

    const assignments = (members || []).map((member) => {
      const event = eventsById.get(member.event_id)
      const organizer = event ? organizersById.get(event.organizer_id) : null
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const eventDate = event?.event_date ? new Date(event.event_date) : null
      if (eventDate) eventDate.setHours(0, 0, 0, 0)

      return {
        id: member.id,
        eventId: member.event_id,
        role: member.role,
        roleLabel: getEventRoleLabel(member.role),
        status: member.status,
        expiresAt: member.expires_at,
        assignedAt: member.created_at,
        isPast: Boolean(eventDate && eventDate < today),
        event: event ? {
          id: event.id,
          title: event.title,
          eventDate: event.event_date,
          startTime: event.start_time,
          venue: event.venue,
        } : null,
        organizerName: organizer?.full_name || 'Organizer',
        organizerId: event?.organizer_id || null,
      }
    }).filter((assignment) => assignment.event)

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error('Event work load error:', error)
    return NextResponse.json({ error: 'Failed to load event work' }, { status: 500 })
  }
}
