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
  AlertTriangle,
  Loader2,
  Eye,
  Image as ImageIcon,
  Share2,
  FolderKanban,
  Edit
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { useEventWork } from '@/hooks/use-event-work'
import { CrewWorkPanel } from '@/components/providers/crew-work-panel'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  type Provider,
  type ProviderService,
  type ProviderBooking,
  type CrewWorkMode,
  SERVICE_CATEGORY_LABELS,
  CREW_WORK_MODE_LABELS,
  PRICE_TYPE_LABELS,
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
    id?: string
    full_name: string | null
    email: string
  }
}

type ProviderProfileState = {
  id: string
  is_provider: boolean
  wallet_balance?: number | null
  held_balance?: number | null
  pending_payout_balance?: number | null
}

export default function ProviderDashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { assignments, activeCount, hasEventWork, loading: workLoading } = useEventWork()
  const [providerProfile, setProviderProfile] = useState<ProviderProfileState | null>(null)
  const [provider, setProvider] = useState<Provider | null>(null)
  const [services, setServices] = useState<ProviderService[]>([])
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [processingBooking, setProcessingBooking] = useState<string | null>(null)
  const [startingChatBookingId, setStartingChatBookingId] = useState<string | null>(null)
  const [updatingMode, setUpdatingMode] = useState<'work' | 'services' | null>(null)
  const [setupRequired, setSetupRequired] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Dispute dialog
  const [disputeBookingId, setDisputeBookingId] = useState<string | null>(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeLoading, setDisputeLoading] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push('/auth/signin')
      return
    }

    fetchProviderData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, router])

  const fetchProviderData = async () => {
    if (!user) return

    setLoading(true)
    setLoadError(null)
    setSetupRequired(false)
    try {
      const supabase = createClient()

      const { data: freshProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, is_provider, wallet_balance, held_balance, pending_payout_balance')
        .eq('id', user.id)
        .single()

      if (profileError) {
        throw profileError
      }

      setProviderProfile(freshProfile)
      
      // Fetch provider profile
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select('*')
        .eq('profile_id', user.id)
        .maybeSingle()

      if (providerError) {
        throw providerError
      }

      let resolvedProvider = providerData

      // Legacy compatibility: some older provider accounts were upgraded on the profile
      // but never got a row in providers. Auto-create a minimal crew profile for them.
      if (!resolvedProvider && freshProfile?.is_provider) {
        const fallbackBusinessName =
          (user.user_metadata?.business_name as string | undefined) ||
          (user.user_metadata?.full_name as string | undefined) ||
          user.email?.split('@')[0] ||
          'Crew Member'

        const { data: createdProvider, error: createProviderError } = await supabase
          .from('providers')
          .insert({
            profile_id: user.id,
            business_name: fallbackBusinessName,
            description: 'Legacy provider profile synced to Crew dashboard.',
            primary_category: 'event_staff',
            location: 'gauteng',
            business_email: user.email || null,
            is_available: true,
            advance_notice_days: 3,
          })
          .select('*')
          .single()

        if (createProviderError) {
          console.error('Error auto-creating legacy crew profile:', createProviderError)
        } else {
          resolvedProvider = createdProvider
        }
      }

      // No provider profile yet, prompt setup clearly
      if (!resolvedProvider) {
        setSetupRequired(true)
        setProvider(null)
        return
      }

      setProvider(resolvedProvider)

      // Fetch services
      const { data: servicesData } = await supabase
        .from('provider_services')
        .select('*')
        .eq('provider_id', resolvedProvider.id)
        .order('created_at', { ascending: false })

      setServices(servicesData || [])

      // Fetch bookings
      const { data: bookingsData } = await supabase
        .from('provider_bookings')
        .select(`
          *,
          event:events(id, title, event_date),
          service:provider_services(service_name),
          organizer:profiles!provider_bookings_organizer_id_fkey(id, full_name, email)
        `)
        .eq('provider_id', resolvedProvider.id)
        .order('created_at', { ascending: false })

      setBookings(bookingsData || [])
    } catch (error) {
      console.error('Error fetching crew data:', error)
      const message = error instanceof Error ? error.message : 'Failed to load crew data'
      setLoadError(message)
      toast.error('Failed to load crew data')
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

  const handleMessageOrganizer = async (organizerId: string, bookingId: string) => {
    setStartingChatBookingId(bookingId)
    try {
      const response = await fetch('/api/conversations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: organizerId, contextType: 'general' }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start conversation')
      }

      router.push(`/messages?chat=${data.conversationId}`)
    } catch (error) {
      console.error('Error starting organizer conversation:', error)
      toast.error('Failed to open messages')
    } finally {
      setStartingChatBookingId(null)
    }
  }

  const handleModeEnable = async (target: 'work' | 'services') => {
    if (!provider) return

    const currentlyHasWork = provider.work_mode === 'looking_for_work' || provider.work_mode === 'both' || hasEventWork
    const currentlyHasServices = provider.work_mode === 'offering_services' || provider.work_mode === 'both' || services.length > 0

    const nextMode: CrewWorkMode = target === 'work'
      ? (currentlyHasServices ? 'both' : 'looking_for_work')
      : (currentlyHasWork ? 'both' : 'offering_services')

    if (provider.work_mode === nextMode) {
      return
    }

    setUpdatingMode(target)
    try {
      const supabase = createClient()
      const { data: updatedProvider, error } = await supabase
        .from('providers')
        .update({ work_mode: nextMode })
        .eq('id', provider.id)
        .select('*')
        .single()

      if (error) throw error

      setProvider(updatedProvider)
      toast.success(
        nextMode === 'both'
          ? 'Crew mode updated: My Work and My Services are now both active.'
          : target === 'work'
            ? 'Crew mode updated: My Work is now active.'
            : 'Crew mode updated: My Services is now active.'
      )
    } catch (error) {
      console.error('Error updating crew mode:', error)
      toast.error('Failed to update crew mode')
    } finally {
      setUpdatingMode(null)
    }
  }

  const handleDispute = async () => {
    if (!disputeBookingId || !disputeReason.trim()) return
    setDisputeLoading(true)
    try {
      const res = await fetch(`/api/provider-bookings/${disputeBookingId}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: disputeReason.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(data.message ?? 'Dispute opened — our team will review within 2 business days')
      setDisputeBookingId(null)
      setDisputeReason('')
      fetchProviderData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to open dispute')
    } finally {
      setDisputeLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Crew dashboard could not load</CardTitle>
            <CardDescription>Please retry and, if needed, finish your crew setup.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={fetchProviderData}>Try again</Button>
            <Link href="/dashboard/provider/setup">
              <Button variant="outline">Open crew setup</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (setupRequired) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <Card className="border-orange-200 bg-orange-50/60">
          <CardHeader>
            <CardTitle>Complete your Crew details</CardTitle>
            <CardDescription>
              Add rates, availability, and services when you are ready for public bookings. If you came through a staff invite, your My Work assignments are already active below.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href="/dashboard/provider/setup">
              <Button>Complete Crew Setup</Button>
            </Link>
            <Link href="/profile">
              <Button variant="outline">Back to profile</Button>
            </Link>
          </CardContent>
        </Card>

        {hasEventWork && (
          <CrewWorkPanel
            assignments={assignments}
            loading={workLoading}
            title="Your crew assignments"
            description="Your invited event work is already active here while you complete your profile."
          />
        )}
      </div>
    )
  }

  if (!provider || !providerProfile) {
    return null
  }

  const pendingBookings = bookings.filter(b => b.state === 'pending')
  const activeBookings = bookings.filter(b => ['accepted', 'confirmed'].includes(b.state))
  const completedBookings = bookings.filter(b => b.state === 'completed')
  const hasWorkModeEnabled = provider.work_mode === 'looking_for_work' || provider.work_mode === 'both'
  const hasServiceModeEnabled = provider.work_mode === 'offering_services' || provider.work_mode === 'both'
  const activeAssignments = assignments.filter((assignment) => assignment.status === 'active' && !assignment.isPast)
  const crewModeLabel = CREW_WORK_MODE_LABELS[(provider.work_mode || 'offering_services') as keyof typeof CREW_WORK_MODE_LABELS] || 'Offering services'
  const rateLabel = provider.base_rate ? `${formatCurrency(provider.base_rate)} ${PRICE_TYPE_LABELS[(provider.rate_type || 'daily') as keyof typeof PRICE_TYPE_LABELS].toLowerCase()}` : 'Rate not set yet'
  const workRolesLabel = Array.isArray(provider.work_roles) && provider.work_roles.length > 0 ? provider.work_roles.join(' • ') : 'Add your crew skills in setup'
  const totalLiveWork = activeBookings.length + activeAssignments.length
  const defaultTab = hasWorkModeEnabled || hasEventWork ? 'work' : 'services'

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold">Crew Dashboard</h1>
            <Badge variant={provider.is_available ? 'default' : 'secondary'} className={provider.is_available ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
              {provider.is_available ? 'Available' : 'Paused'}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {provider.business_name} • {provider.is_available ? `${provider.advance_notice_days || 0} days notice` : 'Not taking new bookings right now'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/crew/${provider.id}`}>
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              View Crew Profile
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
              <div className="p-2 bg-blue-100 rounded-lg">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalLiveWork}</p>
                <p className="text-sm text-muted-foreground">Live Work</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links to Profile Management */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <Link href="/dashboard/provider/setup">
          <Card className="hover:bg-neutral-50 transition-colors cursor-pointer h-full border-orange-500">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                  <Edit className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">Edit Crew Profile</p>
                  <p className="text-xs text-muted-foreground">Update your setup</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
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

      <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/10 via-background to-primary/5">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Crew mode</p>
              <p className="font-semibold">{crewModeLabel}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Starting rate</p>
              <p className="font-semibold">{rateLabel}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Skills and roles</p>
              <p className="font-semibold">{workRolesLabel}</p>
            </div>
          </div>
          {provider.availability_notes && (
            <div className="mt-4 rounded-lg bg-background/80 p-3 text-sm text-muted-foreground">
              {provider.availability_notes}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="work">
            My Work
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-2">{activeCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="services">
            My Services
            {(pendingBookings.length > 0 || services.length > 0) && (
              <Badge variant="secondary" className="ml-2">{pendingBookings.length + services.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="work" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Event Work</CardTitle>
              <CardDescription>
                Staff invites and direct event work hires live here. Artists and service provider bookings do not use invite links.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <Badge variant={hasWorkModeEnabled || hasEventWork ? 'default' : 'secondary'}>
                {hasWorkModeEnabled || hasEventWork ? 'My Work active' : 'My Work not enabled yet'}
              </Badge>
              {!hasWorkModeEnabled && (
                <Button
                  variant="outline"
                  onClick={() => handleModeEnable('work')}
                  disabled={updatingMode === 'work'}
                >
                  {updatingMode === 'work' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Enable My Work
                </Button>
              )}
            </CardContent>
          </Card>

          <CrewWorkPanel
            assignments={assignments}
            loading={workLoading}
            title="Active, upcoming and past event work"
            description="Every invited staff job and work history entry shows here on your profile."
          />
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Services</CardTitle>
              <CardDescription>
                Public service offerings, service bookings, and nearby hire opportunities belong here. No invite link is used for services.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <Badge variant={hasServiceModeEnabled || services.length > 0 ? 'default' : 'secondary'}>
                {hasServiceModeEnabled || services.length > 0 ? 'My Services active' : 'My Services not enabled yet'}
              </Badge>
              {!hasServiceModeEnabled && (
                <Button
                  variant="outline"
                  onClick={() => handleModeEnable('services')}
                  disabled={updatingMode === 'services'}
                >
                  {updatingMode === 'services' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Enable My Services
                </Button>
              )}
              <Link href="/dashboard/provider/services">
                <Button variant="outline">Manage Services</Button>
              </Link>
            </CardContent>
          </Card>

          {pendingBookings.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <p className="font-medium">
                    You have {pendingBookings.length} pending service booking request{pendingBookings.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bookings Tab */}
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
                            booking.state === 'disputed' ? 'outline' :
                            'destructive'
                          } className={
                            booking.state === 'pending' ? 'border-yellow-500 text-yellow-600' :
                            booking.state === 'completed' ? 'bg-green-100 text-green-700' :
                            booking.state === 'disputed' ? 'border-orange-500 text-orange-700 bg-orange-50' : ''
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
                        {booking.state === 'pending' && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            You can accept this offer as-is or use messages to negotiate with the organiser.
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold text-lg text-orange-600">
                          {formatCurrency(booking.offered_amount)}
                        </p>
                        
                        <div className="flex gap-2 mt-2 flex-wrap justify-end">
                          {booking.state === 'pending' && (
                            <>
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
                                variant="outline"
                                onClick={() => booking.organizer?.id && handleMessageOrganizer(booking.organizer.id, booking.id)}
                                disabled={startingChatBookingId === booking.id || !booking.organizer?.id}
                              >
                                {startingChatBookingId === booking.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : null}
                                Message Organizer
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
                            </>
                          )}
                          <Link
                            href={{
                              pathname: '/support',
                              query: {
                                new: '1',
                                category: 'event',
                                priority: 'high',
                                subject: `Crew service booking issue: ${booking.event?.title || 'Booking'}`,
                                message: `I need help with this crew service booking. Event: ${booking.event?.title || 'Unknown'}. Status: ${booking.state}. Service: ${booking.service?.service_name || 'Unknown'}.`,
                              },
                            }}
                          >
                            <Button size="sm" variant="outline">Need help</Button>
                          </Link>
                          {booking.state === 'confirmed' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-orange-600 hover:text-orange-700"
                              onClick={() => { setDisputeBookingId(booking.id); setDisputeReason('') }}
                            >
                              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                              Dispute
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Service offerings</h3>
              <p className="text-sm text-muted-foreground">Manage what organisers can hire you for publicly.</p>
            </div>

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
          </div>
        </TabsContent>
      </Tabs>

      {/* Dispute Dialog */}
      <Dialog open={!!disputeBookingId} onOpenChange={(open) => { if (!open) { setDisputeBookingId(null); setDisputeReason('') } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Open a Dispute
            </DialogTitle>
            <DialogDescription>
              Disputes freeze escrow funds until our team reviews the case. Describe the issue clearly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="provider-dispute-reason">Reason</Label>
            <Textarea
              id="provider-dispute-reason"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="e.g. The organizer has not communicated and the event is approaching."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">Our team will review within 2 business days.</p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setDisputeBookingId(null); setDisputeReason('') }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={disputeLoading || !disputeReason.trim()}
              onClick={handleDispute}
            >
              {disputeLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Dispute
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
