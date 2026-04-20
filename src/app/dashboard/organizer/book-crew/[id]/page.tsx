'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  ArrowLeft,
  Loader2,
  Calendar,
  MapPin,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { 
  type Provider, 
  type ProviderService, 
  type Event,
  SERVICE_CATEGORY_LABELS,
  PRICE_TYPE_LABELS,
  type SaProvince
} from '@/types/database'
import { formatCurrency } from '@/lib/helpers'
import { toast } from 'sonner'

// Province labels
const PROVINCE_LABELS: Record<SaProvince, string> = {
  gauteng: 'Gauteng',
  western_cape: 'Western Cape',
  kwazulu_natal: 'KwaZulu-Natal',
  eastern_cape: 'Eastern Cape',
  free_state: 'Free State',
  mpumalanga: 'Mpumalanga',
  limpopo: 'Limpopo',
  north_west: 'North West',
  northern_cape: 'Northern Cape',
}

interface ProviderWithProfile extends Provider {
  profile?: {
    full_name: string | null
    email?: string | null
    phone?: string | null
  }
}

export default function BookCrewPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile } = useAuth()
  const providerId = params.id as string
  const preselectedEventId = searchParams.get('event')
  const requestedMode = searchParams.get('mode') === 'work' ? 'work' : 'services'

  const [provider, setProvider] = useState<ProviderWithProfile | null>(null)
  const [services, setServices] = useState<ProviderService[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [bookingMode, setBookingMode] = useState<'services' | 'work'>(requestedMode)
  const [selectedEventId, setSelectedEventId] = useState(preselectedEventId || '')
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [workRole, setWorkRole] = useState('event_ops')
  const [offeredAmount, setOfferedAmount] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [specialRequirements, setSpecialRequirements] = useState('')

  useEffect(() => {
    if (!profile) {
      router.push('/auth/signin')
      return
    }

    if (!profile.is_organizer) {
      router.push('/profile')
      toast.error('Only organisers can book crew')
      return
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, providerId, router])

  const fetchData = async () => {
    if (!profile) return

    setLoading(true)
    try {
      const supabase = createClient()

      // Fetch provider
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select(`
          *,
          profile:profiles(full_name, email, phone)
        `)
        .eq('id', providerId)
        .single()

      if (providerError || !providerData) {
        toast.error('Provider not found')
        router.push('/crew')
        return
      }

      setProvider(providerData)

      const supportsWork = providerData.work_mode === 'looking_for_work' || providerData.work_mode === 'both'
      const supportsServices = providerData.work_mode === 'offering_services' || providerData.work_mode === 'both'

      if (requestedMode === 'work' && !supportsWork && supportsServices) {
        setBookingMode('services')
      }
      if (requestedMode === 'services' && !supportsServices && supportsWork) {
        setBookingMode('work')
      }

      // Fetch services
      const { data: servicesData } = await supabase
        .from('provider_services')
        .select('*')
        .eq('provider_id', providerId)
        .eq('is_available', true)
        .order('base_price', { ascending: true })

      setServices(servicesData || [])

      const supportsWorkAfterLoad = providerData.work_mode === 'looking_for_work' || providerData.work_mode === 'both'
      const supportsServicesAfterLoad = providerData.work_mode === 'offering_services' || providerData.work_mode === 'both' || (servicesData?.length || 0) > 0

      if (requestedMode === 'work' && !supportsWorkAfterLoad && supportsServicesAfterLoad) {
        setBookingMode('services')
      }
      if (requestedMode === 'services' && !supportsServicesAfterLoad && supportsWorkAfterLoad) {
        setBookingMode('work')
      }

      // Pre-select first service and set default amount
      if (servicesData && servicesData.length > 0) {
        setSelectedServiceId(servicesData[0].id)
        setOfferedAmount(servicesData[0].base_price.toString())
      }

      // Fetch organiser's upcoming events (published or locked)
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', profile.id)
        .in('state', ['published', 'locked'])
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })

      setEvents(eventsData || [])

      // Pre-select event if passed in URL
      if (preselectedEventId && eventsData?.some(e => e.id === preselectedEventId)) {
        setSelectedEventId(preselectedEventId)
      } else if (eventsData && eventsData.length > 0) {
        setSelectedEventId(eventsData[0].id)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Update offered amount when service changes
  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId)
    const service = services.find(s => s.id === serviceId)
    if (service) {
      setOfferedAmount((service.base_price * quantity).toString())
    }
  }

  // Update offered amount when quantity changes
  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(newQuantity)
    const service = services.find(s => s.id === selectedServiceId)
    if (service) {
      setOfferedAmount((service.base_price * newQuantity).toString())
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!selectedEventId) {
      toast.error('Please select an event')
      return
    }

    if (bookingMode === 'services' && !selectedServiceId) {
      toast.error('Please select a service')
      return
    }

    if (!offeredAmount || parseFloat(offeredAmount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    const selectedEvent = events.find(e => e.id === selectedEventId)
    if (!selectedEvent) {
      toast.error('Invalid event selected')
      return
    }

    setSubmitting(true)
    try {
      const supabase = createClient()

      if (bookingMode === 'work') {
        const response = await fetch(`/api/events/${selectedEventId}/team`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'invite',
            fullName: provider?.profile?.full_name || provider?.business_name || 'Crew member',
            email: provider?.profile?.email || provider?.business_email || '',
            phone: provider?.profile?.phone || provider?.business_phone || '',
            role: workRole,
            offeredRate: parseFloat(offeredAmount),
            inviteMessage: specialRequirements.trim() || '',
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to send work invite')
        }

        toast.success('Event work invite sent!')
        router.push(`/dashboard/organizer/events/${selectedEventId}/team`)
        return
      }

      const { data: newBooking, error } = await supabase
        .from('provider_bookings')
        .insert({
          event_id: selectedEventId,
          provider_id: providerId,
          service_id: selectedServiceId,
          organizer_id: profile!.id,
          offered_amount: parseFloat(offeredAmount),
          service_date: selectedEvent.event_date,
          quantity: quantity,
          special_requirements: specialRequirements.trim() || null,
          organizer_notes: specialRequirements.trim() || null,
        })
        .select('id')
        .single()

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already booked this service for this event')
        } else {
          throw error
        }
        return
      }

      toast.success('Booking request sent! 🎉')

      // Auto-open conversation linked to this booking
      try {
        const convoRes = await fetch('/api/conversations/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientId: provider?.profile_id,
            contextType: 'provider_booking',
            contextId: newBooking.id,
          }),
        })
        const convoData = await convoRes.json()
        if (convoData.conversationId) {
          router.push(`/messages?chat=${convoData.conversationId}`)
          return
        }
      } catch {
        // fallback to crew dashboard if chat fails
      }
      router.push('/dashboard/organizer/crew')
    } catch (error) {
      console.error('Error creating booking:', error)
      toast.error('Failed to send booking request')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !profile) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!provider) {
    return null
  }

  const selectedService = services.find(s => s.id === selectedServiceId)
  const selectedEvent = events.find(e => e.id === selectedEventId)

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Back Button */}
      <Link href={`/crew/${providerId}`} className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Provider
      </Link>

      {/* Provider Info */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={provider.profile_image || undefined} />
              <AvatarFallback className="text-xl bg-orange-100 text-orange-600">
                {provider.business_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{provider.business_name}</h2>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge variant="outline">
                  {SERVICE_CATEGORY_LABELS[provider.primary_category]}
                </Badge>
                {(provider.work_mode === 'looking_for_work' || provider.work_mode === 'both') && (
                  <Badge variant="secondary">Event Staff</Badge>
                )}
                {(provider.work_mode === 'offering_services' || provider.work_mode === 'both' || services.length > 0) && (
                  <Badge variant="outline">Service Provider</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {PROVINCE_LABELS[provider.location]}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Form */}
      <Card>
        <CardHeader>
          <CardTitle>{bookingMode === 'work' ? 'Hire for Event Work' : 'Book Services'}</CardTitle>
          <CardDescription>
            {bookingMode === 'work'
              ? 'Send a staff hire invite with your offered rate. They can accept or negotiate in messages.'
              : 'Send a service booking request for your event. They can accept or negotiate in messages.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No upcoming events</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You need a published event to book crew
              </p>
              <Link href="/dashboard/organizer/events/new">
                <Button>Create Event</Button>
              </Link>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No services available</h3>
              <p className="text-sm text-muted-foreground">
                This provider hasn&apos;t listed any services yet
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {(provider.work_mode === 'both' || (provider.work_mode === 'looking_for_work' && services.length > 0)) && (
                <div className="grid gap-2 md:grid-cols-2">
                  <Button
                    type="button"
                    variant={bookingMode === 'work' ? 'default' : 'outline'}
                    onClick={() => setBookingMode('work')}
                  >
                    Hire for Event Work
                  </Button>
                  <Button
                    type="button"
                    variant={bookingMode === 'services' ? 'default' : 'outline'}
                    onClick={() => setBookingMode('services')}
                  >
                    Book Services
                  </Button>
                </div>
              )}

              {/* Select Event */}
              <div>
                <Label htmlFor="event">Select Event *</Label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {event.title} - {new Date(event.event_date).toLocaleDateString()}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedEvent && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedEvent.venue} • {PROVINCE_LABELS[selectedEvent.location as SaProvince]}
                  </p>
                )}
              </div>

              {bookingMode === 'services' ? (
                <>
                  <div>
                    <Label htmlFor="service">Select Service *</Label>
                    <Select value={selectedServiceId} onValueChange={handleServiceChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            <div className="flex justify-between items-center w-full">
                              <span>{service.service_name}</span>
                              <span className="text-muted-foreground ml-2">
                                {formatCurrency(service.base_price)} ({PRICE_TYPE_LABELS[service.price_type]})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedService?.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedService.description}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      max={100}
                      value={quantity}
                      onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      How many units/hours/days do you need?
                    </p>
                  </div>
                </>
              ) : (
                <div>
                  <Label htmlFor="work-role">Staff role needed *</Label>
                  <Select value={workRole} onValueChange={setWorkRole}>
                    <SelectTrigger id="work-role">
                      <SelectValue placeholder="Choose a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="door_staff">Door Staff</SelectItem>
                      <SelectItem value="guest_list_staff">Guest List Staff</SelectItem>
                      <SelectItem value="event_ops">Event Ops Lead</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Send the role and shift offer you want this crew member to review.
                  </p>
                </div>
              )}

              {/* Offered Amount */}
              <div>
                <Label htmlFor="amount">{bookingMode === 'work' ? 'Your Rate Offer (R) *' : 'Your Offer (R) *'}</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={offeredAmount}
                  onChange={(e) => setOfferedAmount(e.target.value)}
                  required
                />
                {bookingMode === 'services' && selectedService && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Listed service price: {formatCurrency(selectedService.base_price)} × {quantity} = {formatCurrency(selectedService.base_price * quantity)}. You can still send a different offer.
                  </p>
                )}
                {bookingMode === 'work' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Send the shift rate you want to offer. They can accept it or message you to negotiate.
                  </p>
                )}
              </div>

              {/* Special Requirements */}
              <div>
                <Label htmlFor="requirements">Special Requirements / Notes</Label>
                <Textarea
                  id="requirements"
                  placeholder="Any specific requirements, timing details, or questions..."
                  value={specialRequirements}
                  onChange={(e) => setSpecialRequirements(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Summary */}
              {selectedEvent && (bookingMode === 'work' || selectedService) && (
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-2">Booking Summary</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Event:</strong> {selectedEvent.title}</p>
                      <p><strong>Date:</strong> {new Date(selectedEvent.event_date).toLocaleDateString()}</p>
                      {bookingMode === 'work' ? (
                        <>
                          <p><strong>Hire type:</strong> Event Work</p>
                          <p><strong>Role:</strong> {workRole.replaceAll('_', ' ')}</p>
                        </>
                      ) : (
                        <>
                          <p><strong>Service:</strong> {selectedService?.service_name}</p>
                          <p><strong>Quantity:</strong> {quantity}</p>
                        </>
                      )}
                      <p className="text-lg font-bold text-orange-600 mt-2">
                        Offer: {formatCurrency(parseFloat(offeredAmount) || 0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                type="submit" 
                className="w-full bg-orange-500 hover:bg-orange-600"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                {bookingMode === 'work' ? 'Send Event Work Invite' : 'Send Booking Request'}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                {bookingMode === 'work'
                  ? 'They can accept your invite or message you to discuss rate and details.'
                  : 'The provider can accept your offer or message you to negotiate before payment.'}
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
