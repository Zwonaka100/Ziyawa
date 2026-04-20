'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Calendar, MapPin, Clock, Users, Ticket, ArrowLeft, Play, ImageIcon, Star, CheckCircle, Flag } from 'lucide-react'
import { formatCurrency, formatDate, formatTime, getDaysUntilEvent, isEventPast } from '@/lib/helpers'
import { PROVINCES } from '@/lib/constants'
import { useAuth } from '@/components/providers/auth-provider'
import { PaymentDialog } from '@/components/payments/payment-dialog'
import { ReportDialog } from '@/components/report-dialog'
import { extractYouTubeId, getYouTubeThumbnail } from '@/types/database'
import type { Event, Profile, Artist, Booking, EventMedia } from '@/types/database'
import { buildFallbackTier, isTierOnSale, type EventTicketTier } from '@/lib/ticketing'

interface EventWithOrganizer extends Event {
  profiles: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'company_name' | 'location' | 'bio' | 'verified_at'>
}

interface OrganizerStats {
  totalEvents: number;
  upcomingEvents: number;
  rating: number;
  totalReviews: number;
}

interface BookingWithArtist extends Booking {
  artists: Pick<Artist, 'id' | 'stage_name' | 'genre' | 'profile_image'>
}

interface EventDetailsProps {
  event: EventWithOrganizer
  bookings: BookingWithArtist[]
  media?: EventMedia[]
  organizerStats?: OrganizerStats
  ticketTiers?: EventTicketTier[]
}

export function EventDetails({ event, bookings, media = [], organizerStats, ticketTiers = [] }: EventDetailsProps) {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [showPayment, setShowPayment] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [selectedTierId, setSelectedTierId] = useState(ticketTiers[0]?.id || '')
  const [ticketQuantity, setTicketQuantity] = useState(1)

  const daysUntil = getDaysUntilEvent(event.event_date)
  const ticketsRemaining = event.capacity - event.tickets_sold
  const isSoldOut = ticketsRemaining <= 0
  const isPast = isEventPast(event.event_date)

  // Separate media by type
  const galleryImages = media.filter(m => m.media_type === 'image' && m.is_gallery)
  const promoVideos = media.filter(m => m.media_type !== 'image')
  const fallbackTier = buildFallbackTier({
    id: event.id,
    ticket_price: Number(event.ticket_price || 0),
    capacity: Number(event.capacity || 0),
    tickets_sold: Number(event.tickets_sold || 0),
  })
  const resolvedTicketTiers = ticketTiers.length > 0
    ? ticketTiers.filter((tier) => tier.is_public !== false)
    : [fallbackTier]
  const selectedTier = resolvedTicketTiers.find((tier) => tier.id === selectedTierId) || resolvedTicketTiers[0]

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
              <Image
                src={event.cover_image}
                alt={event.title}
                fill
                className="object-cover"
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
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary hover:underline transition-colors"
                >
                  {event.venue}
                </a>
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
                  <Link key={booking.id} href={`/artists/${booking.artists.id}`}>
                    <Card className="hover:shadow-md transition-shadow">
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
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Organizer - Enhanced Trust Section */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Hosted By</h2>
            <Link href={`/organizers/${event.profiles.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={event.profiles.avatar_url || undefined} />
                      <AvatarFallback className="bg-neutral-100 text-neutral-600 font-semibold text-lg">
                        {(event.profiles.company_name || event.profiles.full_name || 'O').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">
                          {event.profiles.company_name || event.profiles.full_name || 'Event Organizer'}
                        </h3>
                        {event.profiles.verified_at && (
                          <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                        )}
                      </div>

                      {/* Stats */}
                      {organizerStats && (
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          {organizerStats.totalReviews > 0 && (
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{organizerStats.rating.toFixed(1)}</span>
                              <span className="text-muted-foreground">
                                ({organizerStats.totalReviews} reviews)
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{organizerStats.totalEvents} events hosted</span>
                          </div>
                        </div>
                      )}

                      <p className="text-sm text-primary mt-2 flex items-center gap-1">
                        View organizer profile
                        <ArrowLeft className="h-3 w-3 rotate-180" />
                      </p>
                    </div>
                  </div>

                  {/* Trust badges */}
                  {organizerStats && organizerStats.totalEvents >= 3 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                      {event.profiles.verified_at && (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                      {organizerStats.totalEvents >= 5 && (
                        <Badge variant="secondary" className="bg-neutral-100 text-neutral-700">
                          Experienced Host
                        </Badge>
                      )}
                      {organizerStats.rating >= 4.5 && organizerStats.totalReviews >= 5 && (
                        <Badge variant="secondary" className="bg-yellow-50 text-yellow-700">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Top Rated
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Event Gallery */}
          {galleryImages.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Gallery
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {galleryImages.slice(0, 6).map((item, index) => (
                  <div 
                    key={item.id} 
                    className="aspect-square rounded-lg overflow-hidden bg-neutral-100 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => {
                      setLightboxIndex(index)
                      setLightboxOpen(true)
                    }}
                  >
                    <Image
                      src={item.url}
                      alt={item.title || 'Event gallery'}
                      width={300}
                      height={300}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              {galleryImages.length > 6 && (
                <p className="text-sm text-muted-foreground mt-2">
                  +{galleryImages.length - 6} more photos
                </p>
              )}
            </div>
          )}

          {/* Promo Videos */}
          {promoVideos.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Play className="h-5 w-5" />
                Promo Videos
              </h2>
              <div className="grid gap-4">
                {promoVideos.slice(0, 2).map((video) => {
                  const embedId = video.embed_id || extractYouTubeId(video.url)
                  const thumbnail = video.thumbnail_url || (embedId ? getYouTubeThumbnail(embedId) : null)
                  
                  return (
                    <a 
                      key={video.id}
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-video rounded-lg overflow-hidden bg-neutral-100 group"
                    >
                      {thumbnail && (
                        <Image
                          src={thumbnail}
                          alt={video.title || 'Promo video'}
                          fill
                          className="object-cover"
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                          <Play className="h-8 w-8 text-neutral-900 ml-1" fill="currentColor" />
                        </div>
                      </div>
                      {video.title && (
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                          <p className="text-white text-sm font-medium truncate">{video.title}</p>
                        </div>
                      )}
                    </a>
                  )
                })}
              </div>
            </div>
          )}
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
                  {selectedTier?.price === 0 ? 'Free' : formatCurrency(selectedTier?.price || event.ticket_price)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {resolvedTicketTiers.length > 1 ? 'selected tier price' : 'per ticket'}
                </p>
              </div>

              <div className="space-y-2">
                {resolvedTicketTiers.map((tier) => {
                  const remaining = Math.max(0, tier.quantity - tier.sold_count)
                  const isAvailable = isTierOnSale(tier)
                  const isSelected = selectedTier?.id === tier.id

                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setSelectedTierId(tier.id)}
                      className={`w-full rounded-lg border px-3 py-3 text-left transition ${isSelected ? 'border-primary bg-primary/5' : 'border-neutral-200'} ${!isAvailable ? 'opacity-60' : ''}`}
                      disabled={!isAvailable}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">{tier.name}</p>
                          {tier.description && (
                            <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{tier.price === 0 ? 'Free' : formatCurrency(tier.price)}</p>
                          <p className="text-xs text-muted-foreground">{remaining} left</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="space-y-2 text-sm">
                <label className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Quantity</span>
                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, Math.min(10, (selectedTier?.quantity || 1) - (selectedTier?.sold_count || 0)))}
                    value={ticketQuantity}
                    onChange={(e) => setTicketQuantity(Math.max(1, Number(e.target.value) || 1))}
                    className="w-20 rounded-md border border-input bg-background px-2 py-1 text-right"
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  Buying for another groovist? You can assign each ticket holder at checkout.
                </p>
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
                disabled={isSoldOut || isPast || !selectedTier || !isTierOnSale(selectedTier)}
                onClick={handleBuyTicket}
              >
                {isPast ? 'Event Ended' : isSoldOut ? 'Sold Out' : selectedTier ? `Buy ${selectedTier.name}` : 'Buy Ticket'}
              </Button>

              {!user && (
                <p className="text-xs text-center text-muted-foreground">
                  You&apos;ll need to sign in to purchase tickets
                </p>
              )}

              {/* Report Event */}
              <div className="pt-2 border-t">
                <ReportDialog
                  type="event"
                  targetId={event.id}
                  targetName={event.title}
                  trigger={
                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-red-600">
                      <Flag className="h-4 w-4 mr-2" />
                      Report this event
                    </Button>
                  }
                />
              </div>
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
          quantity={ticketQuantity}
          selectedTier={selectedTier}
        />
      )}

      {/* Lightbox */}
      {lightboxOpen && galleryImages.length > 0 && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-neutral-300 z-10"
            onClick={() => setLightboxOpen(false)}
          >
            <span className="sr-only">Close</span>
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative max-w-4xl max-h-[90vh] w-full mx-4">
            <Image
              src={galleryImages[lightboxIndex].url}
              alt={galleryImages[lightboxIndex].title || 'Gallery image'}
              width={1200}
              height={800}
              className="w-full h-auto max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {galleryImages.length > 1 && (
              <>
                <button
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 text-white hover:text-neutral-300 p-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    setLightboxIndex(prev => prev === 0 ? galleryImages.length - 1 : prev - 1)
                  }}
                >
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 text-white hover:text-neutral-300 p-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    setLightboxIndex(prev => prev === galleryImages.length - 1 ? 0 : prev + 1)
                  }}
                >
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
