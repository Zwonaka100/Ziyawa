import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Clock, Ticket, QrCode, CheckCircle } from 'lucide-react'
import { formatDate, formatTime, getDaysUntilEvent, isEventPast } from '@/lib/helpers'
import { PROVINCES } from '@/lib/constants'
import { TicketWithQR } from './ticket-with-qr'

export const metadata = {
  title: 'My Tickets | Ziyawa',
  description: 'View your purchased tickets',
}

export default async function TicketsPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/signin')
  }

  // Fetch user's tickets with event details
  const { data: tickets } = await supabase
    .from('tickets')
    .select(`
      *,
      events (
        id,
        title,
        event_date,
        start_time,
        venue,
        location,
        cover_image
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const upcomingTickets = tickets?.filter(t => t.events && !isEventPast(t.events.event_date)) || []
  const pastTickets = tickets?.filter(t => t.events && isEventPast(t.events.event_date)) || []

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Tickets</h1>
        <p className="text-muted-foreground">Your purchased event tickets</p>
      </div>

      {/* Upcoming Tickets */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Upcoming Events ({upcomingTickets.length})</h2>
        
        {upcomingTickets.length > 0 ? (
          <div className="grid gap-4">
            {upcomingTickets.map((ticket) => (
              <Card key={ticket.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Event Image */}
                    <div className="w-full md:w-48 h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
                      {ticket.events?.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ticket.events.cover_image}
                          alt={ticket.events.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Calendar className="h-10 w-10 text-primary/40" />
                      )}
                    </div>

                    {/* Event Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg">{ticket.events?.title}</h3>
                        <Badge>
                          {getDaysUntilEvent(ticket.events?.event_date!) === 0 
                            ? 'Today!' 
                            : `In ${getDaysUntilEvent(ticket.events?.event_date!)} days`}
                        </Badge>
                      </div>
                      
                      <div className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(ticket.events?.event_date!)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{formatTime(ticket.events?.start_time!)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{ticket.events?.venue}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Ticket className="h-4 w-4" />
                          <span>{PROVINCES[ticket.events?.location as keyof typeof PROVINCES]}</span>
                        </div>
                      </div>

                      {/* Ticket Code with QR */}
                      <div className="mt-4 p-3 bg-muted rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <QrCode className="h-5 w-5" />
                          <div>
                            <p className="text-xs text-muted-foreground">Ticket Code</p>
                            <p className="font-mono font-bold">{ticket.ticket_code}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {ticket.checked_in && (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Checked In
                            </Badge>
                          )}
                          <TicketWithQR 
                            ticketCode={ticket.ticket_code}
                            eventId={ticket.events?.id}
                            ticketId={ticket.id}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No upcoming tickets</h3>
              <p className="text-muted-foreground mb-4">
                Find events to attend on Ziwaphi!
              </p>
              <Link href="/ziwaphi">
                <Button>Browse Events</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Past Tickets */}
      {pastTickets.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Past Events ({pastTickets.length})</h2>
          <div className="grid gap-4">
            {pastTickets.map((ticket) => (
              <Card key={ticket.id} className="opacity-70">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{ticket.events?.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(ticket.events?.event_date!)} • {ticket.events?.venue}
                      </p>
                    </div>
                    <Badge variant="secondary">Past</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
