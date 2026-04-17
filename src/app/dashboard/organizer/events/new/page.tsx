'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PROVINCES } from '@/lib/constants'
import { toast } from 'sonner'
import { useAuth } from '@/components/providers/auth-provider'
import { TicketTierEditor } from '@/components/events/ticket-tier-editor'
import { createEmptyTier, getEventCapacityFromTiers, getStartingPriceFromTiers, normalizeTierPayload } from '@/lib/ticketing'

export default function NewEventPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    venue: '',
    location: '',
    event_date: '',
    start_time: '',
    end_time: '',
  })
  const [ticketTiers, setTicketTiers] = useState([
    createEmptyTier({
      name: 'General Admission',
      price: '150',
      quantity: '100',
    }),
  ])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!profile) {
      toast.error('You must be logged in')
      return
    }

    if (!formData.event_date) {
      toast.error('Please select an event date')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Check if organizer already has an event on the same day
      const { data: existingEvents, error: checkError } = await supabase
        .from('events')
        .select('id, title')
        .eq('organizer_id', profile.id)
        .eq('event_date', formData.event_date)
      
      if (checkError) throw checkError

      if (existingEvents && existingEvents.length > 0) {
        toast.error(`You already have an event scheduled on this date: "${existingEvents[0].title}". Please choose a different date.`)
        setLoading(false)
        return
      }

      const normalizedTiers = normalizeTierPayload(ticketTiers)

      if (normalizedTiers.length === 0) {
        toast.error('Please add at least one valid ticket tier')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('events')
        .insert({
          organizer_id: profile.id,
          title: formData.title,
          description: formData.description || null,
          venue: formData.venue,
          location: formData.location,
          event_date: formData.event_date,
          start_time: formData.start_time,
          end_time: formData.end_time || null,
          ticket_price: getStartingPriceFromTiers(ticketTiers),
          capacity: getEventCapacityFromTiers(ticketTiers),
          state: 'draft',
          is_published: false,
        })
        .select()
        .single()

      if (error) throw error

      const { error: tierError } = await supabase
        .from('event_ticket_types')
        .insert(
          normalizedTiers.map((tier) => ({
            event_id: data.id,
            name: tier.name,
            description: tier.description,
            price: tier.price,
            quantity: tier.quantity,
            sold_count: 0,
            sales_start: tier.sales_start,
            sales_end: tier.sales_end,
            sort_order: tier.sort_order,
            is_active: tier.is_active,
            is_public: tier.is_public,
          }))
        )

      if (tierError && tierError.code !== 'PGRST205') {
        console.error('Error saving ticket tiers:', tierError)
      }

      toast.success('Event created successfully. Ticket tiers and media can now be finalized.')
      router.push(`/dashboard/organizer/events/${data.id}/media`)
      
    } catch (error) {
      console.error('Error creating event:', error)
      toast.error('Failed to create event. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link href="/dashboard/organizer" className="inline-flex items-center text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create New Event</CardTitle>
          <CardDescription>
            Fill in the details for your event. First save the draft, then add media, review everything, and publish when ready.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Amapiano Sundays"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Tell people what your event is about..."
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="venue">Venue *</Label>
                <Input
                  id="venue"
                  placeholder="e.g. The Venue, Melrose Arch"
                  value={formData.venue}
                  onChange={(e) => updateField('venue', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="location">Province *</Label>
                <Select
                  value={formData.location}
                  onValueChange={(value) => updateField('location', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROVINCES).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="event_date">Event Date *</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => updateField('event_date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div>
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => updateField('start_time', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => updateField('end_time', e.target.value)}
                />
              </div>
            </div>

            <TicketTierEditor tiers={ticketTiers} onChange={setTicketTiers} />

            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              Your event will be saved as a draft first so you can upload posters, gallery media, review your ticket setup, and publish when ready.
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Event & Add Media'
                )}
              </Button>
              <Link href="/dashboard/organizer">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
