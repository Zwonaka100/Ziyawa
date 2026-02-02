import Link from 'next/link'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MapPin, Music } from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'
import { PROVINCES } from '@/lib/constants'
import type { Artist, Profile, SaProvince } from '@/types/database'

interface ArtistWithProfile {
  id: string
  stage_name: string
  bio?: string | null
  genre: string
  base_price: number
  location: SaProvince | string
  is_available: boolean
  profile_image?: string | null
  profiles?: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'> | null
}

interface ArtistsGridProps {
  artists: ArtistWithProfile[]
}

export function ArtistsGrid({ artists }: ArtistsGridProps) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {artists.map((artist) => (
        <ArtistCard key={artist.id} artist={artist} />
      ))}
    </div>
  )
}

function ArtistCard({ artist }: { artist: ArtistWithProfile }) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Profile Image */}
      <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
        {artist.profile_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artist.profile_image}
            alt={artist.stage_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Avatar className="h-24 w-24">
            <AvatarImage src={artist.profiles?.avatar_url || undefined} />
            <AvatarFallback className="text-3xl">
              {artist.stage_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}
        
        {/* Genre Badge */}
        <Badge className="absolute top-3 left-3" variant="secondary">
          {artist.genre}
        </Badge>
      </div>

      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-1">{artist.stage_name}</h3>
        
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{PROVINCES[artist.location as keyof typeof PROVINCES]}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            <span>From {formatCurrency(artist.base_price)}</span>
          </div>
        </div>

        {artist.bio && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
            {artist.bio}
          </p>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Link href={`/artists/${artist.id}`} className="w-full">
          <Button variant="outline" className="w-full">
            View Profile
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
