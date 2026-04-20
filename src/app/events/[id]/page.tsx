import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EventDetails } from '@/components/events/event-details'
import { EventReviewsSection } from '@/components/events/event-reviews-section'
import { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ziyawa.co.za'

interface EventPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: event } = await supabase
    .from('events')
    .select('title, description, cover_image, event_date, venue, location, ticket_price')
    .eq('id', id)
    .single()

  if (!event) {
    return { title: 'Event Not Found' }
  }

  const e = event as {
    title: string
    description: string | null
    cover_image: string | null
    event_date: string
    venue: string
    location: string
    ticket_price: number | null
  }

  const desc = e.description || `Get tickets for ${e.title} at ${e.venue}, ${e.location}`
  const images = e.cover_image ? [{ url: e.cover_image, width: 1200, height: 630, alt: e.title }] : []

  return {
    title: e.title,
    description: desc,
    openGraph: {
      title: e.title,
      description: desc,
      type: 'website',
      url: `${siteUrl}/events/${id}`,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: e.title,
      description: desc,
      images: e.cover_image ? [e.cover_image] : [],
    },
    alternates: {
      canonical: `${siteUrl}/events/${id}`,
    },
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
        verified_at
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Event fetch error:', error)
  }

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

  // Fetch ticket tiers / releases
  const { data: ticketTiers, error: ticketTierError } = await supabase
    .from('event_ticket_types')
    .select('*')
    .eq('event_id', id)
    .order('sort_order', { ascending: true })

  if (ticketTierError && ticketTierError.code !== 'PGRST205') {
    console.error('Ticket tiers fetch error:', ticketTierError)
  }

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

  // JSON-LD structured data for event
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description || '',
    startDate: event.event_date,
    ...(event.end_date && { endDate: event.end_date }),
    location: {
      '@type': 'Place',
      name: event.venue,
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.location,
        addressCountry: 'ZA',
      },
    },
    ...(event.cover_image && { image: event.cover_image }),
    organizer: {
      '@type': 'Organization',
      name: (event.profiles as { full_name: string })?.full_name || 'Organizer',
    },
    ...(event.ticket_price != null && {
      offers: {
        '@type': 'Offer',
        priceCurrency: 'ZAR',
        price: (event.ticket_price / 100).toFixed(2),
        availability: event.state === 'published' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
        url: `${siteUrl}/events/${id}`,
      },
    }),
    eventStatus: event.state === 'cancelled'
      ? 'https://schema.org/EventCancelled'
      : 'https://schema.org/EventScheduled',
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <EventDetails 
        event={event} 
        bookings={bookings || []} 
        media={eventMedia || []} 
        organizerStats={organizerStats}
        ticketTiers={ticketTiers || []}
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
