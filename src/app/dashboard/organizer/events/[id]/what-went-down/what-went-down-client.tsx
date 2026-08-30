'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { uploadEventFile, type UploadResult } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ExternalLink, ImageIcon, Plus, Trash2, Video } from 'lucide-react'
import type { EventMedia, MediaType } from '@/types/database'

const WHAT_WENT_DOWN_TAG = '[[WWD]]'
const MAX_ITEMS = 5
const MAX_IMAGE_MB = 10
const MAX_VIDEO_MB = 5
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024

type UploadKind = 'image' | 'video_url'

interface WhatWentDownClientProps {
  eventId: string
  eventTitle: string
  initialItems: EventMedia[]
}

function isValidUrl(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function inferMediaTypeFromUrl(url: string): MediaType {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube_video'
  if (/tiktok\.com/i.test(url)) return 'tiktok_video'
  if (/instagram\.com\/(reel|reels|tv)/i.test(url)) return 'instagram_reel'
  if (/facebook\.com\/.+\/videos\//i.test(url) || /fb\.watch\//i.test(url)) return 'facebook_video'
  return 'video_url'
}

function normalizeDescription(description: string) {
  const trimmed = description.trim()
  return trimmed ? `${WHAT_WENT_DOWN_TAG}\n${trimmed}` : WHAT_WENT_DOWN_TAG
}

function stripTag(description: string | null) {
  return String(description || '').replace(WHAT_WENT_DOWN_TAG, '').trim()
}

export function WhatWentDownClient({ eventId, eventTitle, initialItems }: WhatWentDownClientProps) {
  const supabase = createClient()
  const [items, setItems] = useState<EventMedia[]>(initialItems)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadKind, setUploadKind] = useState<UploadKind>('image')
  const [mediaUrl, setMediaUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const remainingSlots = Math.max(0, MAX_ITEMS - items.length)
  const canAddMore = items.length < MAX_ITEMS

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [items])

  const resetForm = () => {
    setUploadKind('image')
    setMediaUrl('')
    setTitle('')
    setDescription('')
  }

  const handleImageUpload = async (file: File) => {
    if (!canAddMore) {
      toast.error(`You can only add up to ${MAX_ITEMS} recap items.`)
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed in this uploader.')
      return
    }

    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(`Image is too large. Max size is ${MAX_IMAGE_MB}MB.`)
      return
    }

    setSubmitting(true)
    try {
      const upload: UploadResult = await uploadEventFile(file, eventId, 'gallery')
      if (!upload.success || !upload.url) {
        throw new Error(upload.error || 'Failed to upload image')
      }

      const { data, error } = await supabase
        .from('event_media')
        .insert({
          event_id: eventId,
          media_type: 'image',
          url: upload.url,
          title: title.trim() || null,
          description: normalizeDescription(description),
          is_gallery: true,
          display_order: items.length,
        })
        .select('*')
        .single()

      if (error || !data) {
        throw new Error(error?.message || 'Failed to save recap media')
      }

      setItems((prev) => [data, ...prev])
      toast.success('Recap image added')
      setOpen(false)
      resetForm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add recap image')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddUrl = async () => {
    if (!canAddMore) {
      toast.error(`You can only add up to ${MAX_ITEMS} recap items.`)
      return
    }

    const trimmedUrl = mediaUrl.trim()
    if (!trimmedUrl || !isValidUrl(trimmedUrl)) {
      toast.error('Paste a valid http(s) URL.')
      return
    }

    setSubmitting(true)
    try {
      const mediaType = inferMediaTypeFromUrl(trimmedUrl)
      const { data, error } = await supabase
        .from('event_media')
        .insert({
          event_id: eventId,
          media_type: mediaType,
          url: trimmedUrl,
          title: title.trim() || null,
          description: normalizeDescription(description),
          is_gallery: false,
          display_order: items.length,
        })
        .select('*')
        .single()

      if (error || !data) {
        throw new Error(error?.message || 'Failed to save recap link')
      }

      setItems((prev) => [data, ...prev])
      toast.success('Recap link added')
      setOpen(false)
      resetForm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add recap link')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (itemId: string) => {
    const confirmed = window.confirm('Delete this recap item?')
    if (!confirmed) return

    const { error } = await supabase.from('event_media').delete().eq('id', itemId)
    if (error) {
      toast.error('Failed to delete item')
      return
    }

    setItems((prev) => prev.filter((item) => item.id !== itemId))
    toast.success('Recap item removed')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>What Went Down</CardTitle>
          <CardDescription>
            Share up to {MAX_ITEMS} highlights from {eventTitle}. This will show on the public event page for past events.
          </CardDescription>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{remainingSlots} slot{remainingSlots === 1 ? '' : 's'} left</Badge>
            <Badge variant="outline">Images max {MAX_IMAGE_MB}MB each</Badge>
            <Badge variant="outline">Videos max {MAX_VIDEO_MB}MB each (use links for larger files)</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canAddMore}>
                <Plus className="h-4 w-4 mr-2" />
                Add Highlight
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add event highlight</DialogTitle>
                <DialogDescription>
                  Add an image upload or a social/direct link. Keep it short and visual.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={uploadKind} onValueChange={(v) => setUploadKind(v as UploadKind)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Upload image</SelectItem>
                      <SelectItem value="video_url">Paste video/image URL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {uploadKind === 'image' ? (
                  <div className="space-y-2">
                    <Label>Image file</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      disabled={submitting}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) void handleImageUpload(file)
                      }}
                    />
                    <p className="text-xs text-muted-foreground">PNG/JPG/WEBP up to {MAX_IMAGE_MB}MB.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Media URL</Label>
                    <Input
                      placeholder="https://..."
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Title (optional)</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={submitting} />
                </div>

                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={submitting} rows={3} />
                </div>

                {uploadKind === 'video_url' && (
                  <Button onClick={handleAddUrl} disabled={submitting || !mediaUrl.trim()} className="w-full">
                    Save URL
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {sortedItems.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.title || 'Event highlight'}</p>
                  <p className="text-xs text-muted-foreground">{stripTag(item.description)}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => void handleDelete(item.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>

              {item.media_type === 'image' ? (
                <div className="relative aspect-video overflow-hidden rounded-lg bg-neutral-100">
                  <Image src={item.url} alt={item.title || 'Recap image'} fill className="object-cover" />
                </div>
              ) : (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border p-3 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Video className="h-4 w-4" />
                    Open media link
                    <ExternalLink className="h-3.5 w-3.5" />
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.url}</p>
                </a>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {item.media_type === 'image' ? <ImageIcon className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                <span>{item.media_type === 'image' ? 'Image' : 'Video/Link'}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {sortedItems.length === 0 && (
          <Card className="sm:col-span-2">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No recap items yet. Add highlights so attendees can see what went down.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
