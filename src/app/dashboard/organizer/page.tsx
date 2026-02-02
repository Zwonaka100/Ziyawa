import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Plus, Users, DollarSign, Clock } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/helpers'
import { BOOKING_STATUS, PROVINCES } from '@/lib/constants'

export const metadata = {
  title: 'Organizer Dashboard | Ziyawa',
  description: 'Manage your events and bookings',
}

export default async function OrganizerDashboardPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/signin')
  }

  // Check role - use new boolean flags
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_organizer, is_admin, wallet_balance')
    .eq('id', user.id)
    .single()

  if (!profile || (!profile.is_organizer && !profile.is_admin)) {
    redirect('/profile')
  }

  // Fetch organizer's events
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('organizer_id', user.id)
    .order('event_date', { ascending: true })

  // Fetch bookings for organizer's events
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      events (id, title, event_date),
      artists (id, stage_name, genre, profile_image)
    `)
    .eq('organizer_id', user.id)
    .order('created_at', { ascending: false })

  const upcomingEvents = events?.filter(e => new Date(e.event_date) >= new Date()) || []
  const pastEvents = events?.filter(e => new Date(e.event_date) < new Date()) || []
  const pendingBookings = bookings?.filter(b => b.status === 'pending') || []
  const totalRevenue = events?.reduce((acc, e) => acc + (e.tickets_sold * e.ticket_price), 0) || 0

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Organizer Dashboard</h1>
          <p className="text-muted-foreground">Manage your events and bookings</p>
        </div>
        <Link href="/dashboard/organizer/events/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{upcomingEvents.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming Events</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{pendingBookings.length}</p>
                <p className="text-sm text-muted-foreground">Pending Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Users className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {events?.reduce((acc, e) => acc + e.tickets_sold, 0) || 0}
                </p>
                <p className="text-sm text-muted-foreground">Tickets Sold</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <DollarSign className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(profile.wallet_balance)}</p>
                <p className="text-sm text-muted-foreground">Wallet Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">My Events</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
        </TabsList>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          {events && events.length > 0 ? (
            <div className="grid gap-4">
              {events.map((event) => (
                <Card key={event.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{event.title}</h3>
                          <Badge variant={event.is_published ? 'default' : 'secondary'}>
                            {event.is_published ? 'Published' : 'Draft'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>{formatDate(event.event_date)} • {event.venue}</p>
                          <p>{PROVINCES[event.location as keyof typeof PROVINCES]}</p>
                          <p>
                            {event.tickets_sold} / {event.capacity} tickets sold • 
                            {formatCurrency(event.ticket_price)} per ticket
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/events/${event.id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                        <Link href={`/dashboard/organizer/events/${event.id}/edit`}>
                          <Button variant="outline" size="sm">Edit</Button>
                        </Link>
                        <Link href={`/dashboard/organizer/events/${event.id}/book`}>
                          <Button size="sm">Book Artist</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No events yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first event to start selling tickets and booking artists.
                </p>
                <Link href="/dashboard/organizer/events/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-4">
          {bookings && bookings.length > 0 ? (
            <div className="grid gap-4">
              {bookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{booking.artists?.stage_name}</h3>
                          <Badge className={BOOKING_STATUS[booking.status as keyof typeof BOOKING_STATUS].color}>
                            {BOOKING_STATUS[booking.status as keyof typeof BOOKING_STATUS].label}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>For: {booking.events?.title}</p>
                          <p>{booking.events?.event_date && formatDate(booking.events.event_date)}</p>
                          <p>Offered: {formatCurrency(booking.offered_amount)}</p>
                          {booking.artist_notes && (
                            <p className="italic">&quot;{booking.artist_notes}&quot;</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {booking.status === 'accepted' && (
                          <Link href={`/dashboard/organizer/bookings/${booking.id}/pay`}>
                            <Button size="sm">Pay Artist</Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
                <p className="text-muted-foreground">
                  Book artists for your events to see them here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
