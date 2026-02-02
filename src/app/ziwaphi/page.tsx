import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { EventsGrid } from '@/components/events/events-grid'
import { EventsFilter } from '@/components/events/events-filter'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Ziwaphi? | Find Events | Ziyawa',
  description: 'Discover upcoming events across South Africa. Filter by location and date.',
}

interface ZiwaphiPageProps {
  searchParams: Promise<{
    location?: string
    date?: string
  }>
}

export default async function ZiwaphiPage({ searchParams }: ZiwaphiPageProps) {
  const params = await searchParams
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">
          Ziwaphi? <span className="text-muted-foreground text-2xl">(Where is it going down?)</span>
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Find upcoming events across South Africa. Whether it&apos;s Amapiano Sunday sessions, 
          festivals, or intimate concerts – we&apos;ve got you covered.
        </p>
      </div>

      {/* Filters */}
      <EventsFilter 
        currentLocation={params.location} 
        currentDate={params.date} 
      />

      {/* Events Grid */}
      <Suspense fallback={<EventsGridSkeleton />}>
        <EventsContent 
          location={params.location} 
          date={params.date} 
        />
      </Suspense>
    </div>
  )
}

async function EventsContent({ 
  location, 
  date 
}: { 
  location?: string
  date?: string 
}) {
  const supabase = await createClient()

  // Build query for published events (using new state machine)
  let query = supabase
    .from('events')
    .select(`
      *,
      profiles:organizer_id (
        id,
        full_name,
        avatar_url
      )
    `)
    .in('state', ['published', 'locked']) // Show published and locked events
    .gte('event_date', new Date().toISOString().split('T')[0]) // Only future events
    .order('event_date', { ascending: true })

  // Apply location filter
  if (location && location !== 'all') {
    query = query.eq('location', location)
  }

  // Apply date filter
  if (date) {
    query = query.eq('event_date', date)
  }

  const { data: events, error } = await query

  if (error) {
    console.error('Error fetching events:', error)
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load events. Please try again.</p>
      </div>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-2xl mb-2">🎭</p>
        <p className="text-muted-foreground">No events found. Check back soon!</p>
        <p className="text-sm text-muted-foreground mt-2">
          Are you an organizer? <a href="/dashboard/organizer/events/new" className="text-primary hover:underline">Create your first event</a>
        </p>
      </div>
    )
  }

  return <EventsGrid events={events} />
}

function EventsGridSkeleton() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  )
}
