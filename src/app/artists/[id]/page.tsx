import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArtistProfileEnhanced } from '@/components/artists/artist-profile-enhanced'

interface ArtistPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: ArtistPageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: artist } = await supabase
    .from('artists')
    .select('stage_name, bio, genre')
    .eq('id', id)
    .single()

  if (!artist) {
    return { title: 'Artist Not Found | Ziyawa' }
  }

  const artistData = artist as { stage_name: string; bio: string | null; genre: string }

  return {
    title: `${artistData.stage_name} | Ziyawa`,
    description: artistData.bio || `${artistData.stage_name} - ${artistData.genre} artist on Ziyawa`,
  }
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch artist with profile info
  const { data: artist, error } = await supabase
    .from('artists')
    .select(`
      *,
      profiles:profile_id (
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('id', id)
    .single()

  if (error || !artist) {
    notFound()
  }

  // Fetch social links
  const { data: socialLinks } = await supabase
    .from('artist_social_links')
    .select('*')
    .eq('artist_id', id)
    .order('display_order')

  // Fetch media
  const { data: media } = await supabase
    .from('artist_media')
    .select('*')
    .eq('artist_id', id)
    .order('display_order')

  // Fetch portfolio
  const { data: portfolio } = await supabase
    .from('artist_portfolio')
    .select('*')
    .eq('artist_id', id)
    .order('event_date', { ascending: false })

  // Fetch discography
  const { data: discography } = await supabase
    .from('artist_discography')
    .select('*')
    .eq('artist_id', id)
    .order('release_date', { ascending: false })

  // Fetch reviews
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      *,
      reviewer:reviewer_id (
        full_name,
        avatar_url
      )
    `)
    .eq('reviewee_type', 'artist')
    .eq('reviewee_id', id)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  // Fetch upcoming events (where artist is booked)
  const { data: upcomingBookings } = await supabase
    .from('bookings')
    .select(`
      *,
      events:event_id (
        id,
        title,
        venue,
        event_date,
        cover_image
      )
    `)
    .eq('artist_id', id)
    .eq('state', 'confirmed')
    .gte('events.event_date', new Date().toISOString().split('T')[0])
    .order('events.event_date')

  return (
    <div className="min-h-screen bg-white">
      <ArtistProfileEnhanced 
        artist={artist} 
        socialLinks={socialLinks || []}
        media={media || []}
        portfolio={portfolio || []}
        discography={discography || []}
        reviews={reviews || []}
        upcomingBookings={upcomingBookings || []}
      />
    </div>
  )
}
