'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Booking } from '@/types/database'

interface BookingActionsProps {
  booking: Booking
}

export function BookingActions({ booking }: BookingActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [declineNotes, setDeclineNotes] = useState('')

  const handleAccept = async () => {
    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'accepted',
          artist_notes: 'Booking accepted!'
        })
        .eq('id', booking.id)

      if (error) throw error

      toast.success('Booking accepted! The organizer will be notified.')
      router.refresh()
      
    } catch (error) {
      console.error('Error accepting booking:', error)
      toast.error('Failed to accept booking. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDecline = async () => {
    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'declined',
          artist_notes: declineNotes || 'Booking declined.'
        })
        .eq('id', booking.id)

      if (error) throw error

      toast.success('Booking declined.')
      setShowDeclineDialog(false)
      router.refresh()
      
    } catch (error) {
      console.error('Error declining booking:', error)
      toast.error('Failed to decline booking. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (booking.status !== 'pending') {
    return null
  }

  return (
    <div className="flex gap-2">
      <Button 
        onClick={handleAccept} 
        disabled={loading}
        className="gap-1"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle className="h-4 w-4" />
        )}
        Accept
      </Button>

      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" disabled={loading}>
            <XCircle className="h-4 w-4 mr-1" />
            Decline
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Booking</DialogTitle>
            <DialogDescription>
              Let the organizer know why you&apos;re declining this booking (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="notes">Reason (optional)</Label>
              <Input
                id="notes"
                placeholder="e.g. I have another commitment that day"
                value={declineNotes}
                onChange={(e) => setDeclineNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowDeclineDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDecline}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Confirm Decline
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
