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
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, CheckCircle, XCircle, Loader2, MessageSquare, HandCoins } from 'lucide-react'
import { toast } from 'sonner'
import type { Booking } from '@/types/database'

interface BookingActionsProps {
  booking: Booking
}

export function BookingActions({ booking }: BookingActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [messaging, setMessaging] = useState(false)
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [declineNotes, setDeclineNotes] = useState('')
  const [showCounterDialog, setShowCounterDialog] = useState(false)
  const [counterNotes, setCounterNotes] = useState('')
  const [counterAmount, setCounterAmount] = useState(
    String(Number(booking.final_amount ?? booking.offered_amount ?? 0))
  )

  // Dispute state
  const [showDisputeDialog, setShowDisputeDialog] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeLoading, setDisputeLoading] = useState(false)

  const handleAccept = async () => {
    setLoading(true)

    try {
      const response = await fetch(`/api/bookings/${booking.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to accept booking')

      toast.success('Booking accepted! The organizer will be notified.')
      router.refresh()
      
    } catch (error) {
      console.error('Error accepting booking:', error)
      toast.error('Failed to accept booking. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleMessageOrganizer = async () => {
    if (!booking.organizer_id) {
      toast.error('Organizer contact is unavailable for this booking.')
      return
    }

    setMessaging(true)
    try {
      const response = await fetch('/api/conversations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: booking.organizer_id,
          contextType: 'booking',
          contextId: booking.id,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start conversation')
      }

      router.push(`/messages?chat=${data.conversationId}`)
    } catch (error) {
      console.error('Error starting organizer conversation:', error)
      toast.error('Failed to open messages. Please try again.')
    } finally {
      setMessaging(false)
    }
  }

  const handleDecline = async () => {
    setLoading(true)

    try {
      const response = await fetch(`/api/bookings/${booking.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decline',
          notes: declineNotes,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to decline booking')

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

  const handleCounterOffer = async () => {
    const parsedAmount = Number(counterAmount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid counter-offer amount')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/bookings/${booking.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'counter',
          counterAmount: parsedAmount,
          notes: counterNotes,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to send counter-offer')

      toast.success('Counter-offer sent to organizer.')
      setShowCounterDialog(false)
      router.refresh()
    } catch (error) {
      console.error('Error sending counter-offer:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send counter-offer')
    } finally {
      setLoading(false)
    }
  }

  if (booking.state !== 'pending') {
    // Show dispute button for confirmed bookings
    if (booking.state === 'confirmed') {
      return (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="text-orange-600 hover:text-orange-700"
            onClick={() => setShowDisputeDialog(true)}
          >
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Dispute
          </Button>

          <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
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
                <Label htmlFor="dispute-reason">Reason</Label>
                <Textarea
                  id="dispute-reason"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="e.g. The organizer has not responded and the event date has passed."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">Our team will review within 2 business days.</p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDisputeDialog(false)}>Cancel</Button>
                <Button
                  variant="destructive"
                  disabled={disputeLoading || !disputeReason.trim()}
                  onClick={async () => {
                    setDisputeLoading(true)
                    try {
                      const res = await fetch(`/api/bookings/${booking.id}/dispute`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reason: disputeReason.trim() }),
                      })
                      const data = await res.json()
                      if (!res.ok) throw new Error(data.error)
                      toast.success(data.message ?? 'Dispute opened — our team will review within 2 business days')
                      setShowDisputeDialog(false)
                      router.refresh()
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Failed to open dispute')
                    } finally {
                      setDisputeLoading(false)
                    }
                  }}
                >
                  {disputeLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Submit Dispute
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )
    }
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

      <Button
        variant="outline"
        onClick={handleMessageOrganizer}
        disabled={loading || messaging}
      >
        {messaging ? (
          <Loader2 className="h-4 w-4 animate-spin mr-1" />
        ) : (
          <MessageSquare className="h-4 w-4 mr-1" />
        )}
        Message
      </Button>

      <Dialog open={showCounterDialog} onOpenChange={setShowCounterDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" disabled={loading}>
            <HandCoins className="h-4 w-4 mr-1" />
            Counter Offer
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Propose a Counter-Offer</DialogTitle>
            <DialogDescription>
              Suggest a different amount for this booking. The organizer can accept it and proceed to payment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="counter-amount">Counter amount (ZAR)</Label>
              <Input
                id="counter-amount"
                type="number"
                min="1"
                step="0.01"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="counter-notes">Message (optional)</Label>
              <Textarea
                id="counter-notes"
                placeholder="Explain your proposed amount or terms"
                value={counterNotes}
                onChange={(e) => setCounterNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCounterDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCounterOffer} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Send Counter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
