'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  User,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  RotateCcw,
  Loader2,
  Ticket,
  Calendar,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface RefundQueueItem {
  id: string
  event_id: string | null
  source_transaction_id: string | null
  user_id: string
  amount: number
  reason: string
  status: 'new' | 'under_review' | 'approved' | 'rejected' | 'executed' | 'failed'
  requested_at: string
  reviewed_at: string | null
  executed_at: string | null
  admin_notes: string | null
  refund_method: 'wallet'
  user?: {
    full_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
  event?: {
    id: string
    title: string
    event_date: string
  } | null
  transaction?: {
    id: string
    reference: string
    type: string
    state: string
  } | null
}

const ITEMS_PER_PAGE = 25

const STATUS_CONFIG: Record<RefundQueueItem['status'], { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-yellow-100 text-yellow-700' },
  under_review: { label: 'Under Review', color: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  executed: { label: 'Executed', color: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', color: 'bg-orange-100 text-orange-700' },
}

const REFUND_REASONS: Record<string, string> = {
  event_cancelled: 'Event Cancelled',
  event_postponed: 'Event Postponed',
  duplicate_purchase: 'Duplicate Purchase',
  wrong_tickets: 'Wrong Tickets',
  unable_to_attend: 'Unable to Attend',
  dissatisfied: 'Dissatisfied with Service',
  admin_requested: 'Admin Requested',
  other: 'Other',
}

export default function AdminRefundsPage() {
  const [allItems, setAllItems] = useState<RefundQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('new')
  const [reasonFilter, setReasonFilter] = useState('all')
  const [page, setPage] = useState(1)

  const [processOpen, setProcessOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<RefundQueueItem | null>(null)
  const [processAction, setProcessAction] = useState<'approve' | 'reject' | 'review'>('approve')
  const [adminNotes, setAdminNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const query = statusFilter !== 'all' ? `?status=${encodeURIComponent(statusFilter)}` : ''
      const response = await fetch(`/api/admin/refunds${query}`, { cache: 'no-store' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load refund queue')
      }

      const items: RefundQueueItem[] = (data.items || []).map((item: {
        id: string
        event_id: string | null
        source_transaction_id: string | null
        user_id: string
        amount_cents: number
        reason_code: string
        status: RefundQueueItem['status']
        created_at: string
        reviewed_at: string | null
        executed_at: string | null
        admin_notes: string | null
        user?: RefundQueueItem['user']
        event?: RefundQueueItem['event']
        sourceTransaction?: RefundQueueItem['transaction']
      }) => ({
        id: item.id,
        event_id: item.event_id,
        source_transaction_id: item.source_transaction_id,
        user_id: item.user_id,
        amount: Number(item.amount_cents || 0) / 100,
        reason: item.reason_code,
        status: item.status,
        requested_at: item.created_at,
        reviewed_at: item.reviewed_at,
        executed_at: item.executed_at,
        admin_notes: item.admin_notes,
        refund_method: 'wallet',
        user: item.user,
        event: item.event,
        transaction: item.sourceTransaction,
      }))

      setAllItems(items)
    } catch (error) {
      console.error('Refund queue load error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load refund queue')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void fetchItems()
  }, [fetchItems])

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase()
    return allItems.filter((item) => {
      const reasonOk = reasonFilter === 'all' || item.reason === reasonFilter
      if (!reasonOk) return false

      if (!term) return true

      const haystack = [
        item.user?.full_name || '',
        item.user?.email || '',
        item.event?.title || '',
        item.transaction?.reference || '',
      ].join(' ').toLowerCase()

      return haystack.includes(term)
    })
  }, [allItems, search, reasonFilter])

  const totalCount = filteredItems.length
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE))

  const paginatedItems = useMemo(() => {
    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE
    return filteredItems.slice(from, to)
  }, [filteredItems, page])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const stats = useMemo(() => {
    const firstOfMonth = new Date()
    firstOfMonth.setDate(1)
    firstOfMonth.setHours(0, 0, 0, 0)

    const pending = allItems.filter((item) => item.status === 'new' || item.status === 'under_review')
    const refunded = allItems.filter((item) => item.status === 'executed' && item.executed_at && new Date(item.executed_at) >= firstOfMonth)

    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, item) => sum + item.amount, 0),
      refundedThisMonth: refunded.length,
      refundedAmount: refunded.reduce((sum, item) => sum + item.amount, 0),
    }
  }, [allItems])

  const openProcess = (item: RefundQueueItem, action: 'approve' | 'reject' | 'review') => {
    setSelectedItem(item)
    setProcessAction(action)
    setAdminNotes('')
    setProcessOpen(true)
  }

  const handleProcess = async () => {
    if (!selectedItem) return

    setProcessing(true)
    try {
      const response = await fetch(`/api/admin/refunds/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: processAction, notes: adminNotes || undefined }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process refund decision')
      }

      toast.success(
        processAction === 'approve'
          ? 'Refund approved and credited to wallet'
          : processAction === 'review'
            ? 'Refund moved to review'
            : 'Refund rejected'
      )

      setProcessOpen(false)
      await fetchItems()
    } catch (error) {
      console.error('Refund decision error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to process refund decision')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/finance">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold">Refund Queue</h2>
          <p className="text-muted-foreground">Admin-reviewed wallet-credit refunds</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-700">Pending Refunds</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.pendingCount}</p>
            <p className="text-sm text-yellow-600">{formatCurrency(stats.pendingAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Refunded This Month</p>
            <p className="text-2xl font-bold text-green-600">{stats.refundedThisMonth}</p>
            <p className="text-sm text-muted-foreground">{formatCurrency(stats.refundedAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Refund Model</p>
            <p className="text-2xl font-bold">Wallet</p>
            <p className="text-sm text-muted-foreground">Admin-approved only</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Execution Mode</p>
            <p className="text-2xl font-bold">Manual</p>
            <p className="text-sm text-muted-foreground">Review then approve</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, event, transaction..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="under_review">Under review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="executed">Executed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={reasonFilter} onValueChange={(v) => { setReasonFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All reasons</SelectItem>
                {Object.entries(REFUND_REASONS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Event / Transaction</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No refund work items found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) => {
                  const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.new
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden">
                            {item.user?.avatar_url ? (
                              <Image
                                src={item.user.avatar_url}
                                alt=""
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <Link href={`/admin/users/${item.user_id}`} className="font-medium hover:underline">
                              {item.user?.full_name || 'Unknown user'}
                            </Link>
                            <p className="text-xs text-muted-foreground">{item.user?.email || 'No email'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.event ? (
                          <div className="text-sm">
                            <Link href={`/admin/events/${item.event.id}`} className="font-medium hover:underline flex items-center gap-1">
                              {item.event.title}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                            <div className="flex items-center gap-2 text-muted-foreground text-xs">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(item.event.event_date), 'MMM d, yyyy')}
                              {item.transaction?.reference && (
                                <>
                                  <Ticket className="h-3 w-3 ml-2" />
                                  {item.transaction.reference}
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No event context</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                          {REFUND_REASONS[item.reason] || item.reason}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-lg">{formatCurrency(item.amount)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(item.requested_at), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        {['new', 'under_review'].includes(item.status) ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openProcess(item, 'review')}>
                                <Loader2 className="h-4 w-4 mr-2 text-blue-600" />
                                Mark in review
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openProcess(item, 'approve')}>
                                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                Approve and execute
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openProcess(item, 'reject')}>
                                <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                Reject
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-xs text-muted-foreground">No actions</span>
                        )}
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">Page {page} of {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={processOpen} onOpenChange={setProcessOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {processAction === 'approve' && 'Approve Refund'}
              {processAction === 'review' && 'Move Refund To Review'}
              {processAction === 'reject' && 'Reject Refund'}
            </DialogTitle>
            <DialogDescription>
              {processAction === 'approve' && 'This will execute a wallet credit to the user immediately.'}
              {processAction === 'review' && 'This marks the refund for additional admin checks.'}
              {processAction === 'reject' && 'This closes the request with a rejection decision.'}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 mt-4">
              <div className="p-4 rounded-lg bg-neutral-50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{selectedItem.user?.full_name || 'Unknown user'}</p>
                    <p className="text-sm text-muted-foreground">{selectedItem.user?.email || 'No email'}</p>
                  </div>
                  <p className="text-xl font-bold">{formatCurrency(selectedItem.amount)}</p>
                </div>
                <div className="mt-3 pt-3 border-t text-sm space-y-1">
                  <p><strong>Reason:</strong> {REFUND_REASONS[selectedItem.reason] || selectedItem.reason}</p>
                  <p><strong>Refund Method:</strong> Wallet credit</p>
                  {selectedItem.event && <p><strong>Event:</strong> {selectedItem.event.title}</p>}
                  {selectedItem.transaction?.reference && <p><strong>Transaction:</strong> {selectedItem.transaction.reference}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Admin Notes {processAction === 'reject' ? '(required)' : '(optional)'}</Label>
                <Textarea
                  id="notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={processAction === 'reject' ? 'Reason for rejection (required)...' : 'Optional notes...'}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setProcessOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleProcess}
                  disabled={processing || (processAction === 'reject' && !adminNotes.trim())}
                  variant={processAction === 'reject' ? 'destructive' : 'default'}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {processAction === 'approve' && <CheckCircle className="h-4 w-4 mr-2" />}
                      {processAction === 'review' && <RotateCcw className="h-4 w-4 mr-2" />}
                      {processAction === 'reject' && <XCircle className="h-4 w-4 mr-2" />}
                      {processAction === 'approve' && 'Approve and Execute'}
                      {processAction === 'review' && 'Move to Review'}
                      {processAction === 'reject' && 'Reject'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
