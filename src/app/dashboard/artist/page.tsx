import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, DollarSign, Clock, CheckCircle, XCircle, Image as ImageIcon, Music2, Share2, User } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/helpers'
import { BOOKING_STATUS, PROVINCES } from '@/lib/constants'
import { BookingActions } from '@/components/bookings/booking-actions'

export const metadata = {
  title: 'Artist Dashboard | Ziyawa',
  description: 'Manage your bookings and profile',
}

export default async function ArtistDashboardPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/signin')
  }

  // Check role - use new boolean flags
  const { data: profileData } = await supabase
    .from('profiles')
    .select('is_artist, wallet_balance')
    .eq('id', user.id)
    .single()

  const profile = profileData as { is_artist: boolean; wallet_balance: number } | null

  if (!profile || !profile.is_artist) {
    redirect('/profile')
  }

  // Get artist record
  const { data: artistData } = await supabase
    .from('artists')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const artist = artistData as any

  if (!artist) {
    // Artist hasn't created their profile yet
    redirect('/dashboard/artist/setup')
  }

  // Fetch bookings for this artist
  const { data: bookingsData } = await supabase
    .from('bookings')
    .select(`
      *,
      events (
        id,
        title,
        event_date,
        start_time,
        venue,
        location
      ),
      profiles:organizer_id (
        id,
        full_name,
        email
      )
    `)
    .eq('artist_id', artist.id)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookings = bookingsData as any[] | null

  const pendingBookings = bookings?.filter(b => b.status === 'pending') || []
  const acceptedBookings = bookings?.filter(b => ['accepted', 'paid'].includes(b.status)) || []
  const completedBookings = bookings?.filter(b => b.status === 'completed') || []
  const totalEarnings = bookings
    ?.filter(b => ['paid', 'completed'].includes(b.status))
    .reduce((acc, b) => acc + b.offered_amount, 0) || 0

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Artist Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {artist.stage_name}!</p>
      </div>

      {/* Quick Links to Profile Management */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Link href={`/artists/${artist.id}`}>
          <Card className="hover:bg-neutral-50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">View Profile</p>
                  <p className="text-xs text-muted-foreground">See your public profile</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/artist/media">
          <Card className="hover:bg-neutral-50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-neutral-900 flex items-center justify-center">
                  <ImageIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">Media</p>
                  <p className="text-xs text-muted-foreground">Photos & Videos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/artist/social">
          <Card className="hover:bg-neutral-50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center">
                  <Share2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">Social Links</p>
                  <p className="text-xs text-muted-foreground">Instagram, TikTok...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/artist/discography">
          <Card className="hover:bg-neutral-50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-neutral-700 flex items-center justify-center">
                  <Music2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">Discography</p>
                  <p className="text-xs text-muted-foreground">Music releases</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{pendingBookings.length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Calendar className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{acceptedBookings.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completedBookings.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
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
                <p className="text-sm text-muted-foreground">Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending {pendingBookings.length > 0 && `(${pendingBookings.length})`}
          </TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-4">
          {pendingBookings.length > 0 ? (
            <div className="grid gap-4">
              {pendingBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{booking.events?.title}</h3>
                          <Badge className={BOOKING_STATUS[booking.status as keyof typeof BOOKING_STATUS].color}>
                            {BOOKING_STATUS[booking.status as keyof typeof BOOKING_STATUS].label}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>{booking.events?.event_date && formatDate(booking.events.event_date)} at {booking.events?.start_time}</p>
                          <p>{booking.events?.venue}, {PROVINCES[booking.events?.location as keyof typeof PROVINCES]}</p>
                          <p>Organizer: {booking.profiles?.full_name}</p>
                          <p className="font-medium text-foreground">
                            Offer: {formatCurrency(booking.offered_amount)}
                          </p>
                          {booking.organizer_notes && (
                            <p className="italic mt-2">&quot;{booking.organizer_notes}&quot;</p>
                          )}
                        </div>
                      </div>
                      <BookingActions booking={booking} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                <p className="text-muted-foreground">
                  New booking requests will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Upcoming Tab */}
        <TabsContent value="upcoming" className="space-y-4">
          {acceptedBookings.length > 0 ? (
            <div className="grid gap-4">
              {acceptedBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{booking.events?.title}</h3>
                          <Badge className={BOOKING_STATUS[booking.status as keyof typeof BOOKING_STATUS].color}>
                            {BOOKING_STATUS[booking.status as keyof typeof BOOKING_STATUS].label}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>{booking.events?.event_date && formatDate(booking.events.event_date)} at {booking.events?.start_time}</p>
                          <p>{booking.events?.venue}, {PROVINCES[booking.events?.location as keyof typeof PROVINCES]}</p>
                          <p>Payment: {formatCurrency(booking.offered_amount)}</p>
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
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No upcoming gigs</h3>
                <p className="text-muted-foreground">
                  Accepted bookings will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {bookings && bookings.filter(b => ['completed', 'declined', 'cancelled'].includes(b.status)).length > 0 ? (
            <div className="grid gap-4">
              {bookings
                .filter(b => ['completed', 'declined', 'cancelled'].includes(b.status))
                .map((booking) => (
                  <Card key={booking.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{booking.events?.title}</h3>
                            <Badge className={BOOKING_STATUS[booking.status as keyof typeof BOOKING_STATUS].color}>
                              {BOOKING_STATUS[booking.status as keyof typeof BOOKING_STATUS].label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {booking.events?.event_date && formatDate(booking.events.event_date)} • {formatCurrency(booking.offered_amount)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No booking history</h3>
                <p className="text-muted-foreground">
                  Past bookings will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
