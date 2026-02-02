import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BookArtistForm } from '@/components/bookings/book-artist-form'

interface BookArtistPageProps {
  params: Promise<{
    id: string
  }>
}

export const metadata = {
  title: 'Book Artist | Ziyawa',
  description: 'Book an artist for your event',
}

export default async function BookArtistPage({ params }: BookArtistPageProps) {
  const { id: eventId } = await params
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/signin')
  }

  // Fetch the event
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('organizer_id', user.id)
    .single()

  if (error || !event) {
    notFound()
  }

  // Fetch available artists
  const { data: artists } = await supabase
    .from('artists')
    .select(`
      *,
      profiles:profile_id (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('is_available', true)
    .order('stage_name', { ascending: true })

  // Fetch existing bookings for this event
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('artist_id')
    .eq('event_id', eventId)

  const bookedArtistIds = existingBookings?.map(b => b.artist_id) || []

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <BookArtistForm 
        event={event} 
        artists={artists || []} 
        bookedArtistIds={bookedArtistIds}
      />
    </div>
  )
}
