'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Calendar,
  ArrowRight,
  DollarSign
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { 
  type ProviderBooking,
  SERVICE_CATEGORY_LABELS 
} from '@/types/database'
import { formatCurrency } from '@/lib/helpers'
import { toast } from 'sonner'

interface CrewBookingWithDetails extends ProviderBooking {
  event?: {
    id: string
    title: string
    event_date: string
    venue: string
  }
  provider?: {
    id: string
    business_name: string
    primary_category: string
    profile_image: string | null
  }
  service?: {
    service_name: string
  }
}

export default function OrganiserCrewPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [bookings, setBookings] = useState<CrewBookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) {
      router.push('/auth/signin')
      return
    }

    if (!profile.is_organizer) {
      router.push('/profile')
      toast.error('Only organisers can access this page')
      return
    }

    fetchBookings()
  }, [profile, router])

  const fetchBookings = async () => {
    if (!profile) return

    setLoading(true)
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('provider_bookings')
        .select(`
          *,
          event:events(id, title, event_date, venue),
          provider:providers(id, business_name, primary_category, profile_image),
          service:provider_services(service_name)
        `)
        .eq('organizer_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setBookings(data || [])
    } catch (error) {
      console.error('Error fetching bookings:', error)
      toast.error('Failed to load crew bookings')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('provider_bookings')
        .update({ 
          state: 'cancelled',
          cancelled_by: profile!.id,
          cancellation_reason: 'Cancelled by organiser'
        })
        .eq('id', bookingId)

      if (error) throw error

      toast.success('Booking cancelled')
      fetchBookings()
    } catch (error) {
      console.error('Error cancelling booking:', error)
      toast.error('Failed to cancel booking')
    }
  }

  if (loading || !profile) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  const pendingBookings = bookings.filter(b => b.state === 'pending')
  const acceptedBookings = bookings.filter(b => b.state === 'accepted')
  const confirmedBookings = bookings.filter(b => b.state === 'confirmed')
  const completedBookings = bookings.filter(b => b.state === 'completed')
  const declinedBookings = bookings.filter(b => b.state === 'declined')
  const cancelledBookings = bookings.filter(b => b.state === 'cancelled')

  const totalSpent = [...confirmedBookings, ...completedBookings].reduce(
    (sum, b) => sum + (b.final_amount || b.offered_amount), 0
  )

  const getStateColor = (state: string) => {
    switch (state) {
      case 'pending': return 'border-yellow-500 text-yellow-600 bg-yellow-50'
      case 'accepted': return 'border-blue-500 text-blue-600 bg-blue-50'
      case 'confirmed': return 'border-green-500 text-green-600 bg-green-50'
      case 'completed': return 'border-green-700 text-green-700 bg-green-100'
      case 'declined': return 'border-red-500 text-red-600 bg-red-50'
      case 'cancelled': return 'border-gray-500 text-gray-600 bg-gray-50'
      default: return ''
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Crew Bookings</h1>
          <p className="text-muted-foreground">Manage service providers for your events</p>
        </div>
        <Link href="/crew">
          <Button className="bg-orange-500 hover:bg-orange-600">
            <Users className="h-4 w-4 mr-2" />
            Find Crew
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingBookings.length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{acceptedBookings.length}</p>
                <p className="text-sm text-muted-foreground">Awaiting Payment</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{confirmedBookings.length}</p>
                <p className="text-sm text-muted-foreground">Confirmed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
                <p className="text-sm text-muted-foreground">Total Spent</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {acceptedBookings.length > 0 && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <p className="font-medium">
                {acceptedBookings.length} booking{acceptedBookings.length !== 1 ? 's' : ''} accepted — awaiting your payment
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">
            All ({bookings.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Accepted ({acceptedBookings.length})
          </TabsTrigger>
          <TabsTrigger value="confirmed">
            Confirmed ({confirmedBookings.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedBookings.length})
          </TabsTrigger>
          <TabsTrigger value="declined">
            Declined ({declinedBookings.length + cancelledBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <BookingsList 
            bookings={bookings} 
            onCancel={handleCancel}
            getStateColor={getStateColor}
          />
        </TabsContent>
        <TabsContent value="pending">
          <BookingsList 
            bookings={pendingBookings} 
            onCancel={handleCancel}
            getStateColor={getStateColor}
            emptyMessage="No pending booking requests"
          />
        </TabsContent>
        <TabsContent value="accepted">
          <BookingsList 
            bookings={acceptedBookings} 
            onCancel={handleCancel}
            getStateColor={getStateColor}
            emptyMessage="No bookings awaiting payment"
            showPayButton
          />
        </TabsContent>
        <TabsContent value="confirmed">
          <BookingsList 
            bookings={confirmedBookings} 
            onCancel={handleCancel}
            getStateColor={getStateColor}
            emptyMessage="No confirmed bookings"
          />
        </TabsContent>
        <TabsContent value="completed">
          <BookingsList 
            bookings={completedBookings} 
            onCancel={handleCancel}
            getStateColor={getStateColor}
            emptyMessage="No completed bookings yet"
          />
        </TabsContent>
        <TabsContent value="declined">
          <BookingsList 
            bookings={[...declinedBookings, ...cancelledBookings]} 
            onCancel={handleCancel}
            getStateColor={getStateColor}
            emptyMessage="No declined or cancelled bookings"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function BookingsList({ 
  bookings, 
  onCancel, 
  getStateColor,
  emptyMessage = "No bookings found",
  showPayButton = false
}: { 
  bookings: CrewBookingWithDetails[]
  onCancel: (id: string) => void
  getStateColor: (state: string) => string
  emptyMessage?: string
  showPayButton?: boolean
}) {
  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">{emptyMessage}</h3>
          <p className="text-muted-foreground mb-4">
            Browse the crew page to find service providers for your events
          </p>
          <Link href="/crew">
            <Button>
              <Users className="h-4 w-4 mr-2" />
              Find Crew
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <Card key={booking.id}>
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Link href={`/crew/${booking.provider?.id}`} className="font-semibold hover:text-orange-600">
                    {booking.provider?.business_name}
                  </Link>
                  <Badge variant="outline">
                    {SERVICE_CATEGORY_LABELS[booking.provider?.primary_category as keyof typeof SERVICE_CATEGORY_LABELS] || booking.provider?.primary_category}
                  </Badge>
                  <Badge variant="outline" className={getStateColor(booking.state)}>
                    {booking.state.charAt(0).toUpperCase() + booking.state.slice(1)}
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground mb-1">
                  <strong>Service:</strong> {booking.service?.service_name} × {booking.quantity}
                </p>
                
                <p className="text-sm flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <Link href={`/dashboard/organizer/events/${booking.event?.id}`} className="hover:underline">
                    {booking.event?.title}
                  </Link>
                  <span className="text-muted-foreground">
                    — {new Date(booking.service_date).toLocaleDateString()}
                  </span>
                </p>

                {booking.special_requirements && (
                  <p className="text-sm text-muted-foreground mt-2 italic">
                    &quot;{booking.special_requirements}&quot;
                  </p>
                )}
              </div>

              <div className="text-right">
                <p className="font-bold text-lg text-orange-600">
                  {formatCurrency(booking.final_amount || booking.offered_amount)}
                </p>
                
                <div className="flex gap-2 mt-2 justify-end">
                  {booking.state === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => onCancel(booking.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  )}
                  
                  {booking.state === 'accepted' && showPayButton && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Pay Now
                    </Button>
                  )}

                  {booking.state === 'accepted' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => onCancel(booking.id)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
