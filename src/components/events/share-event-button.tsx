'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Facebook, Instagram, Loader2, MoreHorizontal, Share2, Twitter } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { SITE_URL } from '@/lib/constants'
import { formatDate } from '@/lib/helpers'

interface ShareEventButtonProps {
  event: {
    id: string
    title: string
    event_date: string
    venue: string
    cover_image: string | null
  }
  className?: string
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35zM12.04 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.93.95-3.48-.22-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.2 4.24-9.44 9.45-9.44 2.52 0 4.9.99 6.68 2.77a9.37 9.37 0 0 1 2.76 6.68c0 5.2-4.24 9.44-9.45 9.44zm8.04-17.48A11.3 11.3 0 0 0 12.04.7C5.77.7.67 5.8.67 12.07c0 2 .52 3.96 1.52 5.69L.57 23.7l6.08-1.6a11.33 11.33 0 0 0 5.39 1.37h.01c6.27 0 11.37-5.1 11.37-11.37 0-3.04-1.18-5.9-3.34-8.05z" />
    </svg>
  )
}

export function ShareEventButton({ event, className }: ShareEventButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [preparingStory, setPreparingStory] = useState(false)
  const [posterFile, setPosterFile] = useState<File | null>(null)

  // Always the clean canonical URL — the page's link preview (poster, title,
  // description) is keyed on it, so WhatsApp and friends render a proper card.
  const url = `${SITE_URL.replace(/\/$/, '')}/events/${event.id}`
  const blurb = `${event.title} · ${formatDate(event.event_date)} at ${event.venue}. Get your tickets on Ziyawa`
  const message = `${blurb}: ${url}`

  const copyLink = async (quiet = false) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      if (!quiet) toast.success('Link copied')
      return true
    } catch {
      if (!quiet) toast.error('Could not copy the link')
      return false
    }
  }

  const openExternal = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  // Set after mount so server and client render the same markup.
  const [canNativeShare, setCanNativeShare] = useState(false)
  useEffect(() => {
    setCanNativeShare(typeof navigator.share === 'function')
  }, [])

  // The phone's own share sheet: Instagram DMs, Telegram, SMS, email, etc.
  const shareNative = async () => {
    try {
      await navigator.share({ title: event.title, text: blurb, url })
      setOpen(false)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') toast.error('Could not open sharing')
    }
  }

  // Phones only allow a share shortly after the tap, so load the poster as the
  // dialog opens instead of after "Share poster" is pressed.
  useEffect(() => {
    if (!open || !event.cover_image || posterFile) return
    let cancelled = false
    fetch(event.cover_image)
      .then((response) => response.blob())
      .then((blob) => {
        if (cancelled) return
        const extension = blob.type.split('/')[1] || 'jpg'
        setPosterFile(new File([blob], `ziyawa-${event.id}.${extension}`, { type: blob.type || 'image/jpeg' }))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [open, event.cover_image, event.id, posterFile])

  // Stories (IG, WhatsApp Status) take images, not links. Share the poster
  // itself and put the link on the clipboard, ready for the Link sticker.
  const shareToStory = async () => {
    if (!event.cover_image) return
    setPreparingStory(true)
    try {
      const copiedOk = await copyLink(true)
      let file = posterFile
      if (!file) {
        const blob = await (await fetch(event.cover_image)).blob()
        const extension = blob.type.split('/')[1] || 'jpg'
        file = new File([blob], `ziyawa-${event.id}.${extension}`, { type: blob.type || 'image/jpeg' })
      }

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] })
      } else {
        // Desktop: download the poster to post from the phone later.
        const objectUrl = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = objectUrl
        a.download = file.name
        a.click()
        URL.revokeObjectURL(objectUrl)
      }
      if (copiedOk) {
        toast.success('Link copied — add it with the Link sticker so people can tap straight through')
      }
      setOpen(false)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') toast.error('Could not prepare the poster')
    } finally {
      setPreparingStory(false)
    }
  }

  const encodedMessage = encodeURIComponent(message)
  const encodedUrl = encodeURIComponent(url)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Share2 className="h-4 w-4 mr-2" />
          Share this event
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share this event</DialogTitle>
          <DialogDescription>Pull the whole crew through. Anyone with the link lands right on the event.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="justify-start h-11" onClick={() => openExternal(`https://wa.me/?text=${encodedMessage}`)}>
            <WhatsAppIcon className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
          <Button
            variant="outline"
            className="justify-start h-11"
            onClick={() => openExternal(`https://twitter.com/intent/tweet?text=${encodeURIComponent(blurb)}&url=${encodedUrl}`)}
          >
            <Twitter className="h-4 w-4 mr-2" />
            X
          </Button>
          <Button
            variant="outline"
            className="justify-start h-11"
            onClick={() => openExternal(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)}
          >
            <Facebook className="h-4 w-4 mr-2" />
            Facebook
          </Button>
          <Button variant="outline" className="justify-start h-11" onClick={() => void copyLink()}>
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </div>

        {event.cover_image && (
          <div className="rounded-md bg-muted/40 p-3 space-y-2">
            <p className="text-sm font-medium">Posting to your Story or Status?</p>
            <p className="text-xs text-muted-foreground">
              We&apos;ll grab the event poster and copy the link. Add the link with the Link sticker on Instagram,
              or paste it in the caption on WhatsApp Status.
            </p>
            <Button variant="secondary" className="w-full" disabled={preparingStory} onClick={() => void shareToStory()}>
              {preparingStory ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Instagram className="h-4 w-4 mr-2" />}
              Share poster to Story / Status
            </Button>
          </div>
        )}

        {canNativeShare && (
          <Button variant="ghost" className="w-full" onClick={() => void shareNative()}>
            <MoreHorizontal className="h-4 w-4 mr-2" />
            More apps
          </Button>
        )}

        <div className="flex items-center gap-2 rounded-md border px-3 py-2">
          <span className="flex-1 truncate text-sm text-muted-foreground">{url}</span>
          <Button variant="ghost" size="sm" onClick={() => void copyLink()}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
