import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArtistProfileEnhanced } from '@/components/artists/artist-profile-enhanced'
import { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ziyawa.co.za'

interface ArtistPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: ArtistPageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: artist } = await supabase
    .from('artists')
    .select('stage_name, bio, genre, profile_image')
    .eq('id', id)
    .single()

  if (!artist) {
    return { title: 'Artist Not Found' }
  }

  const a = artist as { stage_name: string; bio: string | null; genre: string; profile_image: string | null }
  const desc = a.bio || `${a.stage_name} — ${a.genre} artist on Ziyawa`
  const images = a.profile_image ? [{ url: a.profile_image, width: 600, height: 600, alt: a.stage_name }] : []

  return {
    title: a.stage_name,
    description: desc,
    openGraph: {
      title: `${a.stage_name} — ${a.genre}`,
      description: desc,
      type: 'profile',
      url: `${siteUrl}/artists/${id}`,
      images,
    },
    twitter: {
      card: 'summary',
      title: a.stage_name,
      description: desc,
      images: a.profile_image ? [a.profile_image] : [],
    },
    alternates: {
      canonical: `${siteUrl}/artists/${id}`,
    },
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
        avatar_url,
        is_verified,
        verified_entity_type
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

  // JSON-LD for artist
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: artist.stage_name,
    description: artist.bio || '',
    ...(artist.profile_image && { image: artist.profile_image }),
    url: `${siteUrl}/artists/${id}`,
    knowsAbout: artist.genre,
  }

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
