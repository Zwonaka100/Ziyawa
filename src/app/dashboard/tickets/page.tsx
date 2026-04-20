import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Clock, Ticket, QrCode, CheckCircle, Sparkles, ArrowRight, PartyPopper, Gift, MessageSquare, BellRing, AlertCircle } from 'lucide-react'
import { formatDate, formatTime, getDaysUntilEvent, isEventPast } from '@/lib/helpers'
import { PROVINCES } from '@/lib/constants'
import { TicketWithQR } from './ticket-with-qr'
import { TicketDeliveryActions } from './ticket-delivery-actions'
import { ContactOrganizerDialog } from '@/components/tickets/contact-organizer-dialog'

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, is_organizer, is_artist, is_provider')
    .eq('id', user.id)
    .single()

  const canUseProMessages = Boolean(
    profile?.is_admin || profile?.is_organizer || profile?.is_artist || profile?.is_provider
  )

  // Fetch user's tickets with event details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tickets: any[] = []

  const { data: enrichedTickets, error: enrichedError } = await supabase
    .from('tickets')
    .select(`
      id,
      ticket_code,
      ticket_type,
      price_paid,
      checked_in:is_used,
      checked_in_at:used_at,
      attendee_name,
      attendee_email,
      buyer_name,
      buyer_email,
      claimed_at,
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

  if (enrichedError) {
    const { data: fallbackTickets } = await supabase
      .from('tickets')
      .select(`
        id,
        ticket_code,
        ticket_type,
        price_paid,
        checked_in:is_used,
        checked_in_at:used_at,
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

    tickets = fallbackTickets || []
  } else {
    tickets = enrichedTickets || []
  }

  const resolvedTickets = tickets
    .map((ticket) => ({
      ...ticket,
      event: Array.isArray(ticket.events) ? ticket.events[0] : ticket.events,
    }))
    .filter((ticket) => ticket.event)

  const upcomingTickets = resolvedTickets
    .filter((ticket) => !isEventPast(ticket.event.event_date))
    .sort((a, b) => new Date(a.event.event_date).getTime() - new Date(b.event.event_date).getTime())

  const pastTickets = resolvedTickets
    .filter((ticket) => isEventPast(ticket.event.event_date))
    .sort((a, b) => new Date(b.event.event_date).getTime() - new Date(a.event.event_date).getTime())

  const nextTicket = upcomingTickets[0] || null
  const checkedInCount = resolvedTickets.filter((ticket) => Boolean(ticket.checked_in)).length
  const giftedCount = resolvedTickets.filter((ticket) => {
    const attendeeEmail = typeof ticket.attendee_email === 'string' ? ticket.attendee_email.toLowerCase() : null
    return attendeeEmail && attendeeEmail !== user.email?.toLowerCase()
  }).length

  const { data: recentNotifications } = await supabase
    .from('notifications')
    .select('id, type, title, message, link, created_at, read')
    .eq('user_id', user.id)
    .in('type', ['event_reminder', 'event_updated', 'ticket_purchased', 'ticket_checkin'])
    .order('created_at', { ascending: false })
    .limit(4)

  const ticketUpdates = recentNotifications || []
  const nextEventDaysAway = nextTicket ? getDaysUntilEvent(nextTicket.event.event_date) : null
  const displayName = user.user_metadata?.full_name?.split(' ')[0] || 'Groovist'

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 space-y-6">
        <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-background to-primary/5">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  <Sparkles className="h-4 w-4" />
                  My Tickets
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Hey {displayName} 👋</h1>
                  <p className="text-muted-foreground text-base md:text-lg">
                    Your next vibes are here. See your tickets, event details, and ready-to-use passes below.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/ziwaphi">
                  <Button>
                    Explore Events
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                {canUseProMessages && (
                  <Link href="/messages">
                    <Button variant="outline">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Messages
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Ticket className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{upcomingTickets.length}</p>
                  <p className="text-sm text-muted-foreground">Upcoming</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <PartyPopper className="h-8 w-8 text-pink-500" />
                <div>
                  <p className="text-2xl font-bold">{pastTickets.length}</p>
                  <p className="text-sm text-muted-foreground">Memories</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{checkedInCount}</p>
                  <p className="text-sm text-muted-foreground">Checked In</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Gift className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{giftedCount}</p>
                  <p className="text-sm text-muted-foreground">Shared</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {(nextTicket || ticketUpdates.length > 0) && (
        <section className="mb-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          {nextTicket && (
            <Card className={nextEventDaysAway === 0 ? 'border-green-200 bg-green-50/70' : nextEventDaysAway === 1 ? 'border-amber-200 bg-amber-50/70' : 'border-primary/20'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  {nextEventDaysAway === 0 ? 'Today’s event guide' : nextEventDaysAway === 1 ? 'Get ready for tomorrow' : 'Your event-day heads-up'}
                </CardTitle>
                <CardDescription>
                  {nextEventDaysAway === 0
                    ? 'Keep your QR open, arrive a little early, and have your ticket code ready at the door.'
                    : nextEventDaysAway === 1
                      ? 'Your next event is almost here. Check the venue details and keep an eye on updates.'
                      : 'Everything important for your next event will show up here and in your notifications.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">{String(nextTicket.event.title)}</span> • {formatDate(nextTicket.event.event_date)} • {formatTime(nextTicket.event.start_time)}
                </p>
                <ul className="space-y-2">
                  <li>• Show your QR code or ticket code at the entrance</li>
                  <li>• Self check-in opens on the event day for eligible tickets</li>
                  <li>• If the organiser sends a change, it will appear here and in your notifications</li>
                </ul>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link href="/dashboard/notifications">
                    <Button size="sm" variant="outline">
                      <BellRing className="mr-2 h-4 w-4" />
                      View Updates
                    </Button>
                  </Link>
                  <Link href="/support">
                    <Button size="sm" variant="outline">Get Help</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BellRing className="h-5 w-5 text-primary" />
                Latest updates
              </CardTitle>
              <CardDescription>Important reminders and organiser notices for your tickets.</CardDescription>
            </CardHeader>
            <CardContent>
              {ticketUpdates.length > 0 ? (
                <div className="space-y-3">
                  {ticketUpdates.map((notification) => (
                    <Link key={String(notification.id)} href={String(notification.link || '/dashboard/notifications')}>
                      <div className="rounded-lg border p-3 transition-colors hover:bg-muted/40">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="font-medium line-clamp-1">{String(notification.title)}</p>
                          {!notification.read && <Badge variant="secondary">New</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{String(notification.message)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                  Ticket confirmations, reminders, and organiser updates will appear here.
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {nextTicket && (
        <section className="mb-8">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Next up</CardTitle>
              <CardDescription>Your closest event is ready whenever you are.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-semibold">{String(nextTicket.event.title)}</h2>
                    <Badge>{getDaysUntilEvent(nextTicket.event.event_date) === 0 ? 'Today!' : `In ${getDaysUntilEvent(nextTicket.event.event_date)} days`}</Badge>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(nextTicket.event.event_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(nextTicket.event.start_time)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{String(nextTicket.event.venue)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4" />
                      <span>{PROVINCES[nextTicket.event.location as keyof typeof PROVINCES]}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <TicketWithQR
                    ticketCode={String(nextTicket.ticket_code)}
                    eventId={String(nextTicket.event.id)}
                    ticketId={String(nextTicket.id)}
                    eventDate={String(nextTicket.event.event_date)}
                    isCheckedIn={Boolean(nextTicket.checked_in)}
                  />
                  <ContactOrganizerDialog
                    eventId={String(nextTicket.event.id)}
                    eventTitle={String(nextTicket.event.title)}
                    variant="outline"
                    size="default"
                  />
                  <Link href={`/events/${nextTicket.event.id}`}>
                    <Button variant="outline">View Event</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="mb-12">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Upcoming Events ({upcomingTickets.length})</h2>
            <p className="text-sm text-muted-foreground">Everything you need for the events you’re heading to next.</p>
          </div>
        </div>

        {upcomingTickets.length > 0 ? (
          <div className="grid gap-4">
            {upcomingTickets.map((ticket) => {
              const event = ticket.event
              const daysUntilEvent = getDaysUntilEvent(event.event_date)
              const assignedToOther = typeof ticket.attendee_email === 'string' && ticket.attendee_email.toLowerCase() !== user.email?.toLowerCase()

              return (
                <Card key={String(ticket.id)}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 md:flex-row">
                      <div className="h-32 w-full rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center md:w-48">
                        {event.cover_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={event.cover_image}
                            alt={event.title}
                            className="h-full w-full rounded-lg object-cover"
                          />
                        ) : (
                          <Calendar className="h-10 w-10 text-primary/40" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-lg font-semibold">{event.title}</h3>
                            <p className="text-sm text-muted-foreground">{ticket.ticket_type || 'General access'} ticket</p>
                          </div>
                          <div className="flex flex-wrap gap-2 justify-end">
                            <Badge>{daysUntilEvent === 0 ? 'Today!' : `In ${daysUntilEvent} days`}</Badge>
                            {assignedToOther && <Badge variant="secondary">Gifted</Badge>}
                            {ticket.claimed_at && <Badge variant="outline">Claimed</Badge>}
                            {ticket.checked_in && (
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Checked In
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(event.event_date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{formatTime(event.start_time)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{event.venue}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Ticket className="h-4 w-4" />
                            <span>{PROVINCES[event.location as keyof typeof PROVINCES]}</span>
                          </div>
                        </div>

                        <div className="mt-4 rounded-lg bg-muted p-3 space-y-3">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-2">
                              <QrCode className="h-5 w-5" />
                              <div>
                                <p className="text-xs text-muted-foreground">Ticket Code</p>
                                <p className="font-mono font-bold">{String(ticket.ticket_code)}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <ContactOrganizerDialog
                                eventId={String(event.id)}
                                eventTitle={String(event.title)}
                              />
                              <Link href={`/events/${event.id}`}>
                                <Button variant="outline" size="sm">Event Details</Button>
                              </Link>
                              <TicketWithQR
                                ticketCode={String(ticket.ticket_code)}
                                eventId={String(event.id)}
                                ticketId={String(ticket.id)}
                                eventDate={String(event.event_date)}
                                isCheckedIn={Boolean(ticket.checked_in)}
                              />
                            </div>
                          </div>

                          {(ticket.attendee_name || assignedToOther) && (
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p>
                                Ticket holder: <span className="font-medium text-foreground">{String(ticket.attendee_name || 'You')}</span>
                              </p>
                              {assignedToOther && (
                                <TicketDeliveryActions
                                  ticketId={String(ticket.id)}
                                  recipientEmail={typeof ticket.attendee_email === 'string' ? ticket.attendee_email : null}
                                  isGifted={assignedToOther}
                                  isClaimed={Boolean(ticket.claimed_at)}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Ticket className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">Hey Groovist, your next vibe is waiting</h3>
              <p className="mb-4 text-muted-foreground">
                Once you buy a ticket, it will show up here with your QR, event info, and quick actions.
              </p>
              <div className="flex justify-center gap-3 flex-wrap">
                <Link href="/ziwaphi">
                  <Button>Browse Events</Button>
                </Link>
                <Link href="/artists">
                  <Button variant="outline">Discover Artists</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {pastTickets.length > 0 && (
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Past Events ({pastTickets.length})</h2>
            <p className="text-sm text-muted-foreground">Relive the moments and jump into your next one.</p>
          </div>
          <div className="grid gap-4">
            {pastTickets.map((ticket) => {
              const event = ticket.event

              return (
                <Card key={String(ticket.id)} className="opacity-95">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{event.title}</h3>
                          <Badge variant="secondary">Past</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(event.event_date)} • {event.venue}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <ContactOrganizerDialog
                          eventId={String(event.id)}
                          eventTitle={String(event.title)}
                        />
                        <Link href={`/events/${event.id}#reviews`}>
                          <Button variant="outline" size="sm">Leave Review</Button>
                        </Link>
                        <Link href={`/events/${event.id}`}>
                          <Button variant="outline" size="sm">View Event</Button>
                        </Link>
                        <Link href="/ziwaphi">
                          <Button size="sm">Find More Events</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
