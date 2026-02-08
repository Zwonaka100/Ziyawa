'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  MoreHorizontal, 
  Eye, 
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Plus
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Ticket {
  id: string
  ticket_number: string
  user_id: string
  subject: string
  category: string
  priority: string
  status: string
  created_at: string
  updated_at: string
  user?: {
    full_name: string
    email: string
  }
  assigned?: {
    full_name: string
  }
}

const ITEMS_PER_PAGE = 20

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-neutral-100 text-neutral-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  waiting: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-neutral-100 text-neutral-700',
  closed: 'bg-neutral-100 text-neutral-700',
}

export default function AdminSupportPage() {
  const searchParams = useSearchParams()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    fetchTickets()
  }, [page, statusFilter, categoryFilter])

  const fetchTickets = async () => {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        user:user_id (
          full_name,
          email
        ),
        assigned:assigned_to (
          full_name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (categoryFilter !== 'all') {
      query = query.eq('category', categoryFilter)
    }

    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      toast.error('Failed to fetch tickets')
      console.error(error)
    } else {
      setTickets(data || [])
      setTotalCount(count || 0)
    }

    setLoading(false)
  }

  const handleUpdateStatus = async (ticketId: string, status: string) => {
    const supabase = createClient()
    
    const updateData: any = { status }
    
    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString()
    } else if (status === 'closed') {
      updateData.closed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId)

    if (error) {
      toast.error('Failed to update ticket')
    } else {
      toast.success('Ticket updated')
      fetchTickets()
    }
  }

  const handleAssignToMe = async (ticketId: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase
      .from('support_tickets')
      .update({ 
        assigned_to: user?.id,
        status: 'in_progress'
      })
      .eq('id', ticketId)

    if (error) {
      toast.error('Failed to assign ticket')
    } else {
      toast.success('Ticket assigned to you')
      fetchTickets()
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Support Tickets</h2>
          <p className="text-muted-foreground">Manage customer support requests</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        {['open', 'in_progress', 'waiting', 'resolved', 'closed'].map((status) => (
          <Card 
            key={status} 
            className={`cursor-pointer ${statusFilter === status ? 'ring-2 ring-primary' : ''}`}
            onClick={() => { setStatusFilter(status); setPage(1); }}
          >
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground capitalize">{status.replace('_', ' ')}</p>
              <p className="text-2xl font-bold">
                {/* Show counts from fetched data */}
                -
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="report">Report</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
                <SelectItem value="account">Account</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No tickets found
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <div>
                        <p className="font-mono text-sm">{ticket.ticket_number}</p>
                        <p className="font-medium line-clamp-1">{ticket.subject}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {ticket.user ? (
                        <Link href={`/admin/users/${ticket.user_id}`} className="hover:underline">
                          {ticket.user.full_name || ticket.user.email}
                        </Link>
                      ) : (
                        'Unknown'
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{ticket.category}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded text-xs capitalize ${PRIORITY_COLORS[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded text-xs capitalize ${STATUS_COLORS[ticket.status]}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {ticket.assigned?.full_name || '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(ticket.created_at), 'MMM d, yyyy')}
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
                            <Link href={`/admin/support/${ticket.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View & Reply
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleAssignToMe(ticket.id)}>
                            Assign to Me
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleUpdateStatus(ticket.id, 'in_progress')}>
                            <Clock className="h-4 w-4 mr-2" />
                            Mark In Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(ticket.id, 'waiting')}>
                            Mark Waiting
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(ticket.id, 'resolved')}>
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            Mark Resolved
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(ticket.id, 'closed')}>
                            Close Ticket
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
            Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, totalCount)} of {totalCount} tickets
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
            <span className="text-sm">Page {page} of {totalPages}</span>
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
