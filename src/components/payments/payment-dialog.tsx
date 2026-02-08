'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/helpers'
import { calculateTicketSaleBreakdown, PLATFORM_FEES } from '@/lib/constants'
import { toast } from 'sonner'
import type { Event, Profile } from '@/types/database'
import { CheckCircle, Loader2, CreditCard, Shield } from 'lucide-react'

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: Event
  user: Profile
  quantity?: number
}

export function PaymentDialog({ open, onOpenChange, event, user, quantity = 1 }: PaymentDialogProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Calculate fees using our fee structure
  const ticketBasePriceCents = event.ticket_price * 100 * quantity // Convert Rands to cents
  const breakdown = calculateTicketSaleBreakdown(ticketBasePriceCents)
  const totalAmount = breakdown.buyerTotal // This is what the buyer pays (in cents)

  const handlePayment = async () => {
    setLoading(true)

    try {
      // Call our ticket purchase API
      const response = await fetch('/api/payments/ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id,
          quantity: quantity,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment')
      }

      // Redirect to Paystack checkout
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl
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
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Purchase</DialogTitle>
          <DialogDescription>
            You&apos;re buying {quantity} ticket{quantity > 1 ? 's' : ''} for {event.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Summary */}
          <div className="space-y-2">
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

          {/* Security Badge */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm flex items-start gap-3">
            <Shield className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-800">Secure Payment</p>
              <p className="text-green-700">
                Your payment is processed securely by Paystack, a PCI-DSS compliant payment provider.
              </p>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="flex items-center justify-center gap-4 py-2">
            <div className="text-xs text-muted-foreground">Pay with:</div>
            <div className="flex items-center gap-2">
              <div className="bg-gray-100 rounded px-2 py-1 text-xs font-medium">Card</div>
              <div className="bg-gray-100 rounded px-2 py-1 text-xs font-medium">EFT</div>
              <div className="bg-gray-100 rounded px-2 py-1 text-xs font-medium">Bank</div>
            </div>
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
            Platform fee of {PLATFORM_FEES.ticketing.platformFeePercent}% applies.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
