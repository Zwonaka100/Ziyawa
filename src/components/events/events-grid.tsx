import Link from 'next/link'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Clock, Users, Ticket } from 'lucide-react'
import { formatCurrency, formatDate, formatTime, getDaysUntilEvent } from '@/lib/helpers'
import { PROVINCES } from '@/lib/constants'
import type { Event, Profile, SaProvince } from '@/types/database'

interface EventWithOrganizer {
  id: string
  title: string
  event_date: string
  start_time: string
  end_time?: string | null
  venue: string
  location: SaProvince | string
  ticket_price: number
  capacity: number
  tickets_sold: number
  description?: string | null
  cover_image?: string | null
  state?: string
  profiles?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

interface EventsGridProps {
  events: EventWithOrganizer[]
}

export function EventsGrid({ events }: EventsGridProps) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  )
}

function EventCard({ event }: { event: EventWithOrganizer }) {
  const daysUntil = getDaysUntilEvent(event.event_date)
  const ticketsRemaining = event.capacity - event.tickets_sold
  const isSoldOut = ticketsRemaining <= 0
  const isAlmostSoldOut = ticketsRemaining > 0 && ticketsRemaining <= 20

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Cover Image Placeholder */}
      <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5">
        {event.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.cover_image}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Calendar className="h-12 w-12 text-primary/40" />
          </div>
        )}
        
        {/* Days Until Badge */}
        <Badge className="absolute top-3 left-3" variant="secondary">
          {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
        </Badge>

        {/* Sold Out Badge */}
        {isSoldOut && (
          <Badge className="absolute top-3 right-3" variant="destructive">
            Sold Out
          </Badge>
        )}
        {isAlmostSoldOut && !isSoldOut && (
          <Badge className="absolute top-3 right-3" variant="destructive">
            Almost Sold Out
          </Badge>
        )}
      </div>

      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-2 line-clamp-1">{event.title}</h3>
        
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(event.event_date)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{formatTime(event.start_time)}</span>
            {event.end_time && <span>- {formatTime(event.end_time)}</span>}
          </div>
          
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">
              {event.venue}, {PROVINCES[event.location as keyof typeof PROVINCES]}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{ticketsRemaining} tickets left</span>
          </div>
        </div>

        {event.description && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
            {event.description}
          </p>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        <div className="text-lg font-bold text-primary">
          {event.ticket_price === 0 ? 'Free' : formatCurrency(event.ticket_price)}
        </div>
        
        <Link href={`/events/${event.id}`}>
          <Button size="sm" disabled={isSoldOut}>
            <Ticket className="h-4 w-4 mr-1" />
            {isSoldOut ? 'Sold Out' : 'Get Tickets'}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
