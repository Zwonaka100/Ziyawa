'use client'

/**
 * Ticket with QR Code - Client Component
 * Shows QR code in a dialog for scanning
 */

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { QrCode, Download, Share2 } from 'lucide-react'
import { toast } from 'sonner'

interface TicketWithQRProps {
  ticketCode: string
  eventId: string
  ticketId: string
}

export function TicketWithQR({ ticketCode, eventId, ticketId }: TicketWithQRProps) {
  const [open, setOpen] = useState(false)

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
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(ticketCode)
      toast.success('Ticket code copied!')
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
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <QrCode className="h-4 w-4 mr-2" />
          Show QR
        </Button>
      </DialogTrigger>
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
