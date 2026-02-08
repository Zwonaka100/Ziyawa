'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus,
  Settings,
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Eye,
  DollarSign,
  TrendingUp,
  Image as ImageIcon,
  Share2,
  FolderKanban
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { 
  type Provider, 
  type ProviderService, 
  type ProviderBooking,
  SERVICE_CATEGORY_LABELS 
} from '@/types/database'
import { formatCurrency } from '@/lib/helpers'
import { toast } from 'sonner'

interface BookingWithDetails extends ProviderBooking {
  event?: {
    id: string
    title: string
    event_date: string
  }
  service?: {
    service_name: string
  }
  organizer?: {
    full_name: string | null
    email: string
  }
}

export default function ProviderDashboardPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [provider, setProvider] = useState<Provider | null>(null)
  const [services, setServices] = useState<ProviderService[]>([])
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [processingBooking, setProcessingBooking] = useState<string | null>(null)

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return

    if (!profile) {
      router.push('/auth/signin')
      return
    }

    if (!profile.is_provider) {
      router.push('/profile')
      toast.error('You need to become a provider first')
      return
    }

    fetchProviderData()
  }, [profile, authLoading, router])

  const fetchProviderData = async () => {
    if (!profile) return
    
    setLoading(true)
    try {
      const supabase = createClient()
      
      // Fetch provider profile
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle()

      if (providerError) {
        throw providerError
      }

      // No provider profile yet, redirect to setup
      if (!providerData) {
        router.push('/dashboard/provider/setup')
        return
      }

      setProvider(providerData)

      // Fetch services
      const { data: servicesData } = await supabase
        .from('provider_services')
        .select('*')
        .eq('provider_id', providerData.id)
        .order('created_at', { ascending: false })

      setServices(servicesData || [])

      // Fetch bookings
      const { data: bookingsData } = await supabase
        .from('provider_bookings')
        .select(`
          *,
          event:events(id, title, event_date),
          service:provider_services(service_name),
          organizer:profiles!provider_bookings_organizer_id_fkey(full_name, email)
        `)
        .eq('provider_id', providerData.id)
        .order('created_at', { ascending: false })

      setBookings(bookingsData || [])
    } catch (error) {
      console.error('Error fetching provider data:', error)
      toast.error('Failed to load provider data')
    } finally {
      setLoading(false)
    }
  }

  const handleBookingAction = async (bookingId: string, action: 'accept' | 'decline') => {
    setProcessingBooking(bookingId)
    try {
      const supabase = createClient()
      
      const newState = action === 'accept' ? 'accepted' : 'declined'
      const { error } = await supabase
        .from('provider_bookings')
        .update({ state: newState })
        .eq('id', bookingId)

      if (error) throw error

      toast.success(action === 'accept' ? 'Booking accepted!' : 'Booking declined')
      fetchProviderData()
    } catch (error) {
      console.error('Error updating booking:', error)
      toast.error('Failed to update booking')
    } finally {
      setProcessingBooking(null)
    }
  }

  if (authLoading || loading || !profile) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!provider) {
    return null
  }

  const pendingBookings = bookings.filter(b => b.state === 'pending')
  const activeBookings = bookings.filter(b => ['accepted', 'confirmed'].includes(b.state))
  const completedBookings = bookings.filter(b => b.state === 'completed')
  const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.provider_payout || b.final_amount || b.offered_amount), 0)

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Provider Dashboard</h1>
          <p className="text-muted-foreground">{provider.business_name}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/crew/${provider.id}`}>
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              View Profile
            </Button>
          </Link>
          <Link href="/dashboard/provider/services">
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </Link>
          <Link href="/dashboard/provider/setup">
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Briefcase className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{services.length}</p>
                <p className="text-sm text-muted-foreground">Services</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedBookings.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalEarnings)}</p>
                <p className="text-sm text-muted-foreground">Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links to Profile Management */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Link href="/dashboard/provider/media">
          <Card className="hover:bg-neutral-50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-neutral-900 flex items-center justify-center">
                  <ImageIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">Media Gallery</p>
                  <p className="text-xs text-muted-foreground">Photos & Videos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/provider/portfolio">
          <Card className="hover:bg-neutral-50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center">
                  <FolderKanban className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">Portfolio</p>
                  <p className="text-xs text-muted-foreground">Past projects</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/provider/social">
          <Card className="hover:bg-neutral-50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-neutral-700 flex items-center justify-center">
                  <Share2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">Social Links</p>
                  <p className="text-xs text-muted-foreground">Business profiles</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/provider/services">
          <Card className="hover:bg-neutral-50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-neutral-600 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">Services</p>
                  <p className="text-xs text-muted-foreground">Manage offerings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Pending Requests Alert */}
      {pendingBookings.length > 0 && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <p className="font-medium">
                You have {pendingBookings.length} pending booking request{pendingBookings.length !== 1 ? 's' : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bookings">
            Bookings
            {pendingBookings.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingBookings.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="services">My Services</TabsTrigger>
        </TabsList>

        {/* Bookings Tab */}
        <TabsContent value="bookings">
          {bookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No bookings yet</h3>
                <p className="text-muted-foreground">
                  When organisers book your services, they&apos;ll appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <Card key={booking.id} className={booking.state === 'pending' ? 'border-yellow-300' : ''}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{booking.event?.title}</h3>
                          <Badge variant={
                            booking.state === 'pending' ? 'outline' :
                            booking.state === 'accepted' ? 'secondary' :
                            booking.state === 'confirmed' ? 'default' :
                            booking.state === 'completed' ? 'default' :
                            'destructive'
                          } className={
                            booking.state === 'pending' ? 'border-yellow-500 text-yellow-600' :
                            booking.state === 'completed' ? 'bg-green-100 text-green-700' : ''
                          }>
                            {booking.state.charAt(0).toUpperCase() + booking.state.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Service: {booking.service?.service_name} • 
                          Date: {new Date(booking.service_date).toLocaleDateString()} •
                          Qty: {booking.quantity}
                        </p>
                        <p className="text-sm">
                          Organiser: {booking.organizer?.full_name || booking.organizer?.email}
                        </p>
                        {booking.special_requirements && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Notes: {booking.special_requirements}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold text-lg text-orange-600">
                          {formatCurrency(booking.offered_amount)}
                        </p>
                        
                        {booking.state === 'pending' && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleBookingAction(booking.id, 'decline')}
                              disabled={processingBooking === booking.id}
                            >
                              {processingBooking === booking.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4 mr-1" />
                              )}
                              Decline
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleBookingAction(booking.id, 'accept')}
                              disabled={processingBooking === booking.id}
                            >
                              {processingBooking === booking.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-1" />
                              )}
                              Accept
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services">
          {services.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No services yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add services to start receiving booking requests
                </p>
                <Link href="/dashboard/provider/services">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Service
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {services.map((service) => (
                <Card key={service.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{service.service_name}</CardTitle>
                        <Badge variant="outline" className="mt-1">
                          {SERVICE_CATEGORY_LABELS[service.category]}
                        </Badge>
                      </div>
                      <Badge variant={service.is_available ? 'default' : 'secondary'}>
                        {service.is_available ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {service.description && (
                      <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                    )}
                    <p className="font-bold text-orange-600">{formatCurrency(service.base_price)}</p>
                  </CardContent>
                </Card>
              ))}
              
              <Link href="/dashboard/provider/services">
                <Card className="h-full border-dashed hover:border-orange-500 cursor-pointer transition-colors">
                  <CardContent className="py-12 flex flex-col items-center justify-center h-full">
                    <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Add New Service</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
