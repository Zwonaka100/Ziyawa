'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Calendar, MapPin, Clock, Users, Ticket, Music, ArrowLeft } from 'lucide-react'
import { formatCurrency, formatDate, formatTime, getDaysUntilEvent, isEventPast } from '@/lib/helpers'
import { PROVINCES } from '@/lib/constants'
import { useAuth } from '@/components/providers/auth-provider'
import { PaymentDialog } from '@/components/payments/payment-dialog'
import type { Event, Profile, Artist, Booking } from '@/types/database'

interface EventWithOrganizer extends Event {
  profiles: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

interface BookingWithArtist extends Booking {
  artists: Pick<Artist, 'id' | 'stage_name' | 'genre' | 'profile_image'>
}

interface EventDetailsProps {
  event: EventWithOrganizer
  bookings: BookingWithArtist[]
}

export function EventDetails({ event, bookings }: EventDetailsProps) {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [showPayment, setShowPayment] = useState(false)

  const daysUntil = getDaysUntilEvent(event.event_date)
  const ticketsRemaining = event.capacity - event.tickets_sold
  const isSoldOut = ticketsRemaining <= 0
  const isPast = isEventPast(event.event_date)

  const handleBuyTicket = () => {
    if (!user) {
      router.push('/auth/signin')
      return
    }
    setShowPayment(true)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <Link href="/ziwaphi" className="inline-flex items-center text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Events
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cover Image */}
          <div className="relative h-64 md:h-80 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg overflow-hidden">
            {event.cover_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.cover_image}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Calendar className="h-16 w-16 text-primary/40" />
              </div>
            )}
            
            {/* Status Badge */}
            {isPast ? (
              <Badge className="absolute top-4 left-4" variant="secondary">
                Event Ended
              </Badge>
            ) : (
              <Badge className="absolute top-4 left-4" variant="secondary">
                {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
              </Badge>
            )}
          </div>

          {/* Event Title & Info */}
          <div>
            <h1 className="text-3xl font-bold mb-4">{event.title}</h1>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Calendar className="h-5 w-5" />
                <span>{formatDate(event.event_date)}</span>
              </div>
              
              <div className="flex items-center gap-3 text-muted-foreground">
                <Clock className="h-5 w-5" />
                <span>
                  {formatTime(event.start_time)}
                  {event.end_time && ` - ${formatTime(event.end_time)}`}
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="h-5 w-5" />
                <span>{event.venue}</span>
              </div>
              
              <div className="flex items-center gap-3 text-muted-foreground">
                <Users className="h-5 w-5" />
                <span>
                  {PROVINCES[event.location as keyof typeof PROVINCES]}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Description */}
          {event.description && (
            <div>
              <h2 className="text-xl font-semibold mb-3">About This Event</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Lineup */}
          {bookings.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Lineup</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {bookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={booking.artists.profile_image || undefined} />
                        <AvatarFallback>
                          {booking.artists.stage_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{booking.artists.stage_name}</p>
                        <p className="text-sm text-muted-foreground">{booking.artists.genre}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Organizer */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Hosted By</h2>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={event.profiles.avatar_url || undefined} />
                <AvatarFallback>
                  {event.profiles.full_name?.charAt(0) || 'O'}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{event.profiles.full_name || 'Event Organizer'}</span>
            </div>
          </div>
        </div>

        {/* Sidebar - Ticket Card */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Get Tickets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {event.ticket_price === 0 ? 'Free' : formatCurrency(event.ticket_price)}
                </p>
                <p className="text-sm text-muted-foreground">per ticket</p>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capacity</span>
                  <span>{event.capacity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sold</span>
                  <span>{event.tickets_sold}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Available</span>
                  <span className={ticketsRemaining <= 20 ? 'text-red-500' : ''}>
                    {ticketsRemaining}
                  </span>
                </div>
              </div>

              <Separator />

              <Button 
                className="w-full" 
                size="lg"
                disabled={isSoldOut || isPast}
                onClick={handleBuyTicket}
              >
                {isPast ? 'Event Ended' : isSoldOut ? 'Sold Out' : 'Buy Ticket'}
              </Button>

              {!user && (
                <p className="text-xs text-center text-muted-foreground">
                  You&apos;ll need to sign in to purchase tickets
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Dialog */}
      {user && profile && (
        <PaymentDialog
          open={showPayment}
          onOpenChange={setShowPayment}
          event={event}
          user={profile}
        />
      )}
    </div>
  )
}
