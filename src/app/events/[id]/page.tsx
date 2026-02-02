import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EventDetails } from '@/components/events/event-details'

interface EventPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: EventPageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: event } = await supabase
    .from('events')
    .select('title, description')
    .eq('id', id)
    .single()

  if (!event) {
    return { title: 'Event Not Found | Ziyawa' }
  }

  const eventData = event as { title: string; description: string | null }

  return {
    title: `${eventData.title} | Ziyawa`,
    description: eventData.description || `Get tickets for ${eventData.title}`,
  }
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch event with organizer info
  const { data: event, error } = await supabase
    .from('events')
    .select(`
      *,
      profiles:organizer_id (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('id', id)
    .single()

  if (error || !event) {
    notFound()
  }

  // Fetch booked artists for this event
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      artists (
        id,
        stage_name,
        genre,
        profile_image
      )
    `)
    .eq('event_id', id)
    .in('status', ['accepted', 'paid', 'completed'])

  return (
    <div className="container mx-auto px-4 py-8">
      <EventDetails event={event} bookings={bookings || []} />
    </div>
  )
}
