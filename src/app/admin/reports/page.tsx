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
  XCircle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  User,
  Calendar,
  Star,
  ShoppingBag
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Report {
  id: string
  reporter_id: string
  reported_type: string
  reported_id: string
  reason: string
  description: string
  status: string
  priority: string
  created_at: string
  reporter?: {
    full_name: string
    email: string
  }
}

const ITEMS_PER_PAGE = 20

const TYPE_ICONS: Record<string, any> = {
  user: User,
  organizer: User,
  artist: Star,
  vendor: ShoppingBag,
  event: Calendar,
  review: Star,
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-neutral-100 text-neutral-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  under_review: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  dismissed: 'bg-neutral-100 text-neutral-700',
}

export default function AdminReportsPage() {
  const searchParams = useSearchParams()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    fetchReports()
  }, [page, statusFilter, typeFilter])

  const fetchReports = async () => {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('reports')
      .select(`
        *,
        reporter:reporter_id (
          full_name,
          email
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (typeFilter !== 'all') {
      query = query.eq('reported_type', typeFilter)
    }

    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      toast.error('Failed to fetch reports')
      console.error(error)
    } else {
      setReports(data || [])
      setTotalCount(count || 0)
    }

    setLoading(false)
  }

  const handleUpdateStatus = async (reportId: string, status: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const updateData: any = { status }
    
    if (status === 'resolved' || status === 'dismissed') {
      updateData.resolved_by = user?.id
      updateData.resolved_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('reports')
      .update(updateData)
      .eq('id', reportId)

    if (error) {
      toast.error('Failed to update report')
    } else {
      toast.success('Report updated')
      fetchReports()
    }
  }

  const handleUpdatePriority = async (reportId: string, priority: string) => {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('reports')
      .update({ priority })
      .eq('id', reportId)

    if (error) {
      toast.error('Failed to update priority')
    } else {
      toast.success('Priority updated')
      fetchReports()
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reports & Complaints</h2>
          <p className="text-muted-foreground">Review and resolve user reports</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {['pending', 'under_review', 'resolved', 'dismissed'].map((status) => (
          <Card 
            key={status} 
            className={`cursor-pointer ${statusFilter === status ? 'ring-2 ring-primary' : ''}`}
            onClick={() => { setStatusFilter(status); setPage(1); }}
          >
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground capitalize">{status.replace('_', ' ')}</p>
              <p className="text-2xl font-bold">
                {reports.filter(r => r.status === status).length}
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="organizer">Organizer</SelectItem>
                <SelectItem value="artist">Artist</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="review">Review</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
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
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No reports found
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => {
                  const TypeIcon = TYPE_ICONS[report.reported_type] || AlertTriangle
                  return (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">{report.reported_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium capitalize">{report.reason.replace('_', ' ')}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">{report.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {report.reporter ? (
                          <Link href={`/admin/users/${report.reporter_id}`} className="hover:underline">
                            {report.reporter.full_name || report.reporter.email}
                          </Link>
                        ) : (
                          'Anonymous'
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded text-xs capitalize ${PRIORITY_COLORS[report.priority]}`}>
                          {report.priority}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded text-xs capitalize ${STATUS_COLORS[report.status]}`}>
                          {report.status.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        {format(new Date(report.created_at), 'MMM d, yyyy')}
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
                              <Link href={`/admin/reports/${report.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleUpdateStatus(report.id, 'under_review')}>
                              Start Review
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(report.id, 'resolved')}>
                              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                              Mark Resolved
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(report.id, 'dismissed')}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Dismiss
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleUpdatePriority(report.id, 'urgent')}>
                              Set Urgent
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdatePriority(report.id, 'high')}>
                              Set High Priority
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, totalCount)} of {totalCount} reports
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
