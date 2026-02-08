'use client'

/**
 * ADMIN EMAIL HISTORY PAGE
 * /admin/communications/history
 * 
 * View all sent emails with delivery status
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  Search,
  ChevronLeft,
  ChevronRight,
  Mail,
  User,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Send,
  Users,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface EmailLog {
  id: string
  to_email: string
  to_user_id: string | null
  subject: string
  body: string
  template_id: string | null
  status: string
  error_message: string | null
  sent_by: string
  sent_at: string
  delivered_at: string | null
  opened_at: string | null
  email_type: string
  metadata: Record<string, any>
  recipient?: {
    full_name: string
    email: string
  }
  sender?: {
    full_name: string
    email: string
  }
  template?: {
    name: string
  }
}

const ITEMS_PER_PAGE = 25

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: Send },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  opened: { label: 'Opened', color: 'bg-purple-100 text-purple-700', icon: Eye },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: XCircle },
  bounced: { label: 'Bounced', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  single: { label: 'Single', color: 'bg-neutral-100 text-neutral-700' },
  bulk: { label: 'Bulk', color: 'bg-blue-100 text-blue-700' },
  transactional: { label: 'Transactional', color: 'bg-green-100 text-green-700' },
  notification: { label: 'Notification', color: 'bg-purple-100 text-purple-700' },
}

export default function EmailHistoryPage() {
  const supabase = createClient()
  
  const [emails, setEmails] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Stats
  const [stats, setStats] = useState({
    totalSent: 0,
    delivered: 0,
    failed: 0,
    openRate: 0,
  })

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null)

  useEffect(() => {
    fetchEmails()
    fetchStats()
  }, [page, statusFilter, typeFilter, search])

  const fetchStats = async () => {
    const [total, delivered, failed, opened] = await Promise.all([
      supabase.from('email_logs').select('id', { count: 'exact', head: true }),
      supabase.from('email_logs').select('id', { count: 'exact', head: true }).eq('status', 'delivered'),
      supabase.from('email_logs').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
      supabase.from('email_logs').select('id', { count: 'exact', head: true }).not('opened_at', 'is', null),
    ])

    const totalCount = total.count || 0
    const deliveredCount = delivered.count || 0
    const openedCount = opened.count || 0

    setStats({
      totalSent: totalCount,
      delivered: deliveredCount,
      failed: failed.count || 0,
      openRate: deliveredCount > 0 ? Math.round((openedCount / deliveredCount) * 100) : 0,
    })
  }

  const fetchEmails = async () => {
    setLoading(true)

    let query = supabase
      .from('email_logs')
      .select(`
        *,
        recipient:profiles!email_logs_to_user_id_fkey(full_name, email),
        sender:profiles!email_logs_sent_by_fkey(full_name, email),
        template:email_templates(name)
      `, { count: 'exact' })
      .order('sent_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (typeFilter !== 'all') {
      query = query.eq('email_type', typeFilter)
    }

    if (search) {
      query = query.or(`to_email.ilike.%${search}%,subject.ilike.%${search}%`)
    }

    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.error(error)
      // If table doesn't exist, show empty state
      setEmails([])
      setTotalCount(0)
    } else {
      setEmails(data || [])
      setTotalCount(count || 0)
    }

    setLoading(false)
  }

  const handleResend = async (email: EmailLog) => {
    if (!confirm('Resend this email?')) return

    try {
      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email.to_email,
          toUserId: email.to_user_id,
          subject: email.subject,
          body: email.body,
        }),
      })

      if (!response.ok) throw new Error('Failed to send')
      
      toast.success('Email resent successfully')
      fetchEmails()
      fetchStats()
    } catch (error) {
      toast.error('Failed to resend email')
    }
  }

  const openDetail = (email: EmailLog) => {
    setSelectedEmail(email)
    setDetailOpen(true)
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/communications">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold">Email History</h2>
          <p className="text-muted-foreground">View all sent emails and their delivery status</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold">{stats.totalSent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold">{stats.delivered}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold">{stats.failed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Eye className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open Rate</p>
                <p className="text-2xl font-bold">{stats.openRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or subject..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(TYPE_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { fetchEmails(); fetchStats(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Emails Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : emails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No emails found
                  </TableCell>
                </TableRow>
              ) : (
                emails.map((email) => {
                  const statusConfig = STATUS_CONFIG[email.status] || STATUS_CONFIG.pending
                  const typeConfig = TYPE_CONFIG[email.email_type] || TYPE_CONFIG.single
                  const StatusIcon = statusConfig.icon

                  return (
                    <TableRow key={email.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {email.recipient?.full_name || email.to_email}
                            </p>
                            <p className="text-xs text-muted-foreground">{email.to_email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="line-clamp-1 max-w-xs">{email.subject}</p>
                        {email.template && (
                          <p className="text-xs text-muted-foreground">
                            Template: {email.template.name}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        {email.error_message && (
                          <p className="text-xs text-red-600 mt-1 line-clamp-1">
                            {email.error_message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <p>{format(new Date(email.sent_at), 'MMM d, HH:mm')}</p>
                        <p className="text-xs">{formatDistanceToNow(new Date(email.sent_at))} ago</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openDetail(email)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {email.status === 'failed' && (
                            <Button variant="ghost" size="sm" onClick={() => handleResend(email)}>
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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
            Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, totalCount)} of {totalCount}
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

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Details</DialogTitle>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4 mt-4">
              {/* Status Timeline */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-neutral-50">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${selectedEmail.sent_at ? 'bg-blue-500' : 'bg-gray-300'}`} />
                  <span className="text-sm">Sent</span>
                </div>
                <div className="flex-1 h-0.5 bg-gray-200" />
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${selectedEmail.delivered_at ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm">Delivered</span>
                </div>
                <div className="flex-1 h-0.5 bg-gray-200" />
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${selectedEmail.opened_at ? 'bg-purple-500' : 'bg-gray-300'}`} />
                  <span className="text-sm">Opened</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">To</p>
                  <p className="font-medium">{selectedEmail.to_email}</p>
                  {selectedEmail.recipient?.full_name && (
                    <p className="text-sm text-muted-foreground">{selectedEmail.recipient.full_name}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">From</p>
                  <p className="font-medium">{selectedEmail.sender?.full_name || 'System'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Subject</p>
                <p className="font-medium">{selectedEmail.subject}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Body</p>
                <div className="p-4 rounded-lg border bg-white whitespace-pre-wrap text-sm">
                  {selectedEmail.body}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Sent At</p>
                  <p>{format(new Date(selectedEmail.sent_at), 'PPp')}</p>
                </div>
                {selectedEmail.delivered_at && (
                  <div>
                    <p className="text-muted-foreground">Delivered At</p>
                    <p>{format(new Date(selectedEmail.delivered_at), 'PPp')}</p>
                  </div>
                )}
                {selectedEmail.opened_at && (
                  <div>
                    <p className="text-muted-foreground">Opened At</p>
                    <p>{format(new Date(selectedEmail.opened_at), 'PPp')}</p>
                  </div>
                )}
              </div>

              {selectedEmail.error_message && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700">
                    <strong>Error:</strong> {selectedEmail.error_message}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                {selectedEmail.status === 'failed' && (
                  <Button onClick={() => { handleResend(selectedEmail); setDetailOpen(false); }}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resend Email
                  </Button>
                )}
                <Button variant="outline" onClick={() => setDetailOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
