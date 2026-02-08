'use client'

import { useState, useEffect } from 'react'
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
  Edit, 
  Trash2,
  Star,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/helpers'

interface Event {
  id: string
  title: string
  venue: string
  location: string
  event_date: string
  ticket_price: number
  capacity: number
  tickets_sold: number
  is_published: boolean
  state: string
  created_at: string
  profiles: {
    id: string
    full_name: string
    email: string
  }
}

const ITEMS_PER_PAGE = 20

export default function AdminEventsPage() {
  const searchParams = useSearchParams()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    fetchEvents()
  }, [page, statusFilter])

  const fetchEvents = async () => {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('events')
      .select(`
        *,
        profiles:organizer_id (
          id,
          full_name,
          email
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply status filter
    if (statusFilter === 'published') {
      query = query.eq('is_published', true)
    } else if (statusFilter === 'draft') {
      query = query.eq('is_published', false)
    }

    // Apply search
    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,venue.ilike.%${searchQuery}%`)
    }

    // Pagination
    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      toast.error('Failed to fetch events')
      console.error(error)
    } else {
      setEvents(data || [])
      setTotalCount(count || 0)
    }

    setLoading(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchEvents()
  }

  const handlePublish = async (eventId: string, publish: boolean) => {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('events')
      .update({ is_published: publish })
      .eq('id', eventId)

    if (error) {
      toast.error('Failed to update event')
    } else {
      toast.success(publish ? 'Event published' : 'Event unpublished')
      fetchEvents()
    }
  }

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return
    }

    const supabase = createClient()
    
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    if (error) {
      toast.error('Failed to delete event')
    } else {
      toast.success('Event deleted')
      fetchEvents()
    }
  }

  const handleFeature = async (eventId: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase
      .from('featured_events')
      .insert({
        event_id: eventId,
        featured_by: user?.id,
      })

    if (error) {
      if (error.code === '23505') {
        toast.error('Event is already featured')
      } else {
        toast.error('Failed to feature event')
      }
    } else {
      toast.success('Event featured on homepage')
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Event Management</h2>
          <p className="text-muted-foreground">Manage all platform events</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
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
                events.map((event) => (
                  <TableRow key={event.id}>
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
                      {event.is_published ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          Published
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <XCircle className="h-4 w-4" />
                          Draft
                        </span>
                      )}
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
                            <DropdownMenuItem onClick={() => handlePublish(event.id, false)}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Unpublish
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handlePublish(event.id, true)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleFeature(event.id)}>
                            <Star className="h-4 w-4 mr-2" />
                            Feature Event
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(event.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Event
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, totalCount)} of {totalCount} events
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
