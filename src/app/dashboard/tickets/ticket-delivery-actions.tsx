'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Mail, Send } from 'lucide-react'
import { toast } from 'sonner'

interface TicketDeliveryActionsProps {
  ticketId: string
  recipientEmail?: string | null
  isGifted?: boolean
  isClaimed?: boolean
}

export function TicketDeliveryActions({
  ticketId,
  recipientEmail,
  isGifted = false,
  isClaimed = false,
}: TicketDeliveryActionsProps) {
  const [sending, setSending] = useState(false)

  if (!isGifted) {
    return null
  }

  const handleResend = async () => {
    try {
      setSending(true)
      const response = await fetch(`/api/tickets/${ticketId}/resend`, {
        method: 'POST',
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Could not resend ticket email')
      }

      toast.success(data.message || 'Ticket email resent')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not resend ticket email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={isClaimed ? 'secondary' : 'outline'}>
        <Mail className="h-3 w-3 mr-1" />
        {isClaimed ? 'Claimed by recipient' : 'Waiting for claim'}
      </Badge>
      <Button size="sm" variant="outline" onClick={handleResend} disabled={sending}>
        {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
        Resend email
      </Button>
      {recipientEmail && (
        <span className="text-xs text-muted-foreground">{recipientEmail}</span>
      )}
    </div>
  )
}