'use client'

/**
 * ADMIN EVENT DETAIL PAGE
 * /admin/events/[id]
 * 
 * Full event details with moderation actions:
 * - Approve/reject events
 * - Suspend event
 * - View organizer details
 * - View ticket sales
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { uploadEventFile, type UploadResult } from '@/lib/storage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Ticket,
  DollarSign,
  ExternalLink,
  CheckCircle,
  XCircle,
  Ban,
  Eye,
  Loader2,
  Banknote,
  Flag,
  Trash2,
  Users,
  Pencil,
  Printer,
  Lock,
  Upload,
} from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/helpers'
import { toast } from 'sonner'
import { CompletionDialog } from '@/components/admin/completion-dialog'
import { PayoutReviewDialog } from '@/components/admin/payout-review-dialog'

interface EventDetail {
  id: string
  title: string
  description: string
  venue: string
  location: string
  address: string
  event_date: string
  start_time: string
  end_time: string
  ticket_price: number
  capacity: number
  tickets_sold: number
  is_published: boolean
  is_approved: boolean | null
  state: string
  category: string
  cover_image: string
  gallery: string[]
  tags: string[]
  created_at: string
  updated_at: string
  organizer_id: string
  organizer?: {
    id: string
    full_name: string
    email: string
    avatar_url: string
    phone: string
  }
}

interface BookingSummary {
  id: string
  quantity: number
  total_amount: number
  status: string
  created_at: string
  user?: {
    full_name: string
    email: string
  }
}

const STATE_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  pending_approval: { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  published: { label: 'Published', color: 'bg-blue-100 text-blue-700' },
  suspended: { label: 'Suspended', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
}

function isPastEvent(eventDate: string) {
  if (!eventDate) return false
  const eventDateValue = new Date(`${eventDate}T23:59:59`)
  return eventDateValue < new Date()
}

function getEventLifecycleStatus(event: EventDetail) {
  if (event.state === 'cancelled') return { label: 'Cancelled', color: 'bg-gray-100 text-gray-700' }
  if (event.state === 'suspended') return { label: 'Suspended', color: 'bg-red-100 text-red-700' }
  if (event.state === 'completed') return { label: 'Completed', color: 'bg-green-100 text-green-700' }
  if (event.state === 'locked') return { label: 'Locked', color: 'bg-purple-100 text-purple-700' }
  if (event.state === 'pending_approval') return { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-700' }
  if (event.state === 'rejected') return { label: 'Rejected', color: 'bg-red-100 text-red-700' }
  if (event.is_published && isPastEvent(event.event_date)) return { label: 'Past Published', color: 'bg-amber-100 text-amber-700' }
  if (event.is_published) return { label: 'Published', color: 'bg-blue-100 text-blue-700' }
  return { label: 'Draft', color: 'bg-gray-100 text-gray-700' }
}

type ReportSummary = {
  id: string
  reason: string
  status: string
  created_at: string
  description?: string | null
}

export function AdminEventDetail({
  eventId,
  initialEvent,
  initialBuyers,
  initialReports,
}: {
  eventId: string
  initialEvent: EventDetail
  initialBuyers: BookingSummary[]
  initialReports: ReportSummary[]
}) {
  const router = useRouter()
  const [payoutReviewOpen, setPayoutReviewOpen] = useState(false)

  // Seeded from the server render — no empty first paint, no fetch on mount.
  const [event, setEvent] = useState<EventDetail | null>(initialEvent)
  const [bookings, setBookings] = useState<BookingSummary[]>(initialBuyers)
  const [reports, setReports] = useState<ReportSummary[]>(initialReports)
  const [loading, setLoading] = useState(false)
  const [savingChanges, setSavingChanges] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [publishLoading, setPublishLoading] = useState(false)
  const [completionOpen, setCompletionOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  // Primed from the server render. The old code filled this inside the mount
  // fetch; without that, opening Edit would have shown an empty form.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildEditForm = (data: any) => ({
    title: data?.title || '',
    description: data?.description || '',
    venue: data?.venue || '',
    location: data?.location || '',
    address: data?.address || '',
    event_date: data?.event_date || '',
    start_time: data?.start_time || '',
    end_time: data?.end_time || '',
    cover_image: data?.cover_image || '',
    ticket_price: Number(data?.ticket_price || 0),
    capacity: Number(data?.capacity || 0),
  })

  const [editForm, setEditForm] = useState(() => buildEditForm(initialEvent))

  // Action dialog
  const [actionOpen, setActionOpen] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'suspend' | 'delete'>('approve')
  const [actionNotes, setActionNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyEditForm = (data: any) => setEditForm(buildEditForm(data))

  // Refreshes after an admin action. The first render's data comes from the
  // server, so this does not run on mount.
  const fetchEvent = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/detail`, { cache: 'no-store' })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Failed to load event')

      setEvent(payload.event)
      setBookings(payload.buyers || [])
      setReports(payload.reports || [])
      applyEditForm(payload.event)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to load event')
    } finally {
      setLoading(false)
    }
  }

  const openAction = (type: typeof actionType) => {
    setActionType(type)
    setActionNotes('')
    setActionOpen(true)
  }

  const handleUpdateEvent = async () => {
    if (!event) return

    setSavingChanges(true)

    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          venue: editForm.venue,
          location: editForm.location,
          address: editForm.address,
          event_date: editForm.event_date,
          start_time: editForm.start_time,
          end_time: editForm.end_time,
          cover_image: editForm.cover_image,
          ticket_price: Number(editForm.ticket_price),
          capacity: Number(editForm.capacity),
        }),
      })

      const payload = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update event')
      }

      toast.success('Event updated successfully')
      setEditOpen(false)
      void fetchEvent()
    } catch (error) {
      console.error('Update error:', error)
      toast.error('Failed to update event')
    } finally {
      setSavingChanges(false)
    }
  }

  const handleAdminCoverUpload = async (file: File) => {
    setUploadingCover(true)

    try {
      const result: UploadResult = await uploadEventFile(file, eventId, 'poster')

      if (!result.success || !result.url) {
        toast.error(result.error || 'Failed to upload cover image')
        return
      }

      setEditForm((prev) => ({ ...prev, cover_image: result.url || '' }))
      setEvent((prev) => (prev ? { ...prev, cover_image: result.url || '' } : prev))
      toast.success('Cover uploaded. Save changes to apply it to the event.')
    } catch (error) {
      console.error('Admin cover upload error:', error)
      toast.error('Failed to upload cover image')
    } finally {
      setUploadingCover(false)
    }
  }

  const handleAction = async () => {
    if (!event) return

    setProcessing(true)

    try {
      switch (actionType) {
        case 'delete':
          {
            const response = await fetch(`/api/admin/events/${eventId}/publish`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ operation: 'delete', reason: actionNotes || 'Removed by admin moderation' }),
            })

            const payload = await response.json().catch(() => ({})) as { error?: string; deleted?: boolean; refundedTickets?: number }
            if (!response.ok) {
              throw new Error(payload.error || 'Failed to delete event')
            }

            if (payload.deleted) {
              toast.success('Event deleted')
            } else {
              toast.success((payload.refundedTickets || 0) > 0
                ? `Event cancelled and ${payload.refundedTickets} refund item(s) queued`
                : 'Event removed from public listings')
            }

            router.push('/admin/events')
          }
          return
        case 'approve':
        case 'reject':
        case 'suspend': {
          const response = await fetch(`/api/admin/events/${eventId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminAction: actionType, notes: actionNotes }),
          })

          const payload = await response.json().catch(() => ({})) as { error?: string }
          if (!response.ok) {
            throw new Error(payload.error || `Failed to ${actionType} event`)
          }
          break
        }
      }

      toast.success(`Event ${actionType}ed successfully`)
      setActionOpen(false)
      void fetchEvent()
    } catch (error) {
      console.error('Action error:', error)
      toast.error(`Failed to ${actionType} event`)
    } finally {
      setProcessing(false)
    }
  }

  const handlePublish = async (publish: boolean) => {
    if (!event) return

    setPublishLoading(true)

    try {
      let reason = ''
      if (!publish && Number(event.tickets_sold || 0) > 0) {
        reason = window.prompt('This event has ticket sales. Unpublishing will cancel the event and queue refunds. Please provide a reason:')?.trim() || ''
        if (!reason) {
          throw new Error('Reason is required to unpublish an event with ticket sales')
        }
      }

      const response = await fetch(`/api/admin/events/${eventId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish, reason, operation: publish ? 'publish' : 'unpublish' }),
      })

      const payload = await response.json().catch(() => ({})) as { error?: string; refundedTickets?: number }
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update event visibility')
      }

      if (!publish && (payload.refundedTickets || 0) > 0) {
        toast.success(`Event cancelled and ${payload.refundedTickets} refund item(s) queued`)
      } else {
        toast.success(publish ? 'Event published' : 'Event unpublished')
      }

      void fetchEvent()
    } catch (error) {
      console.error('Publish error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update event')
    } finally {
      setPublishLoading(false)
    }
  }

  const handleLockEvent = async () => {
    if (!event) return

    setPublishLoading(true)

    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminAction: 'lock' }),
      })

      const payload = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to lock event')
      }

      toast.success('Event locked')
      void fetchEvent()
    } catch (error) {
      console.error('Lock error:', error)
      toast.error('Failed to lock event')
    } finally {
      setPublishLoading(false)
    }
  }

  const handleCancelEvent = async () => {
    if (!event) return

    const confirmed = window.confirm('Cancel this event? It will be hidden from the public listing, marked cancelled, and refunds will be queued where needed.')
    if (!confirmed) return

    const reason = window.prompt('Please provide a cancellation reason:')?.trim() || ''
    if (!reason) {
      toast.error('Cancellation reason is required')
      return
    }

    setPublishLoading(true)

    try {
      const response = await fetch(`/api/admin/events/${eventId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish: false, reason, operation: 'cancel' }),
      })

      const payload = await response.json().catch(() => ({})) as { error?: string; refundedTickets?: number }
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to cancel event')
      }

      toast.success((payload.refundedTickets || 0) > 0 ? `Event cancelled and ${payload.refundedTickets} refund item(s) queued` : 'Event cancelled')
      void fetchEvent()
    } catch (error) {
      console.error('Cancel error:', error)
      toast.error('Failed to cancel event')
    } finally {
      setPublishLoading(false)
    }
  }

  // Opens the breakdown instead of completing straight away. A bare confirm
  // asked an admin to release money without showing them any of it.
  const handleCompleteEvent = () => {
    if (!event) return
    setCompletionOpen(true)
  }

  const confirmCompleteEvent = async () => {
    if (!event) return

    setPublishLoading(true)

    try {
      const response = await fetch(`/api/events/${eventId}/complete`, { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete event')
      }

      toast.success(data.message || 'Event marked complete')
      setCompletionOpen(false)
      void fetchEvent()
    } catch (error) {
      console.error('Complete error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to complete event')
    } finally {
      setPublishLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Event not found</p>
        <Link href="/admin/events">
          <Button variant="outline" className="mt-4">Back to Events</Button>
        </Link>
      </div>
    )
  }

  const lifecycleStatus = getEventLifecycleStatus(event)
  const revenue = bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/admin/events">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{event.title}</h2>
              <Badge className={lifecycleStatus.color}>{lifecycleStatus.label}</Badge>
            </div>
            <p className="text-muted-foreground">Created {format(new Date(event.created_at), 'PPP')}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href={`/events/${event.id}`} target="_blank">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Public
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)} disabled={publishLoading}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Event
            </Button>

            {/* Print already sits in the page header, so this slot goes to the
                action that actually matters on a finished event. */}
            {event.state === 'completed' && (
              <Button
                onClick={() => setPayoutReviewOpen(true)}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                <Banknote className="h-4 w-4 mr-2" />
                Review payout
              </Button>
            )}

            {event.state === 'pending_approval' && (
              <>
                <Button onClick={() => openAction('approve')} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Event
                </Button>
                <Button onClick={() => openAction('reject')} variant="destructive">
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Event
                </Button>
              </>
            )}

            {event.is_published ? (
              <Button onClick={() => handlePublish(false)} variant="outline" disabled={publishLoading}>
                {publishLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                Unpublish
              </Button>
            ) : event.state === 'approved' && (
              <Button onClick={() => handlePublish(true)} variant="outline" disabled={publishLoading}>
                {publishLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Publish
              </Button>
            )}

            <Button onClick={() => handleLockEvent()} variant="outline" disabled={publishLoading || event.state === 'locked' || event.state === 'completed' || event.state === 'cancelled'}>
              <Lock className="h-4 w-4 mr-2" />
              Lock
            </Button>

            <Button onClick={() => handleCompleteEvent()} variant="outline" disabled={publishLoading || event.state === 'completed' || event.state === 'cancelled'}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete
            </Button>

            <Button onClick={() => handleCancelEvent()} variant="outline" className="text-orange-600 border-orange-300 hover:bg-orange-50" disabled={publishLoading || event.state === 'cancelled' || event.state === 'completed'}>
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>


            {event.state !== 'suspended' && (
              <Button onClick={() => openAction('suspend')} variant="outline" className="text-orange-600 border-orange-300 hover:bg-orange-50">
                <Ban className="h-4 w-4 mr-2" />
                Suspend
              </Button>
            )}

            <Button onClick={() => openAction('delete')} variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Ticket className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tickets Sold</p>
                <p className="text-xl font-bold">{event.tickets_sold || 0} / {event.capacity}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold">{formatCurrency(revenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bookings</p>
                <p className="text-xl font-bold">{bookings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <Flag className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reports</p>
                <p className="text-xl font-bold">{reports.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="organizer">Organizer</TabsTrigger>
          <TabsTrigger value="bookings">Bookings ({bookings.length})</TabsTrigger>
          <TabsTrigger value="reports">Reports ({reports.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4 mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Event Info */}
            <div className="lg:col-span-2 space-y-4">
              {event.cover_image && (
                <Card className="overflow-hidden">
                  <div className="relative aspect-[21/9]">
                    <Image
                      src={event.cover_image}
                      alt={event.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{event.description || 'No description provided'}</p>
                </CardContent>
              </Card>

              {event.tags && event.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {event.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Event Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.start_time} - {event.end_time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{event.venue}</p>
                      <p className="text-sm text-muted-foreground">{event.address || event.location}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Ticket className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {event.ticket_price === 0 ? 'FREE' : formatCurrency(event.ticket_price)}
                      </p>
                      <p className="text-sm text-muted-foreground">per ticket</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{event.capacity} capacity</p>
                      <p className="text-sm text-muted-foreground">
                        {event.capacity - (event.tickets_sold || 0)} remaining
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="text-sm">
                    {event.category || 'Uncategorized'}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="organizer" className="mt-4">
          <Card>
            <CardContent className="p-6">
              {event.organizer ? (
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden">
                    {event.organizer.avatar_url ? (
                      <Image
                        src={event.organizer.avatar_url}
                        alt={event.organizer.full_name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{event.organizer.full_name}</h3>
                    <p className="text-muted-foreground">{event.organizer.email}</p>
                    {event.organizer.phone && (
                      <p className="text-muted-foreground">{event.organizer.phone}</p>
                    )}
                    <div className="mt-4">
                      <Link href={`/admin/users/${event.organizer.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Organizer information not available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Tickets</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No bookings yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <p className="font-medium">{booking.user?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{booking.user?.email}</p>
                        </TableCell>
                        <TableCell>{booking.quantity}</TableCell>
                        <TableCell>{formatCurrency(booking.total_amount)}</TableCell>
                        <TableCell>
                          <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(booking.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reason</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No reports for this event
                      </TableCell>
                    </TableRow>
                  ) : (
                    reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.reason}</TableCell>
                        <TableCell className="max-w-xs truncate">{report.description}</TableCell>
                        <TableCell>
                          <Badge variant={report.status === 'resolved' ? 'default' : 'secondary'}>
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(report.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Link href={`/admin/reports?id=${report.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>Update the core event details for this listing.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div className="md:col-span-2 space-y-2">
              <Label>Cover Image</Label>
              <div className="rounded-lg border p-3 space-y-3">
                {editForm.cover_image ? (
                  <div className="relative w-full h-56 md:h-72 rounded-md overflow-hidden border bg-muted/30">
                    <Image src={editForm.cover_image} alt="Event cover preview" fill className="object-contain" />
                  </div>
                ) : (
                  <div className="w-full h-28 rounded-md border border-dashed flex items-center justify-center text-sm text-muted-foreground">
                    No cover image selected
                  </div>
                )}

                <Input
                  id="edit-cover-image"
                  placeholder="Paste cover image URL"
                  value={editForm.cover_image}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, cover_image: e.target.value }))}
                />

                <div>
                  <input
                    id="admin-cover-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        void handleAdminCoverUpload(file)
                        e.currentTarget.value = ''
                      }
                    }}
                  />
                  <label htmlFor="admin-cover-upload">
                    <Button type="button" variant="outline" className="w-full" disabled={uploadingCover} asChild>
                      <span>
                        {uploadingCover ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload New Cover
                          </>
                        )}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input id="edit-title" value={editForm.title} onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea id="edit-description" rows={4} value={editForm.description} onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-venue">Venue</Label>
              <Input id="edit-venue" value={editForm.venue} onChange={(e) => setEditForm((prev) => ({ ...prev, venue: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input id="edit-location" value={editForm.location} onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input id="edit-address" value={editForm.address} onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-date">Event Date</Label>
              <Input id="edit-date" type="date" value={editForm.event_date} onChange={(e) => setEditForm((prev) => ({ ...prev, event_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-start">Start Time</Label>
              <Input id="edit-start" value={editForm.start_time} onChange={(e) => setEditForm((prev) => ({ ...prev, start_time: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-end">End Time</Label>
              <Input id="edit-end" value={editForm.end_time} onChange={(e) => setEditForm((prev) => ({ ...prev, end_time: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-price">Ticket Price</Label>
              <Input id="edit-price" type="number" min="0" step="0.01" value={editForm.ticket_price} onChange={(e) => setEditForm((prev) => ({ ...prev, ticket_price: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-capacity">Capacity</Label>
              <Input id="edit-capacity" type="number" min="1" value={editForm.capacity} onChange={(e) => setEditForm((prev) => ({ ...prev, capacity: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateEvent} disabled={savingChanges}>
              {savingChanges ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve Event'}
              {actionType === 'reject' && 'Reject Event'}
              {actionType === 'suspend' && 'Suspend Event'}
              {actionType === 'delete' && 'Delete Event'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' && 'Approve this event to allow it to be published on the platform.'}
              {actionType === 'reject' && 'Reject this event. The organizer will be notified with your feedback.'}
              {actionType === 'suspend' && 'Suspend this event. It will be hidden from the platform immediately.'}
              {actionType === 'delete' && 'Permanently delete this event. This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {(actionType === 'reject' || actionType === 'suspend') && (
              <div className="space-y-2">
                <Label htmlFor="notes">Reason / Notes {actionType === 'reject' && '(required)'}</Label>
                <Textarea
                  id="notes"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder={
                    actionType === 'reject' 
                      ? 'Please provide a reason for rejection...'
                      : 'Reason for suspension (optional)...'
                  }
                  rows={3}
                />
              </div>
            )}

            {actionType === 'delete' && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">
                  <strong>Warning:</strong> This will permanently delete the event, all associated bookings, and tickets. This action cannot be undone.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setActionOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={processing || (actionType === 'reject' && !actionNotes.trim())}
                variant={actionType === 'delete' || actionType === 'reject' || actionType === 'suspend' ? 'destructive' : 'default'}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {actionType === 'approve' && <CheckCircle className="h-4 w-4 mr-2" />}
                    {actionType === 'reject' && <XCircle className="h-4 w-4 mr-2" />}
                    {actionType === 'suspend' && <Ban className="h-4 w-4 mr-2" />}
                    {actionType === 'delete' && <Trash2 className="h-4 w-4 mr-2" />}
                    {actionType.charAt(0).toUpperCase() + actionType.slice(1)}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PayoutReviewDialog
        eventId={event.id}
        open={payoutReviewOpen}
        onOpenChange={setPayoutReviewOpen}
        onDone={() => router.refresh()}
      />

      <CompletionDialog
        open={completionOpen}
        eventId={eventId}
        onOpenChange={setCompletionOpen}
        onConfirm={confirmCompleteEvent}
        confirming={publishLoading}
      />
    </div>
  )
}
