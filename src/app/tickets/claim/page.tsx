'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Mail, Ticket, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ClaimPreview {
  id: string
  attendeeName: string | null
  attendeeEmail: string | null
  ticketCode: string
  ticketType: string
  deliveryStatus: string | null
  event: {
    id: string
    title: string
    event_date: string
    venue: string
  } | null
}

function TicketClaimContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [ticket, setTicket] = useState<ClaimPreview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPreview = async () => {
      if (!token) {
        setError('Missing ticket claim link')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/tickets/claim?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load ticket')
        }

        setTicket(data.ticket)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load ticket')
      } finally {
        setLoading(false)
      }
    }

    loadPreview()
  }, [token])

  const handleClaim = async () => {
    if (!token) return

    try {
      setClaiming(true)
      const response = await fetch('/api/tickets/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()
      if (response.status === 401) {
        window.location.href = `/auth/signin?next=${encodeURIComponent(`/tickets/claim?token=${token}`)}`
        return
      }

      if (!response.ok) {
        throw new Error(data.error || 'Unable to claim ticket')
      }

      setClaimed(true)
      toast.success(data.message || 'Ticket claimed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to claim ticket')
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            Claim your ticket
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading your ticket...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          ) : ticket ? (
            <>
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold text-lg">{ticket.event?.title || 'Event ticket'}</p>
                  <Badge variant="secondary">{ticket.ticketType}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">For {ticket.attendeeName || 'Guest'}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {ticket.attendeeEmail || 'No email attached'}
                </p>
                <p className="text-sm text-muted-foreground">Code: {ticket.ticketCode}</p>
                {ticket.event?.event_date && (
                  <p className="text-sm text-muted-foreground">
                    {new Date(ticket.event.event_date).toLocaleDateString('en-ZA')} • {ticket.event.venue}
                  </p>
                )}
              </div>

              {claimed ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle className="h-4 w-4" />
                    Ticket claimed successfully
                  </div>
                  <p className="mt-1 text-sm">It is now attached to your account.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Sign in with the same email address shown above, then claim this ticket into your dashboard.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleClaim} disabled={claiming}>
                      {claiming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ticket className="h-4 w-4 mr-2" />}
                      Claim ticket
                    </Button>
                    <Link href={`/auth/signin?next=${encodeURIComponent(`/tickets/claim?token=${token || ''}`)}`}>
                      <Button variant="outline">Sign in first</Button>
                    </Link>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Link href="/dashboard/tickets">
                  <Button variant="ghost">Open my tickets</Button>
                </Link>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

export default function TicketClaimPage() {
  return (
    <Suspense
      fallback={
        <div className="container max-w-2xl mx-auto px-4 py-10">
          <Card>
            <CardContent className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading your ticket...
            </CardContent>
          </Card>
        </div>
      }
    >
      <TicketClaimContent />
    </Suspense>
  )
}