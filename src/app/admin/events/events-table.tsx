'use client'

import { useState, useEffect, useCallback, useRef, type FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  MoreHorizontal,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RotateCcw,
  Loader2,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import type { AdminEventRow, OrganizerOption } from '@/lib/admin/events'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/helpers'


const DEFAULT_PAGE_SIZE = 20

function isPastEvent(eventDate: string) {
  if (!eventDate) return false
  const eventDateValue = new Date(`${eventDate}T23:59:59`)
  return eventDateValue < new Date()
}

function getEventDisplayStatus(event: AdminEventRow) {
  if (event.state === 'cancelled') {
    return { label: 'Cancelled', color: 'text-gray-600' }
  }

  if (event.state === 'suspended') {
    return { label: 'Suspended', color: 'text-red-600' }
  }

  if (event.state === 'completed') {
    return { label: 'Completed', color: 'text-green-600' }
  }

  if (event.state === 'locked') {
    return { label: 'Locked', color: 'text-purple-600' }
  }

  if (event.state === 'pending_approval') {
    return { label: 'Pending Approval', color: 'text-yellow-600' }
  }

  if (event.state === 'rejected') {
    return { label: 'Rejected', color: 'text-red-600' }
  }

  if (event.is_published && isPastEvent(event.event_date)) {
    return { label: 'Past Published', color: 'text-amber-600' }
  }

  if (event.is_published) {
    return { label: 'Published', color: 'text-green-600' }
  }

  return { label: 'Draft', color: 'text-yellow-600' }
}

export function AdminEventsTable({
  initialEvents,
  initialTotalCount,
  initialOrganizers,
}: {
  initialEvents: AdminEventRow[]
  initialTotalCount: number
  initialOrganizers: OrganizerOption[]
}) {
  const searchParams = useSearchParams()
  // Seeded from the server render — no empty first paint, no fetch on mount.
  const [events, setEvents] = useState<AdminEventRow[]>(initialEvents)
  const [loading, setLoading] = useState(false)
  const hydratedFromServer = useRef(true)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [lifecycleFilter, setLifecycleFilter] = useState(searchParams.get('lifecycle') || 'all')
  const [stateFilter, setStateFilter] = useState(searchParams.get('state') || 'all')
  const [organizerFilter, setOrganizerFilter] = useState(searchParams.get('organizer') || 'all')
  const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') || '')
  const [dateTo, setDateTo] = useState(searchParams.get('date_to') || '')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>((searchParams.get('dir') || 'desc') as 'asc' | 'desc')
  const [pageSize, setPageSize] = useState(Number(searchParams.get('page_size') || DEFAULT_PAGE_SIZE))
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [organizers] = useState<OrganizerOption[]>(initialOrganizers)
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [publishingEventId, setPublishingEventId] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        lifecycle: lifecycleFilter,
        state: stateFilter,
        organizer: organizerFilter,
        sort: sortBy,
        dir: sortDirection,
        page: String(page),
        page_size: String(pageSize),
      })
      if (searchQuery.trim()) params.set('q', searchQuery.trim())
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)

      const response = await fetch(`/api/admin/events?${params.toString()}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to fetch events')

      setEvents(data.events || [])
      setTotalCount(data.totalCount || 0)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to fetch events')
      setEvents([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, lifecycleFilter, organizerFilter, page, pageSize, searchQuery, sortBy, sortDirection, stateFilter])

  useEffect(() => {
    if (hydratedFromServer.current) {
      hydratedFromServer.current = false
      return
    }
    void fetchEvents()
  }, [fetchEvents])

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    setPage(1)
    void fetchEvents()
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setLifecycleFilter('all')
    setStateFilter('all')
    setOrganizerFilter('all')
    setDateFrom('')
    setDateTo('')
    setSortBy('created_at')
    setSortDirection('desc')
    setPageSize(DEFAULT_PAGE_SIZE)
    setPage(1)
  }

  const handlePublish = async (eventId: string, publish: boolean) => {
    setPublishingEventId(eventId)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish }),
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

      setSelectedEventIds((prev) => prev.filter((id) => id !== eventId))
      void fetchEvents()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update event visibility')
    } finally {
      setPublishingEventId(null)
    }
  }

  const handleBulkPublish = async (publish: boolean) => {
    if (selectedEventIds.length === 0) return
    setBulkActionLoading(true)

    try {
      let successCount = 0
      let refundCount = 0

      for (const eventId of selectedEventIds) {
        const response = await fetch(`/api/admin/events/${eventId}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publish }),
        })

        const payload = await response.json().catch(() => ({})) as { refundedTickets?: number }
        if (response.ok) {
          successCount += 1
          refundCount += Number(payload.refundedTickets || 0)
        }
      }

      if (successCount === 0) {
        toast.error('Failed to update selected events')
      } else if (!publish && refundCount > 0) {
        toast.success(`Updated ${successCount} event(s). ${refundCount} refund item(s) queued.`)
      } else {
        toast.success(publish ? `Published ${successCount} event(s)` : `Unpublished ${successCount} event(s)`)
      }

      setSelectedEventIds([])
      void fetchEvents()
    } catch (error) {
      console.error(error)
      toast.error('Failed to update selected events')
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedEventIds.length === 0) return
    if (!confirm(`Delete ${selectedEventIds.length} selected event(s)? This cannot be undone.`)) return

    setBulkActionLoading(true)

    try {
      let successCount = 0
      let cancelledCount = 0

      for (const eventId of selectedEventIds) {
        const response = await fetch(`/api/admin/events/${eventId}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation: 'delete', reason: 'Removed by admin moderation' }),
        })

        const payload = await response.json().catch(() => ({})) as { deleted?: boolean }
        if (response.ok) {
          successCount += 1
          if (!payload.deleted) cancelledCount += 1
        }
      }

      if (successCount === 0) {
        toast.error('Failed to delete selected events')
      } else if (cancelledCount > 0) {
        toast.success(`Removed ${successCount} event(s). ${cancelledCount} were cancelled due to existing records.`)
      } else {
        toast.success(`Deleted ${successCount} event(s)`)
      }

      setSelectedEventIds([])
      void fetchEvents()
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete selected events')
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/events/${eventId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'delete', reason: 'Removed by admin moderation' }),
      })

      const payload = await response.json().catch(() => ({})) as { error?: string; deleted?: boolean }
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete event')
      }

      toast.success(payload.deleted ? 'Event deleted' : 'Event removed from public listings')
      void fetchEvents()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete event')
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Event Management</h2>
          <p className="text-muted-foreground">Manage all platform events</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          {selectedEventIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
              <span className="text-sm font-medium">{selectedEventIds.length} selected</span>
              <Button type="button" size="sm" variant="outline" onClick={() => void handleBulkPublish(true)} disabled={bulkActionLoading}>
                {bulkActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Publish
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => void handleBulkPublish(false)} disabled={bulkActionLoading}>
                {bulkActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                Unpublish
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => void handleBulkDelete()} disabled={bulkActionLoading}>
                {bulkActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete
              </Button>
            </div>
          )}
          <form onSubmit={handleSearch} className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr] xl:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]">
            <div className="relative lg:col-span-2 xl:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search title, venue or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={lifecycleFilter} onValueChange={(value) => { setLifecycleFilter(value); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Lifecycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Lifecycle</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past</SelectItem>
              </SelectContent>
            </Select>

            <Select value={stateFilter} onValueChange={(value) => { setStateFilter(value); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <Select value={organizerFilter} onValueChange={(value) => { setOrganizerFilter(value); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Organizer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizers</SelectItem>
                {organizers.map((organizer) => (
                  <SelectItem key={organizer.id} value={organizer.id}>
                    {organizer.full_name || organizer.email || 'Unknown organizer'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2 lg:col-span-2 xl:col-span-2">
              <Input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} />
              <Input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} />
            </div>

            <Select value={sortBy} onValueChange={(value) => { setSortBy(value); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Created date</SelectItem>
                <SelectItem value="event_date">Event date</SelectItem>
                <SelectItem value="tickets_sold">Tickets sold</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortDirection} onValueChange={(value) => { setSortDirection(value as 'asc' | 'desc'); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>

            <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Rows" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20 rows</SelectItem>
                <SelectItem value="50">50 rows</SelectItem>
                <SelectItem value="100">100 rows</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2 lg:col-span-2 xl:col-span-2">
              <Button type="submit" className="w-full sm:w-auto">Search</Button>
              <Button type="button" variant="outline" onClick={handleResetFilters} className="w-full sm:w-auto">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={events.length > 0 && selectedEventIds.length === events.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedEventIds(events.map((event) => event.id))
                      } else {
                        setSelectedEventIds([])
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Organizer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Tickets</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </TableCell>
                </TableRow>
              ) : events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No events found
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => {
                  const status = getEventDisplayStatus(event)
                  return (
                    <TableRow key={event.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedEventIds.includes(event.id)}
                          onCheckedChange={(checked) => {
                            setSelectedEventIds((prev) =>
                              checked ? [...prev, event.id] : prev.filter((id) => id !== event.id)
                            )
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium line-clamp-1">{event.title}</p>
                          <p className="text-sm text-muted-foreground">{event.venue}, {event.location}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/users/${event.profiles?.id}`} className="hover:underline">
                          {event.profiles?.full_name || event.profiles?.email || 'Unknown'}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {format(new Date(event.event_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {event.ticket_price === 0 ? 'FREE' : formatCurrency(event.ticket_price)}
                      </TableCell>
                      <TableCell>
                        {event.tickets_sold || 0} / {event.capacity}
                      </TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1 ${status.color}`}>
                          {status.label === 'Published' || status.label === 'Past Published' ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : status.label === 'Draft' ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/events/${event.id}`} target="_blank">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Public
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/events/${event.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {event.is_published ? (
                              <DropdownMenuItem disabled={publishingEventId === event.id || bulkActionLoading} onClick={() => handlePublish(event.id, false)}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Unpublish
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem disabled={publishingEventId === event.id || bulkActionLoading} onClick={() => handlePublish(event.id, true)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Publish
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled={bulkActionLoading} onClick={() => handleDelete(event.id)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Event
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} events
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
