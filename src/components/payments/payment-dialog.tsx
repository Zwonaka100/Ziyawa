'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/helpers'
import { calculateTicketSaleBreakdown } from '@/lib/constants'
import { toast } from 'sonner'
import type { Event, Profile } from '@/types/database'
import { Loader2, CreditCard, Shield, Gift } from 'lucide-react'
import type { EventTicketTier } from '@/lib/ticketing'

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: Event
  user: Profile
  quantity?: number
  selectedTier?: EventTicketTier
}

interface TicketAttendeeInput {
  fullName: string
  email: string
  phone: string
}

export function PaymentDialog({ open, onOpenChange, event, user, quantity = 1, selectedTier }: PaymentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [attendees, setAttendees] = useState<TicketAttendeeInput[]>([])
  const _router = useRouter()

  // Calculate fees using our fee structure
  const unitPrice = Number(selectedTier?.price ?? event.ticket_price ?? 0)
  const ticketBasePriceCents = unitPrice * 100 * quantity // Convert Rands to cents
  const breakdown = calculateTicketSaleBreakdown(ticketBasePriceCents)
  const totalAmount = breakdown.buyerTotal // This is what the buyer pays (in cents)

  useEffect(() => {
    if (!open) return

    setAttendees((current) => Array.from({ length: quantity }, (_, index) => current[index] || {
      fullName: user.full_name || '',
      email: user.email || '',
      phone: '',
    }))
  }, [open, quantity, user.email, user.full_name])

  const updateAttendee = (index: number, field: keyof TicketAttendeeInput, value: string) => {
    setAttendees((current) => current.map((attendee, attendeeIndex) => (
      attendeeIndex === index
        ? { ...attendee, [field]: value }
        : attendee
    )))
  }

  const giftedCount = attendees.filter((attendee) => attendee.email.trim().toLowerCase() !== (user.email || '').trim().toLowerCase()).length

  const handlePayment = async () => {
    setLoading(true)

    try {
      const cleanedAttendees = attendees.map((attendee) => ({
        fullName: attendee.fullName.trim(),
        email: attendee.email.trim(),
        phone: attendee.phone.trim(),
      }))

      const hasMissingDetails = cleanedAttendees.some((attendee) => !attendee.fullName || !attendee.email)
      if (hasMissingDetails) {
        throw new Error('Please add a full name and email for each ticket holder')
      }

      // Call our ticket purchase API
      const response = await fetch('/api/payments/ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id,
          quantity: quantity,
          ticketTypeId: selectedTier?.id && !selectedTier.id.startsWith('legacy-') ? selectedTier.id : undefined,
          ticketTypeName: selectedTier?.name,
          attendees: cleanedAttendees,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment')
      }

      // Redirect to Paystack checkout
      const authUrl = data.data?.authorization_url || data.authorizationUrl || data.authorization_url
      if (authUrl) {
        window.location.href = authUrl
      } else {
        throw new Error('No payment URL received')
      }
      
    } catch (error) {
      console.error('Payment error:', error)
      toast.error(error instanceof Error ? error.message : 'Payment failed. Please try again.')
      setLoading(false)
    }
    // Note: We don't setLoading(false) on success because we're redirecting
  }

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Purchase</DialogTitle>
          <DialogDescription>
            You&apos;re buying {quantity} {selectedTier?.name || 'ticket'}{quantity > 1 ? 's' : ''} for {event.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Summary */}
          <div className="space-y-2">
            {selectedTier && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Tier</span>
                <span>{selectedTier.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Ticket Price {quantity > 1 ? `(${quantity}x)` : ''}</span>
              <span>{formatCurrency(breakdown.ticketPrice / 100)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Booking Fee</span>
              <span>{formatCurrency(breakdown.bookingFee / 100)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(totalAmount / 100)}</span>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              <p className="font-medium">Who are these tickets for?</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Use the buyer email for your own ticket, or enter another groovist&apos;s email and we&apos;ll send it directly for claim and access.
            </p>
            <div className="space-y-3">
              {attendees.map((attendee, index) => (
                <div key={index} className="rounded-lg bg-muted/40 p-3 space-y-3">
                  <p className="text-sm font-medium">Ticket {index + 1}</p>
                  <div className="space-y-2">
                    <Label htmlFor={`ticket-holder-name-${index}`}>Full name</Label>
                    <Input
                      id={`ticket-holder-name-${index}`}
                      value={attendee.fullName}
                      onChange={(e) => updateAttendee(index, 'fullName', e.target.value)}
                      placeholder="Ticket holder name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`ticket-holder-email-${index}`}>Email</Label>
                    <Input
                      id={`ticket-holder-email-${index}`}
                      type="email"
                      value={attendee.email}
                      onChange={(e) => updateAttendee(index, 'email', e.target.value)}
                      placeholder="holder@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`ticket-holder-phone-${index}`}>Phone <span className="text-muted-foreground">optional</span></Label>
                    <Input
                      id={`ticket-holder-phone-${index}`}
                      value={attendee.phone}
                      onChange={(e) => updateAttendee(index, 'phone', e.target.value)}
                      placeholder="Optional phone"
                    />
                  </div>
                </div>
              ))}
            </div>
            {giftedCount > 0 && (
              <p className="text-xs text-primary">
                {giftedCount} ticket{giftedCount > 1 ? 's' : ''} will be delivered to another groovist by email.
              </p>
            )}
          </div>

          {/* Security Badge - Simplified */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm flex items-center gap-3">
            <Shield className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-green-700">
              Secure payments by <span className="font-semibold">Paystack</span>
            </p>
          </div>

          {/* Payment Button */}
          <Button 
            onClick={handlePayment} 
            className="w-full" 
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting to Paystack...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay {formatCurrency(totalAmount / 100)}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By completing this purchase, you agree to our Terms of Service.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
