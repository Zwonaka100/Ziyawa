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
  Clock,
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
  }
}

export default function BookCrewPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile } = useAuth()
  const providerId = params.id as string
  const preselectedEventId = searchParams.get('event')

  const [provider, setProvider] = useState<ProviderWithProfile | null>(null)
  const [services, setServices] = useState<ProviderService[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [selectedEventId, setSelectedEventId] = useState(preselectedEventId || '')
  const [selectedServiceId, setSelectedServiceId] = useState('')
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
          profile:profiles(full_name)
        `)
        .eq('id', providerId)
        .single()

      if (providerError || !providerData) {
        toast.error('Provider not found')
        router.push('/crew')
        return
      }

      setProvider(providerData)

      // Fetch services
      const { data: servicesData } = await supabase
        .from('provider_services')
        .select('*')
        .eq('provider_id', providerId)
        .eq('is_available', true)
        .order('base_price', { ascending: true })

      setServices(servicesData || [])

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

    if (!selectedServiceId) {
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

      const { error } = await supabase
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

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already booked this service for this event')
        } else {
          throw error
        }
        return
      }

      toast.success('Booking request sent! 🎉')
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
              <Badge variant="outline" className="mt-1">
                {SERVICE_CATEGORY_LABELS[provider.primary_category]}
              </Badge>
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
          <CardTitle>Book This Provider</CardTitle>
          <CardDescription>
            Send a booking request for your event
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

              {/* Select Service */}
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

              {/* Quantity */}
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

              {/* Offered Amount */}
              <div>
                <Label htmlFor="amount">Your Offer (R) *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={offeredAmount}
                  onChange={(e) => setOfferedAmount(e.target.value)}
                  required
                />
                {selectedService && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Provider&apos;s base rate: {formatCurrency(selectedService.base_price)} × {quantity} = {formatCurrency(selectedService.base_price * quantity)}
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
              {selectedEvent && selectedService && (
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-2">Booking Summary</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Event:</strong> {selectedEvent.title}</p>
                      <p><strong>Date:</strong> {new Date(selectedEvent.event_date).toLocaleDateString()}</p>
                      <p><strong>Service:</strong> {selectedService.service_name}</p>
                      <p><strong>Quantity:</strong> {quantity}</p>
                      <p className="text-lg font-bold text-orange-600 mt-2">
                        Total: {formatCurrency(parseFloat(offeredAmount) || 0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Submit */}
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
                Send Booking Request
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                The provider will review your request and respond. Payment is only required after they accept.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
