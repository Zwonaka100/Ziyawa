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
import { formatCurrency, calculatePlatformFee, generateReference, generateTicketCode } from '@/lib/helpers'
import { PLATFORM_CONFIG } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Event, Profile } from '@/types/database'
import { CheckCircle, Loader2 } from 'lucide-react'

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: Event
  user: Profile
}

export function PaymentDialog({ open, onOpenChange, event, user }: PaymentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [ticketCode, setTicketCode] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const platformFee = calculatePlatformFee(event.ticket_price)
  const totalAmount = event.ticket_price // Fee is taken from organizer, not buyer
  const netAmount = event.ticket_price - platformFee

  const handlePayment = async () => {
    setLoading(true)

    try {
      // In a real app, this would redirect to Paystack
      // For demo, we simulate a successful payment
      
      // Generate references
      const transactionRef = generateReference('TXN')
      const newTicketCode = generateTicketCode()
      const paystackRef = `PAY-TEST-${Date.now()}`

      // Create transaction record
      const { data: transaction, error: txnError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'ticket_sale',
          amount: totalAmount,
          platform_fee: platformFee,
          net_amount: netAmount,
          status: 'completed',
          reference: transactionRef,
          event_id: event.id,
          paystack_reference: paystackRef,
        })
        .select()
        .single()

      if (txnError) throw txnError

      // Create ticket
      const { error: ticketError } = await supabase
        .from('tickets')
        .insert({
          event_id: event.id,
          user_id: user.id,
          transaction_id: transaction.id,
          ticket_code: newTicketCode,
        })

      if (ticketError) throw ticketError

      // Update event tickets_sold count
      const { error: updateError } = await supabase
        .from('events')
        .update({ tickets_sold: event.tickets_sold + 1 })
        .eq('id', event.id)

      if (updateError) throw updateError

      // Update organizer wallet balance (add net amount)
      const { data: organizer } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', event.organizer_id)
        .single()

      if (organizer) {
        await supabase
          .from('profiles')
          .update({ wallet_balance: organizer.wallet_balance + netAmount })
          .eq('id', event.organizer_id)
      }

      setTicketCode(newTicketCode)
      setSuccess(true)
      toast.success('Payment successful! Your ticket has been purchased.')
      
    } catch (error) {
      console.error('Payment error:', error)
      toast.error('Payment failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (success) {
      router.refresh()
    }
    onOpenChange(false)
    setSuccess(false)
    setTicketCode(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {success ? (
          // Success State
          <div className="text-center py-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <DialogHeader className="text-center">
              <DialogTitle>Payment Successful!</DialogTitle>
              <DialogDescription>
                Your ticket has been purchased. Save your ticket code below.
              </DialogDescription>
            </DialogHeader>
            
            <div className="my-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Your Ticket Code</p>
              <p className="text-2xl font-mono font-bold">{ticketCode}</p>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Show this code at the event entrance. You can also find this in your tickets dashboard.
            </p>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          // Payment Form
          <>
            <DialogHeader>
              <DialogTitle>Complete Your Purchase</DialogTitle>
              <DialogDescription>
                You&apos;re buying a ticket for {event.title}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Order Summary */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Ticket Price</span>
                  <span>{formatCurrency(event.ticket_price)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Service Fee</span>
                  <span>R0.00</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              {/* Demo Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-yellow-800">Demo Mode</p>
                <p className="text-yellow-700">
                  This is a simulated payment. In production, you&apos;d be redirected to Paystack.
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
                    Processing...
                  </>
                ) : (
                  `Pay ${formatCurrency(totalAmount)}`
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Secured by Paystack. {PLATFORM_CONFIG.platformFeePercent}% platform fee applies to organizers.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
