'use client'

/**
 * ADMIN REFUNDS PAGE
 * /admin/finance/refunds
 * 
 * Process refund requests and manage refund history
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
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

interface RefundRequest {
  id: string
  booking_id: string
  user_id: string
  amount: number
  reason: string
  status: string
  requested_at: string
  processed_at: string | null
  admin_notes: string | null
  refund_method: string
  user?: {
    full_name: string
    email: string
    avatar_url: string
  }
  booking?: {
    id: string
    event_id: string
    quantity: number
    total_amount: number
    created_at: string
    event?: {
      title: string
      start_date: string
    }
  }
  transaction?: {
    id: string
    reference: string
    gateway_provider: string
  }
}

const ITEMS_PER_PAGE = 25

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700' },
  processing: { label: 'Processing', color: 'bg-purple-100 text-purple-700' },
  completed: { label: 'Refunded', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  partial: { label: 'Partial Refund', color: 'bg-orange-100 text-orange-700' },
}

const REFUND_REASONS: Record<string, string> = {
  event_cancelled: 'Event Cancelled',
  event_postponed: 'Event Postponed',
  duplicate_purchase: 'Duplicate Purchase',
  wrong_tickets: 'Wrong Tickets',
  unable_to_attend: 'Unable to Attend',
  dissatisfied: 'Dissatisfied with Service',
  other: 'Other',
}

export default function AdminRefundsPage() {
  const supabase = createClient()
  
  const [refunds, setRefunds] = useState<RefundRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [reasonFilter, setReasonFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Process dialog
  const [processOpen, setProcessOpen] = useState(false)
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null)
  const [processAction, setProcessAction] = useState<'approve' | 'reject' | 'process'>('approve')
  const [adminNotes, setAdminNotes] = useState('')
  const [partialAmount, setPartialAmount] = useState('')
  const [processing, setProcessing] = useState(false)

  // Stats
  const [stats, setStats] = useState({
    pendingCount: 0,
    pendingAmount: 0,
    refundedThisMonth: 0,
    refundedAmount: 0,
  })

  useEffect(() => {
    fetchRefunds()
    fetchStats()
  }, [page, statusFilter, reasonFilter, search])

  const fetchStats = async () => {
    const firstOfMonth = new Date()
    firstOfMonth.setDate(1)
    firstOfMonth.setHours(0, 0, 0, 0)
    
    const [pending, refunded] = await Promise.all([
      supabase.from('refund_requests').select('amount').eq('status', 'pending'),
      supabase.from('refund_requests').select('amount').eq('status', 'completed').gte('processed_at', firstOfMonth.toISOString()),
    ])

    setStats({
      pendingCount: pending.data?.length || 0,
      pendingAmount: pending.data?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0,
      refundedThisMonth: refunded.data?.length || 0,
      refundedAmount: refunded.data?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0,
    })
  }

  const fetchRefunds = async () => {
    setLoading(true)

    let query = supabase
      .from('refund_requests')
      .select(`
        *,
        user:profiles!refund_requests_user_id_fkey(full_name, email, avatar_url),
        booking:bookings(
          id,
          event_id,
          quantity,
          total_amount,
          created_at,
          event:events(title, start_date)
        ),
        transaction:transactions(id, reference, gateway_provider)
      `, { count: 'exact' })
      .order('requested_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (reasonFilter !== 'all') {
      query = query.eq('reason', reasonFilter)
    }

    if (search) {
      query = query.or(`user.full_name.ilike.%${search}%,user.email.ilike.%${search}%`)
    }

    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (!error && data) {
      setRefunds(data)
      setTotalCount(count || 0)
    }

    setLoading(false)
  }

  const openProcess = (refund: RefundRequest, action: 'approve' | 'reject' | 'process') => {
    setSelectedRefund(refund)
    setProcessAction(action)
    setAdminNotes('')
    setPartialAmount('')
    setProcessOpen(true)
  }

  const handleProcess = async () => {
    if (!selectedRefund) return

    setProcessing(true)

    try {
      const { data: { user: admin } } = await supabase.auth.getUser()
      
      let newStatus = ''
      let refundAmount = selectedRefund.amount
      
      if (processAction === 'approve') newStatus = 'approved'
      else if (processAction === 'reject') newStatus = 'rejected'
      else if (processAction === 'process') {
        newStatus = 'completed'
        if (partialAmount && parseFloat(partialAmount) < selectedRefund.amount) {
          newStatus = 'partial'
          refundAmount = parseFloat(partialAmount)
        }
      }

      const updates: Record<string, any> = {
        status: newStatus,
        admin_notes: adminNotes || null,
        processed_by: admin?.id,
      }

      if (newStatus === 'completed' || newStatus === 'partial' || newStatus === 'rejected') {
        updates.processed_at = new Date().toISOString()
      }

      if (newStatus === 'partial') {
        updates.refunded_amount = refundAmount
      }

      // Update refund request
      const { error } = await supabase
        .from('refund_requests')
        .update(updates)
        .eq('id', selectedRefund.id)

      if (error) throw error

      // If processing refund, create refund transaction and update original
      if (newStatus === 'completed' || newStatus === 'partial') {
        // Create refund transaction
        await supabase.from('transactions').insert({
          reference: `REFUND-${selectedRefund.transaction?.reference || selectedRefund.id}`,
          type: 'refund',
          status: 'completed',
          amount: refundAmount,
          platform_fee: 0,
          net_amount: -refundAmount,
          payer_id: admin?.id,
          recipient_id: selectedRefund.user_id,
          event_id: selectedRefund.booking?.event_id,
          booking_id: selectedRefund.booking_id,
          gateway_provider: selectedRefund.transaction?.gateway_provider || 'manual',
          metadata: {
            original_transaction_id: selectedRefund.transaction?.id,
            refund_reason: selectedRefund.reason,
            admin_notes: adminNotes,
          },
        })

        // Update original transaction status to refunded
        if (selectedRefund.transaction?.id) {
          await supabase
            .from('transactions')
            .update({ status: newStatus === 'partial' ? 'partial_refund' : 'refunded' })
            .eq('id', selectedRefund.transaction.id)
        }

        // Credit user's wallet if refund method is wallet
        if (selectedRefund.refund_method === 'wallet') {
          await supabase.rpc('credit_wallet_balance', {
            p_user_id: selectedRefund.user_id,
            p_amount: refundAmount,
          })
        }

        // Cancel booking tickets if full refund
        if (newStatus === 'completed') {
          await supabase
            .from('tickets')
            .update({ status: 'refunded' })
            .eq('booking_id', selectedRefund.booking_id)
        }
      }

      // Audit log
      await supabase.from('admin_audit_logs').insert({
        admin_id: admin?.id,
        action: `refund_${processAction}`,
        entity_type: 'refund',
        entity_id: selectedRefund.id,
        details: {
          amount: refundAmount,
          status: newStatus,
          notes: adminNotes,
          user_email: selectedRefund.user?.email,
          event_title: selectedRefund.booking?.event?.title,
        },
      })

      toast.success(
        processAction === 'approve' ? 'Refund approved' :
        processAction === 'reject' ? 'Refund rejected' :
        `${formatCurrency(refundAmount)} refunded successfully`
      )
      setProcessOpen(false)
      fetchRefunds()
      fetchStats()
    } catch (error) {
      console.error('Process error:', error)
      toast.error('Failed to process refund')
    } finally {
      setProcessing(false)
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/finance">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold">Refunds</h2>
          <p className="text-muted-foreground">Process refund requests and manage refund history</p>
        </div>
      </div>

      {/* Stats */}
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
            <p className="text-sm text-muted-foreground">Refund Policy</p>
            <p className="text-2xl font-bold">48 hrs</p>
            <p className="text-sm text-muted-foreground">Before event</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Auto-approve</p>
            <p className="text-2xl font-bold">Events</p>
            <p className="text-sm text-muted-foreground">Cancelled events only</p>
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
                placeholder="Search by user name or email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Refunded</SelectItem>
                <SelectItem value="partial">Partial Refund</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={reasonFilter} onValueChange={(v) => { setReasonFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reasons</SelectItem>
                {Object.entries(REFUND_REASONS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Refunds Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Event / Booking</TableHead>
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
              ) : refunds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No refund requests found
                  </TableCell>
                </TableRow>
              ) : (
                refunds.map((refund) => {
                  const statusConfig = STATUS_CONFIG[refund.status] || STATUS_CONFIG.pending

                  return (
                    <TableRow key={refund.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center">
                            {refund.user?.avatar_url ? (
                              <img src={refund.user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <Link href={`/admin/users/${refund.user_id}`} className="font-medium hover:underline">
                              {refund.user?.full_name || 'Unknown'}
                            </Link>
                            <p className="text-xs text-muted-foreground">{refund.user?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {refund.booking?.event ? (
                          <div className="text-sm">
                            <Link 
                              href={`/admin/events/${refund.booking.event_id}`}
                              className="font-medium hover:underline flex items-center gap-1"
                            >
                              {refund.booking.event.title}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                            <div className="flex items-center gap-2 text-muted-foreground text-xs">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(refund.booking.event.start_date), 'MMM d, yyyy')}
                              <Ticket className="h-3 w-3 ml-2" />
                              {refund.booking.quantity} ticket(s)
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                          {REFUND_REASONS[refund.reason] || refund.reason}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-lg">{formatCurrency(refund.amount)}</span>
                        {refund.booking?.total_amount && refund.amount < refund.booking.total_amount && (
                          <p className="text-xs text-muted-foreground">
                            of {formatCurrency(refund.booking.total_amount)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(refund.requested_at), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        {refund.status === 'pending' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openProcess(refund, 'approve')}>
                                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openProcess(refund, 'reject')}>
                                <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                Reject
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {refund.status === 'approved' && (
                          <Button
                            size="sm"
                            onClick={() => openProcess(refund, 'process')}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Process Refund
                          </Button>
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

      {/* Process Dialog */}
      <Dialog open={processOpen} onOpenChange={setProcessOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {processAction === 'approve' && 'Approve Refund Request'}
              {processAction === 'reject' && 'Reject Refund Request'}
              {processAction === 'process' && 'Process Refund'}
            </DialogTitle>
            <DialogDescription>
              {processAction === 'approve' && 'Approve this refund request for processing'}
              {processAction === 'reject' && 'Reject this refund request'}
              {processAction === 'process' && 'Process the refund - funds will be returned to customer'}
            </DialogDescription>
          </DialogHeader>

          {selectedRefund && (
            <div className="space-y-4 mt-4">
              {/* Refund Summary */}
              <div className="p-4 rounded-lg bg-neutral-50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{selectedRefund.user?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedRefund.user?.email}</p>
                  </div>
                  <p className="text-xl font-bold">{formatCurrency(selectedRefund.amount)}</p>
                </div>
                {selectedRefund.booking?.event && (
                  <div className="mt-3 pt-3 border-t text-sm">
                    <p><strong>Event:</strong> {selectedRefund.booking.event.title}</p>
                    <p><strong>Tickets:</strong> {selectedRefund.booking.quantity}</p>
                    <p><strong>Reason:</strong> {REFUND_REASONS[selectedRefund.reason] || selectedRefund.reason}</p>
                    <p><strong>Refund Method:</strong> {selectedRefund.refund_method === 'wallet' ? 'Wallet Credit' : 'Original Payment Method'}</p>
                  </div>
                )}
              </div>

              {/* Partial Refund Option (only when processing) */}
              {processAction === 'process' && (
                <div className="space-y-2">
                  <Label htmlFor="partial">Refund Amount</Label>
                  <Input
                    id="partial"
                    type="number"
                    value={partialAmount || selectedRefund.amount.toString()}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    max={selectedRefund.amount}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter a lower amount for partial refund. Max: {formatCurrency(selectedRefund.amount)}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Admin Notes {processAction === 'reject' ? '(required)' : '(optional)'}</Label>
                <Textarea
                  id="notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={processAction === 'reject' ? 'Reason for rejection (required)...' : 'Any notes for this refund...'}
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
                      {processAction === 'reject' && <XCircle className="h-4 w-4 mr-2" />}
                      {processAction === 'process' && <RotateCcw className="h-4 w-4 mr-2" />}
                      {processAction === 'approve' && 'Approve Request'}
                      {processAction === 'reject' && 'Reject Request'}
                      {processAction === 'process' && `Refund ${formatCurrency(parseFloat(partialAmount) || selectedRefund.amount)}`}
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
