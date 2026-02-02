import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArtistProfile } from '@/components/artists/artist-profile'

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

  return (
    <div className="container mx-auto px-4 py-8">
      <ArtistProfile artist={artist} />
    </div>
  )
}
