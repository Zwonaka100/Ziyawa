'use client'

/**
 * ADMIN EVENT DETAIL PAGE
 * /admin/events/[id]
 * 
 * Full event details with moderation actions:
 * - Approve/reject events
 * - Feature/unfeature
 * - Suspend event
 * - View organizer details
 * - View ticket sales
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Ticket,
  DollarSign,
  Clock,
  ExternalLink,
  CheckCircle,
  XCircle,
  Star,
  AlertTriangle,
  Ban,
  Eye,
  Loader2,
  Flag,
  Edit,
  Trash2,
  Users,
} from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/helpers'
import { toast } from 'sonner'

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
  featured?: {
    id: string
    featured_at: string
  }[]
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

export default function AdminEventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const eventId = params.id as string

  const [event, setEvent] = useState<EventDetail | null>(null)
  const [bookings, setBookings] = useState<BookingSummary[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Action dialog
  const [actionOpen, setActionOpen] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'suspend' | 'feature' | 'unfeature' | 'delete'>('approve')
  const [actionNotes, setActionNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchEvent()
    fetchBookings()
    fetchReports()
  }, [eventId])

  const fetchEvent = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        organizer:profiles!events_organizer_id_fkey(id, full_name, email, avatar_url, phone),
        featured:featured_events(id, featured_at)
      `)
      .eq('id', eventId)
      .single()

    if (error) {
      toast.error('Failed to load event')
      console.error(error)
    } else {
      setEvent(data)
    }

    setLoading(false)
  }

  const fetchBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select(`
        id, quantity, total_amount, status, created_at,
        user:profiles!bookings_user_id_fkey(full_name, email)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) {
      // Transform the data to match BookingSummary type
      const transformed = data.map(b => ({
        ...b,
        user: Array.isArray(b.user) ? b.user[0] : b.user
      }))
      setBookings(transformed as BookingSummary[])
    }
  }

  const fetchReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .eq('reported_type', 'event')
      .eq('reported_id', eventId)
      .order('created_at', { ascending: false })

    if (data) setReports(data)
  }

  const openAction = (type: typeof actionType) => {
    setActionType(type)
    setActionNotes('')
    setActionOpen(true)
  }

  const handleAction = async () => {
    if (!event) return

    setProcessing(true)

    try {
      const { data: { user: admin } } = await supabase.auth.getUser()
      
      let updates: Record<string, any> = {}

      switch (actionType) {
        case 'approve':
          updates = { state: 'approved', is_approved: true, is_published: true }
          break
        case 'reject':
          updates = { state: 'rejected', is_approved: false, is_published: false }
          break
        case 'suspend':
          updates = { state: 'suspended', is_published: false }
          break
        case 'feature':
          await supabase.from('featured_events').insert({
            event_id: eventId,
            featured_by: admin?.id,
          })
          toast.success('Event featured successfully')
          setActionOpen(false)
          fetchEvent()
          setProcessing(false)
          return
        case 'unfeature':
          await supabase.from('featured_events').delete().eq('event_id', eventId)
          toast.success('Event removed from featured')
          setActionOpen(false)
          fetchEvent()
          setProcessing(false)
          return
        case 'delete':
          const { error: deleteError } = await supabase
            .from('events')
            .delete()
            .eq('id', eventId)
          if (deleteError) throw deleteError
          toast.success('Event deleted')
          router.push('/admin/events')
          return
      }

      // Update event
      const { error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId)

      if (error) throw error

      // Audit log
      await supabase.from('admin_audit_logs').insert({
        admin_id: admin?.id,
        action: `event_${actionType}`,
        entity_type: 'event',
        entity_id: eventId,
        details: {
          event_title: event.title,
          organizer_email: event.organizer?.email,
          notes: actionNotes,
        },
      })

      // Notify organizer (TODO: Send email)
      await supabase.from('notifications').insert({
        user_id: event.organizer_id,
        type: `event_${actionType}`,
        title: actionType === 'approve' 
          ? 'Event Approved!' 
          : actionType === 'reject' 
            ? 'Event Rejected' 
            : 'Event Suspended',
        message: actionNotes || `Your event "${event.title}" has been ${actionType}ed by our moderation team.`,
        link: `/dashboard/events/${eventId}`,
      })

      toast.success(`Event ${actionType}ed successfully`)
      setActionOpen(false)
      fetchEvent()
    } catch (error) {
      console.error('Action error:', error)
      toast.error(`Failed to ${actionType} event`)
    } finally {
      setProcessing(false)
    }
  }

  const handlePublish = async (publish: boolean) => {
    const { error } = await supabase
      .from('events')
      .update({ is_published: publish })
      .eq('id', eventId)

    if (error) {
      toast.error('Failed to update event')
    } else {
      toast.success(publish ? 'Event published' : 'Event unpublished')
      fetchEvent()
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

  const isFeatured = event.featured && event.featured.length > 0
  const stateConfig = STATE_CONFIG[event.state] || STATE_CONFIG.draft
  const revenue = bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
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
              <Badge className={stateConfig.color}>{stateConfig.label}</Badge>
              {isFeatured && (
                <Badge className="bg-yellow-100 text-yellow-700">
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  Featured
                </Badge>
              )}
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
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
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
              <Button onClick={() => handlePublish(false)} variant="outline">
                <XCircle className="h-4 w-4 mr-2" />
                Unpublish
              </Button>
            ) : event.state === 'approved' && (
              <Button onClick={() => handlePublish(true)} variant="outline">
                <CheckCircle className="h-4 w-4 mr-2" />
                Publish
              </Button>
            )}

            {isFeatured ? (
              <Button onClick={() => openAction('unfeature')} variant="outline">
                <Star className="h-4 w-4 mr-2" />
                Unfeature
              </Button>
            ) : (
              <Button onClick={() => openAction('feature')} variant="outline">
                <Star className="h-4 w-4 mr-2" />
                Feature
              </Button>
            )}

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

      {/* Action Dialog */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve Event'}
              {actionType === 'reject' && 'Reject Event'}
              {actionType === 'suspend' && 'Suspend Event'}
              {actionType === 'feature' && 'Feature Event'}
              {actionType === 'unfeature' && 'Remove from Featured'}
              {actionType === 'delete' && 'Delete Event'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' && 'Approve this event to allow it to be published on the platform.'}
              {actionType === 'reject' && 'Reject this event. The organizer will be notified with your feedback.'}
              {actionType === 'suspend' && 'Suspend this event. It will be hidden from the platform immediately.'}
              {actionType === 'feature' && 'Feature this event on the homepage for more visibility.'}
              {actionType === 'unfeature' && 'Remove this event from the featured section.'}
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
                    {actionType === 'feature' && <Star className="h-4 w-4 mr-2" />}
                    {actionType === 'unfeature' && <Star className="h-4 w-4 mr-2" />}
                    {actionType === 'delete' && <Trash2 className="h-4 w-4 mr-2" />}
                    {actionType.charAt(0).toUpperCase() + actionType.slice(1)}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
