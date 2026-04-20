'use client'

import { useEffect, useState } from 'react'
import { Mail, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface ContactOrganizerDialogProps {
  eventId: string
  eventTitle: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

export function ContactOrganizerDialog({
  eventId,
  eventTitle,
  variant = 'outline',
  size = 'sm',
}: ContactOrganizerDialogProps) {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  })

  useEffect(() => {
    if (!profile) return

    setForm((prev) => ({
      ...prev,
      name: prev.name || profile.full_name || '',
      email: prev.email || profile.email || '',
      phone: prev.phone || profile.phone || '',
    }))
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Please complete your name, email, and message')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/events/${eventId}/contact-organizer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to contact organiser')
      }

      toast.success('Your message has been sent to the organiser')
      setForm((prev) => ({ ...prev, message: '' }))
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Mail className="mr-2 h-4 w-4" />
          Contact Organiser
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Contact organiser</DialogTitle>
          <DialogDescription>
            Send a message about {eventTitle}. Ziyawa will deliver it to the organiser by email.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Your full name"
              />
            </div>
            <div>
              <Label htmlFor="contact-phone">Phone number</Label>
              <Input
                id="contact-phone"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Optional phone number"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <Label htmlFor="contact-message">Message</Label>
            <Textarea
              id="contact-message"
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              rows={6}
              placeholder="Ask about timing, entry, seating, or any event question"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Send message
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
