import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EventDetails } from '@/components/events/event-details'
import { EventReviewsSection } from '@/components/events/event-reviews-section'

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

  // Fetch event with organizer info (including more profile fields)
  const { data: event, error } = await supabase
    .from('events')
    .select(`
      *,
      profiles:organizer_id (
        id,
        full_name,
        avatar_url,
        company_name,
        location,
        bio,
        verified_at
      )
    `)
    .eq('id', id)
    .single()

  if (error || !event) {
    notFound()
  }

  // Fetch organizer stats
  const organizerId = event.organizer_id
  
  // Count total events by this organizer
  const { count: totalEvents } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('organizer_id', organizerId)
    .in('state', ['published', 'locked', 'completed'])

  // Count upcoming events
  const { count: upcomingEvents } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('organizer_id', organizerId)
    .in('state', ['published', 'locked'])
    .gte('event_date', new Date().toISOString().split('T')[0])

  // Get organizer's event rating summary (aggregate from all their events)
  const { data: ratingData } = await supabase
    .from('event_rating_summaries')
    .select('average_rating, total_reviews, event_id')
    .in('event_id', (
      await supabase
        .from('events')
        .select('id')
        .eq('organizer_id', organizerId)
    ).data?.map(e => e.id) || [])

  // Calculate average rating across all events
  let totalReviews = 0
  let weightedRating = 0
  ratingData?.forEach(r => {
    totalReviews += r.total_reviews
    weightedRating += r.average_rating * r.total_reviews
  })
  const averageRating = totalReviews > 0 ? weightedRating / totalReviews : 0

  const organizerStats = {
    totalEvents: totalEvents || 0,
    upcomingEvents: upcomingEvents || 0,
    rating: averageRating,
    totalReviews: totalReviews
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

  // Fetch event media (gallery and promo videos)
  const { data: eventMedia } = await supabase
    .from('event_media')
    .select('*')
    .eq('event_id', id)
    .order('display_order')

  // Check if current user has a ticket for this event
  const { data: { user } } = await supabase.auth.getUser()
  let hasTicket = false
  
  if (user) {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .in('status', ['confirmed', 'checked_in'])
      .single()
    
    hasTicket = !!ticket
  }

  // Check if event has ended
  const eventEnded = new Date(event.end_date || event.event_date) < new Date()

  return (
    <div className="container mx-auto px-4 py-8">
      <EventDetails 
        event={event} 
        bookings={bookings || []} 
        media={eventMedia || []} 
        organizerStats={organizerStats}
      />
      
      {/* Reviews Section */}
      <div className="max-w-4xl mx-auto mt-12">
        <EventReviewsSection
          eventId={id}
          eventTitle={event.title}
          organizerId={event.organizer_id}
          canReview={hasTicket && eventEnded}
        />
      </div>
    </div>
  )
}
