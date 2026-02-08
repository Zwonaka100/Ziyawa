'use client'

/**
 * TICKET CARD COMPONENT
 * Displays a ticket with QR code for event entry
 */

import { QRCodeSVG } from 'qrcode.react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatTime, formatCurrency } from '@/lib/helpers'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Ticket as TicketIcon,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TicketCardProps {
  ticket: {
    id: string
    ticket_code: string
    ticket_type: string
    price_paid: number
    checked_in: boolean
    checked_in_at?: string | null
    events: {
      id: string
      title: string
      date: string
      time: string
      venue: string
      city: string
      cover_image?: string | null
    }
  }
  showQR?: boolean
  compact?: boolean
}

export function TicketCard({ ticket, showQR = true, compact = false }: TicketCardProps) {
  const { events: event } = ticket
  const isCheckedIn = ticket.checked_in
  const isPastEvent = new Date(event.date) < new Date()

  // QR code data contains ticket code and event ID for validation
  const qrData = JSON.stringify({
    code: ticket.ticket_code,
    event: event.id,
    ticket: ticket.id,
  })

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      isCheckedIn && "opacity-75",
      compact ? "max-w-sm" : "max-w-md"
    )}>
      {/* Event Header with Cover Image */}
      {event.cover_image && !compact && (
        <div 
          className="h-32 bg-cover bg-center relative"
          style={{ backgroundImage: `url(${event.cover_image})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="text-white font-bold text-lg line-clamp-1">{event.title}</h3>
          </div>
        </div>
      )}

      <CardContent className={cn("p-4", !event.cover_image && "pt-4")}>
        {/* Event Title (if no cover image) */}
        {(!event.cover_image || compact) && (
          <h3 className="font-bold text-lg mb-3 line-clamp-1">{event.title}</h3>
        )}

        <div className="flex gap-4">
          {/* QR Code Section */}
          {showQR && (
            <div className="flex-shrink-0">
              <div className={cn(
                "bg-white p-2 rounded-lg border-2",
                isCheckedIn ? "border-green-500" : "border-purple-200"
              )}>
                <QRCodeSVG 
                  value={qrData}
                  size={compact ? 80 : 120}
                  level="H"
                  includeMargin={false}
                />
              </div>
              {/* Status Badge under QR */}
              <div className="mt-2 text-center">
                {isCheckedIn ? (
                  <Badge variant="default" className="bg-green-500 text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Checked In
                  </Badge>
                ) : isPastEvent ? (
                  <Badge variant="secondary" className="text-xs">
                    <XCircle className="h-3 w-3 mr-1" />
                    Expired
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    <TicketIcon className="h-3 w-3 mr-1" />
                    Valid
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Ticket Details */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Date & Time */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>{formatDate(event.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>{formatTime(event.time)}</span>
            </div>
            
            {/* Venue */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{event.venue}, {event.city}</span>
            </div>

            {/* Ticket Code */}
            <div className="pt-2 border-t mt-2">
              <p className="text-xs text-muted-foreground">Ticket Code</p>
              <p className="font-mono font-bold text-lg tracking-wider">
                {ticket.ticket_code}
              </p>
            </div>

            {/* Ticket Type & Price */}
            <div className="flex items-center justify-between text-sm">
              <Badge variant="secondary">{ticket.ticket_type}</Badge>
              <span className="font-medium">{formatCurrency(ticket.price_paid)}</span>
            </div>

            {/* Check-in time if checked in */}
            {isCheckedIn && ticket.checked_in_at && (
              <p className="text-xs text-green-600">
                Checked in at {new Date(ticket.checked_in_at).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Minimal ticket display for lists
 */
export function TicketListItem({ ticket }: { ticket: TicketCardProps['ticket'] }) {
  const { events: event } = ticket
  const isCheckedIn = ticket.checked_in

  return (
    <div className={cn(
      "flex items-center gap-4 p-4 border rounded-lg",
      isCheckedIn && "bg-green-50 border-green-200"
    )}>
      <div className="flex-shrink-0">
        <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
          <TicketIcon className="h-6 w-6 text-purple-600" />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate">{event.title}</h4>
        <p className="text-sm text-muted-foreground">
          {formatDate(event.date)} • {ticket.ticket_code}
        </p>
      </div>

      <div className="flex-shrink-0">
        {isCheckedIn ? (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Used
          </Badge>
        ) : (
          <Badge variant="outline">Valid</Badge>
        )}
      </div>
    </div>
  )
}
