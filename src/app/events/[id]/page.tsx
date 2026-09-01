import { cache } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EventDetails } from '@/components/events/event-details'
import { EventReviewsSection } from '@/components/events/event-reviews-section'
import { Metadata } from 'next'
import { SITE_URL } from '@/lib/constants'

const siteUrl = SITE_URL

interface EventPageProps {
  params: Promise<{
    id: string
  }>
}

// generateMetadata and the page component both need the event row. Next dedupes
// native fetch() but not Supabase calls, so without this the same row was read
// twice per page view — two round trips to Ireland for identical data.
const getEvent = cache(async (id: string) => {
  const supabase = await createClient()
  return supabase.from('events').select('*').eq('id', id).single()
})

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { id } = await params

  const { data: event } = await getEvent(id)

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

  // ── Wave 1: everything that needs only the route param ───────────────────
  // These were sequential awaits. Nothing among them depends on another's
  // result, so each one was pure waiting — a separate round trip from the
  // Vercel function to the database for data that could have been asked for
  // at the same time.
  const [
    { data: eventRow, error },
    { data: bookings },
    { data: eventMedia },
    { data: ticketTiers, error: ticketTierError },
    { data: { user } },
  ] = await Promise.all([
    getEvent(id),
    supabase
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
      .in('status', ['accepted', 'paid', 'completed']),
    supabase
      .from('event_media')
      .select('*')
      .eq('event_id', id)
      .order('display_order'),
    supabase
      .from('event_ticket_types')
      .select('*')
      .eq('event_id', id)
      .order('sort_order', { ascending: true }),
    supabase.auth.getUser(),
  ])

  if (error) {
    console.error('Event fetch error:', error)
  }

  if (error || !eventRow) {
    notFound()
  }

  if (ticketTierError && ticketTierError.code !== 'PGRST205') {
    console.error('Ticket tiers fetch error:', ticketTierError)
  }

  const organizerId = eventRow.organizer_id

  // ── Wave 2: needs organizerId from the event, or the signed-in user ──────
  const [
    { data: organizer },
    { count: totalEvents },
    { count: upcomingEvents },
    { data: ratingData },
    { data: ticket },
  ] = await Promise.all([
    // Organizer details come from the public projection rather than an embed.
    // This page is served to logged-out visitors, and an embedded
    // `profiles:organizer_id` join reads the profiles table itself — which
    // carries email, phone, balances and admin flags. PostgREST cannot embed a
    // view through a foreign key, so this is a separate read by design.
    supabase
      .from('v_public_organizers')
      .select('id, full_name, avatar_url, company_name, location, verified_at')
      .eq('id', organizerId)
      .maybeSingle(),
    supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('organizer_id', organizerId)
      .in('state', ['published', 'locked', 'completed']),
    supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('organizer_id', organizerId)
      .in('state', ['published', 'locked'])
      .gte('event_date', new Date().toISOString().split('T')[0]),
    // One round trip, not two. This previously nested an `await` inside its own
    // `.in()` argument to collect the organizer's event ids, then filtered by
    // that list — a join done in application code. event_rating_summaries has a
    // foreign key to events, so the join belongs in the query.
    supabase
      .from('event_rating_summaries')
      .select('average_rating, total_reviews, events!inner(organizer_id)')
      .eq('events.organizer_id', organizerId),
    user
      ? supabase
          .from('tickets')
          .select('id')
          .eq('event_id', id)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null as { id: string } | null }),
  ])

  const event = { ...eventRow, profiles: organizer ?? null }
  const hasTicket = Boolean(ticket)

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

  // Check if event has ended using the event date that exists in the live schema
  const eventDateValue = event.event_date ? new Date(`${event.event_date}T23:59:59`) : null
  const eventEnded = eventDateValue ? eventDateValue < new Date() : false

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
      <div id="reviews" className="max-w-4xl mx-auto mt-12 scroll-mt-24">
        <EventReviewsSection
          eventId={id}
          eventTitle={event.title}
          organizerId={event.organizer_id}
          isLoggedIn={Boolean(user)}
          hasTicket={hasTicket}
          eventEnded={eventEnded}
        />
      </div>
    </div>
  )
}
