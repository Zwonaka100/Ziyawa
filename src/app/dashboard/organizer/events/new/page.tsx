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
    ticket_price: '',
    capacity: '',
    publish_now: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!profile) {
      toast.error('You must be logged in')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

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
          ticket_price: parseFloat(formData.ticket_price) || 0,
          capacity: parseInt(formData.capacity) || 100,
          state: formData.publish_now ? 'published' : 'draft',
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Event created successfully!')
      router.push('/dashboard/organizer')
      
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
            Fill in the details for your event. You can save as draft and publish later.
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

            {/* Publish Option */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="publish_now"
                checked={formData.publish_now}
                onChange={(e) => updateField('publish_now', e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="publish_now" className="text-sm">
                Publish immediately (make visible on Ziwaphi?)
              </Label>
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
                  'Create Event'
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
