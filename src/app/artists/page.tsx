import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArtistsGrid } from '@/components/artists/artists-grid'
import { ArtistsFilter } from '@/components/artists/artists-filter'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Artist Directory | Ziyawa',
  description: 'Browse talented artists across South Africa. Find the perfect act for your event.',
  robots: { index: false, follow: false },
}

interface ArtistsPageProps {
  searchParams: Promise<{
    genre?: string
    location?: string
  }>
}

export default async function ArtistsPage({ searchParams }: ArtistsPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let allowed = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_organizer, is_artist, is_admin')
      .eq('id', user.id)
      .single()
    allowed = Boolean(profile?.is_organizer || profile?.is_artist || profile?.is_admin)
  }

  if (!allowed) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-lg">
        <p className="text-3xl mb-2">🎤</p>
        <h1 className="text-2xl font-bold mb-2">Artist Directory</h1>
        <p className="text-muted-foreground mb-6">
          This directory is for event organizers sourcing talent, and for artists browsing each other. Looking for something to attend instead?
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/ziwaphi">
            <Button size="lg">Find Events on Ziwaphi</Button>
          </Link>
          {!user && (
            <Link href="/auth/signin">
              <Button size="lg" variant="outline">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Artist Directory</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Discover talented artists from across South Africa. From Amapiano DJs to soulful vocalists – 
          find the perfect act for your event.
        </p>
      </div>

      {/* Filters */}
      <ArtistsFilter 
        currentGenre={params.genre} 
        currentLocation={params.location} 
      />

      {/* Artists Grid */}
      <Suspense fallback={<ArtistsGridSkeleton />}>
        <ArtistsContent 
          genre={params.genre} 
          location={params.location} 
        />
      </Suspense>
    </div>
  )
}

async function ArtistsContent({ 
  genre, 
  location 
}: { 
  genre?: string
  location?: string 
}) {
  const supabase = await createClient()

  // Identity only. `email` used to be selected here and was never rendered —
  // a directory listing has no reason to carry anyone's email address.
  const selectClause = `
    *,
    profiles:profile_id (
      id,
      full_name,
      avatar_url
    )
  `

  const applyFilters = <T,>(queryBuilder: T) => {
    // Keep this loosely typed to support both primary and fallback Supabase builders.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let scoped = queryBuilder as any
    if (genre && genre !== 'all') scoped = scoped.eq('genre', genre)
    if (location && location !== 'all') scoped = scoped.eq('location', location)
    return scoped
  }

  const primaryQuery = applyFilters(
    supabase
      .from('artists')
      .select(selectClause)
      .eq('is_public', true)
      .eq('is_available', true)
      .order('stage_name', { ascending: true })
  )

  let { data: artists, error } = await primaryQuery

  // Graceful fallback when migration adding artists.is_public hasn't run yet.
  if (error && String(error.message || '').toLowerCase().includes('is_public')) {
    const fallbackQuery = applyFilters(
      supabase
        .from('artists')
        .select(selectClause)
        .eq('is_available', true)
        .order('stage_name', { ascending: true })
    )

    const fallback = await fallbackQuery
    artists = fallback.data
    error = fallback.error
  }

  if (error) {
    // Final fallback for older policy/schema combinations where join-based reads can fail.
    // Keep enforcing visibility when the column exists.
    const minimalWithVisibility = await supabase
      .from('artists')
      .select('id, stage_name, bio, genre, base_price, location, is_available, is_public, profile_image')
      .eq('is_available', true)
      .eq('is_public', true)
      .order('stage_name', { ascending: true })

    if (!minimalWithVisibility.error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      artists = (minimalWithVisibility.data || []) as any
      error = null
    } else if (String(minimalWithVisibility.error.message || '').toLowerCase().includes('is_public')) {
      // Only drop visibility filter on legacy schemas that truly lack is_public.
      const minimalLegacy = await supabase
        .from('artists')
        .select('id, stage_name, bio, genre, base_price, location, is_available, profile_image')
        .eq('is_available', true)
        .order('stage_name', { ascending: true })

      if (!minimalLegacy.error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        artists = (minimalLegacy.data || []) as any
        error = null
      }
    }
  }

  if (error) {
    console.error('Error fetching artists:', error)
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load artists. Please try again.</p>
      </div>
    )
  }

  if (!artists || artists.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-2xl mb-2">🎤</p>
        <p className="text-muted-foreground">No artists found matching your criteria.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Are you an artist? <a href="/dashboard/artist" className="text-primary hover:underline">Create your profile</a>
        </p>
      </div>
    )
  }

  return <ArtistsGrid artists={artists} />
}

function ArtistsGridSkeleton() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  )
}
