'use client'

import { useEffect, useState } from 'react'
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
import { ArrowLeft, Loader2, Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PROVINCES } from '@/lib/constants'
import { toast } from 'sonner'
import { useAuth } from '@/components/providers/auth-provider'
import { use } from 'react'

interface EditEventPageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditEventPage({ params }: EditEventPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    venue: '',
    location: '',
    event_date: '',
    start_time: '',
    end_time: '',
    ticket_price: '',
    capacity: '',
    state: 'draft',
  })

  useEffect(() => {
    if (authLoading) return
    
    if (!profile) {
      router.push('/auth/signin')
      return
    }

    fetchEvent()
  }, [id, profile, authLoading, router])

  const fetchEvent = async () => {
    try {
      const supabase = createClient()
      
      const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      if (!event) {
        toast.error('Event not found')
        router.push('/dashboard/organizer')
        return
      }

      // Check if user owns this event
      if (event.organizer_id !== profile?.id) {
        toast.error('You do not have permission to edit this event')
        router.push('/dashboard/organizer')
        return
      }

      setFormData({
        title: event.title || '',
        description: event.description || '',
        venue: event.venue || '',
        location: event.location || '',
        event_date: event.event_date || '',
        start_time: event.start_time || '',
        end_time: event.end_time || '',
        ticket_price: event.ticket_price?.toString() || '0',
        capacity: event.capacity?.toString() || '100',
        state: event.state || 'draft',
      })
    } catch (error) {
      console.error('Error fetching event:', error)
      toast.error('Failed to load event')
      router.push('/dashboard/organizer')
    } finally {
      setLoading(false)
    }
  }

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

    setSaving(true)

    try {
      const supabase = createClient()

      // Check if organizer already has another event on the same day (excluding this event)
      const { data: existingEvents, error: checkError } = await supabase
        .from('events')
        .select('id, title')
        .eq('organizer_id', profile.id)
        .eq('event_date', formData.event_date)
        .neq('id', id)
      
      if (checkError) throw checkError

      if (existingEvents && existingEvents.length > 0) {
        toast.error(`You already have an event scheduled on this date: "${existingEvents[0].title}". Please choose a different date.`)
        setSaving(false)
        return
      }

      const { error } = await supabase
        .from('events')
        .update({
          title: formData.title,
          description: formData.description || null,
          venue: formData.venue,
          location: formData.location,
          event_date: formData.event_date,
          start_time: formData.start_time,
          end_time: formData.end_time || null,
          ticket_price: parseFloat(formData.ticket_price) || 0,
          capacity: parseInt(formData.capacity) || 100,
        })
        .eq('id', id)

      if (error) throw error

      toast.success('Event updated successfully!')
      router.push('/dashboard/organizer')
      
    } catch (error) {
      console.error('Error updating event:', error)
      toast.error('Failed to update event. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('events')
        .update({ 
          state: 'published',
          is_published: true 
        })
        .eq('id', id)

      if (error) throw error

      toast.success('Event published! It is now visible to everyone.')
      setFormData(prev => ({ ...prev, state: 'published' }))
    } catch (error) {
      console.error('Error publishing event:', error)
      toast.error('Failed to publish event')
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link href="/dashboard/organizer" className="inline-flex items-center text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Edit Event</CardTitle>
              <CardDescription>
                Update your event details
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Link href={`/dashboard/organizer/events/${id}/media`}>
                <Button variant="outline" size="sm">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Media
                </Button>
              </Link>
              {formData.state === 'draft' && (
                <Button onClick={handlePublish} disabled={saving} variant="outline" size="sm">
                  Publish Event
                </Button>
              )}
            </div>
          </div>
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

            {/* Tickets */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ticket_price">Ticket Price (ZAR) *</Label>
                <Input
                  id="ticket_price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0 for free event"
                  value={formData.ticket_price}
                  onChange={(e) => updateField('ticket_price', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="capacity">Capacity *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  placeholder="e.g. 500"
                  value={formData.capacity}
                  onChange={(e) => updateField('capacity', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
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
