'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { MapPin, Music, ArrowLeft, Calendar, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'
import { PROVINCES } from '@/lib/constants'
import { useAuth } from '@/components/providers/auth-provider'
import type { Artist, Profile } from '@/types/database'

interface ArtistWithProfile extends Artist {
  profiles: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>
}

interface ArtistProfileProps {
  artist: ArtistWithProfile
}

export function ArtistProfile({ artist }: ArtistProfileProps) {
  const { profile } = useAuth()
  const isOrganizer = profile?.is_organizer || profile?.is_admin

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <Link href="/artists" className="inline-flex items-center text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Artists
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Profile Image */}
            <div className="relative w-32 h-32 sm:w-40 sm:h-40">
              {artist.profile_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artist.profile_image}
                  alt={artist.stage_name}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <Avatar className="w-full h-full">
                  <AvatarImage src={artist.profiles.avatar_url || undefined} />
                  <AvatarFallback className="text-4xl">
                    {artist.stage_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}
              
              {/* Availability Badge */}
              <Badge 
                className="absolute -bottom-2 left-1/2 -translate-x-1/2"
                variant={artist.is_available ? 'default' : 'secondary'}
              >
                {artist.is_available ? 'Available' : 'Unavailable'}
              </Badge>
            </div>

            {/* Info */}
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-3xl font-bold mb-2">{artist.stage_name}</h1>
              <p className="text-muted-foreground mb-4">{artist.profiles.full_name}</p>
              
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <Badge variant="secondary" className="gap-1">
                  <Music className="h-3 w-3" />
                  {artist.genre}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {PROVINCES[artist.location as keyof typeof PROVINCES]}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Bio */}
          <div>
            <h2 className="text-xl font-semibold mb-3">About</h2>
            {artist.bio ? (
              <p className="text-muted-foreground whitespace-pre-wrap">{artist.bio}</p>
            ) : (
              <p className="text-muted-foreground italic">No bio available.</p>
            )}
          </div>

          {/* Stats Placeholder */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">Events</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Music className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{artist.genre}</p>
                <p className="text-sm text-muted-foreground">Genre</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <DollarSign className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{formatCurrency(artist.base_price)}</p>
                <p className="text-sm text-muted-foreground">Base Price</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar - Booking Card */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Book This Artist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Starting from</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(artist.base_price)}
                </p>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Genre</span>
                  <span>{artist.genre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span>{PROVINCES[artist.location as keyof typeof PROVINCES]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={artist.is_available ? 'text-green-600' : 'text-red-500'}>
                    {artist.is_available ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>

              <Separator />

              {isOrganizer ? (
                <Link href={`/dashboard/organizer/book?artist=${artist.id}`}>
                  <Button className="w-full" size="lg" disabled={!artist.is_available}>
                    {artist.is_available ? 'Request Booking' : 'Not Available'}
                  </Button>
                </Link>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Only event organizers can book artists
                  </p>
                  <Link href="/profile">
                    <Button variant="outline" className="w-full">
                      Become an Organizer
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
