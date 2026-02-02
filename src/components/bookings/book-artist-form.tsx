'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Loader2, Music, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/helpers'
import { PROVINCES } from '@/lib/constants'
import { toast } from 'sonner'
import type { Event, Artist, Profile } from '@/types/database'

interface ArtistWithProfile extends Artist {
  profiles: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

interface BookArtistFormProps {
  event: Event
  artists: ArtistWithProfile[]
  bookedArtistIds: string[]
}

export function BookArtistForm({ event, artists, bookedArtistIds }: BookArtistFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedArtistId, setSelectedArtistId] = useState('')
  const [offeredAmount, setOfferedAmount] = useState('')
  const [notes, setNotes] = useState('')

  const selectedArtist = artists.find(a => a.id === selectedArtistId)
  const availableArtists = artists.filter(a => !bookedArtistIds.includes(a.id))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedArtistId) {
      toast.error('Please select an artist')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('bookings')
        .insert({
          event_id: event.id,
          artist_id: selectedArtistId,
          organizer_id: event.organizer_id,
          offered_amount: parseFloat(offeredAmount) || selectedArtist?.base_price || 0,
          organizer_notes: notes || null,
          status: 'pending',
        })

      if (error) throw error

      toast.success('Booking request sent! The artist will be notified.')
      router.push('/dashboard/organizer')
      
    } catch (error) {
      console.error('Error creating booking:', error)
      toast.error('Failed to send booking request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Link href="/dashboard/organizer" className="inline-flex items-center text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Link>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Book Artist for Event</CardTitle>
          <CardDescription>
            <strong>{event.title}</strong> • {formatDate(event.event_date)}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Artist Selection */}
            <div>
              <Label htmlFor="artist">Select Artist *</Label>
              <Select
                value={selectedArtistId}
                onValueChange={setSelectedArtistId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an artist" />
                </SelectTrigger>
                <SelectContent>
                  {availableArtists.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No available artists
                    </SelectItem>
                  ) : (
                    availableArtists.map((artist) => (
                      <SelectItem key={artist.id} value={artist.id}>
                        {artist.stage_name} • {artist.genre} • From {formatCurrency(artist.base_price)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Artist Preview */}
            {selectedArtist && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedArtist.profile_image || selectedArtist.profiles.avatar_url || undefined} />
                      <AvatarFallback className="text-xl">
                        {selectedArtist.stage_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{selectedArtist.stage_name}</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="secondary" className="gap-1">
                          <Music className="h-3 w-3" />
                          {selectedArtist.genre}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <MapPin className="h-3 w-3" />
                          {PROVINCES[selectedArtist.location as keyof typeof PROVINCES]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Base price: {formatCurrency(selectedArtist.base_price)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Offered Amount */}
            <div>
              <Label htmlFor="amount">Your Offer (ZAR) *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder={selectedArtist ? `Suggested: ${selectedArtist.base_price}` : 'Enter amount'}
                value={offeredAmount}
                onChange={(e) => setOfferedAmount(e.target.value)}
                required
              />
              {selectedArtist && parseFloat(offeredAmount) < selectedArtist.base_price && offeredAmount && (
                <p className="text-sm text-yellow-600 mt-1">
                  Your offer is below the artist&apos;s base price of {formatCurrency(selectedArtist.base_price)}
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes for Artist</Label>
              <textarea
                id="notes"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Set times, equipment requirements, special requests..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Button 
                type="submit" 
                disabled={loading || !selectedArtistId} 
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Request...
                  </>
                ) : (
                  'Send Booking Request'
                )}
              </Button>
              <Link href="/dashboard/organizer">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
