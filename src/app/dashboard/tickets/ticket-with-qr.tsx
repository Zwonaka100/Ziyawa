'use client'

/**
 * Ticket with QR Code - Client Component
 * Shows QR code in a dialog for scanning
 */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { QrCode, Download, Share2, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface TicketWithQRProps {
  ticketCode: string
  eventId: string
  ticketId: string
  eventDate: string
  isCheckedIn?: boolean
}

export function TicketWithQR({ ticketCode, eventId, ticketId, eventDate, isCheckedIn = false }: TicketWithQRProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkedIn, setCheckedIn] = useState(isCheckedIn)

  const canSelfCheckIn = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const target = new Date(eventDate)
    target.setHours(0, 0, 0, 0)

    return target.getTime() === today.getTime()
  }, [eventDate])

  // QR code data for scanning
  const qrData = JSON.stringify({
    code: ticketCode,
    event: eventId,
    ticket: ticketId,
  })

  // Share ticket
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Ziyawa Ticket',
          text: `Ticket Code: ${ticketCode}`,
          url: window.location.href,
        })
      } catch {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(ticketCode)
      toast.success('Ticket code copied!')
    }
  }

  const handleSelfCheckIn = async () => {
    try {
      setCheckingIn(true)
      const response = await fetch('/api/tickets/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketCode,
          ticketId,
          eventId,
          selfCheckIn: true,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Unable to check you in')
      }

      setCheckedIn(true)
      toast.success(data.message || 'You are checked in')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Check-in failed')
    } finally {
      setCheckingIn(false)
    }
  }

  // Download QR code as image
  const handleDownload = () => {
    const svg = document.getElementById(`qr-${ticketId}`)
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      
      const link = document.createElement('a')
      link.download = `ziyawa-ticket-${ticketCode}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex flex-wrap items-center gap-2">
        {checkedIn ? (
          <Button size="sm" className="bg-green-500 hover:bg-green-500" disabled>
            <CheckCircle className="h-4 w-4 mr-2" />
            Checked In
          </Button>
        ) : canSelfCheckIn ? (
          <Button size="sm" onClick={handleSelfCheckIn} disabled={checkingIn}>
            {checkingIn ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            I&apos;m Here
          </Button>
        ) : null}

        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <QrCode className="h-4 w-4 mr-2" />
            Show QR
          </Button>
        </DialogTrigger>
      </div>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your Ticket QR Code</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-6">
          {/* QR Code */}
          <div className="bg-white p-4 rounded-xl border-2 border-purple-200 shadow-lg">
            <QRCodeSVG 
              id={`qr-${ticketId}`}
              value={qrData}
              size={200}
              level="H"
              includeMargin
              imageSettings={{
                src: '/logo-small.png',
                height: 30,
                width: 30,
                excavate: true,
              }}
            />
          </div>

          {/* Ticket Code */}
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">Ticket Code</p>
            <p className="font-mono font-bold text-2xl tracking-wider">{ticketCode}</p>
          </div>

          {/* Instructions */}
          <p className="text-sm text-muted-foreground text-center mt-4">
            Show this QR code at the event entrance for quick check-in
          </p>

          {!checkedIn && canSelfCheckIn && (
            <Button className="mt-4" onClick={handleSelfCheckIn} disabled={checkingIn}>
              {checkingIn ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Check in now
            </Button>
          )}

          {!checkedIn && !canSelfCheckIn && (
            <p className="mt-4 text-xs text-muted-foreground text-center">
              Self check-in opens on the event day.
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
