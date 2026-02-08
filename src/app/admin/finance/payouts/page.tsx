'use client'

/**
 * ADMIN PAYOUTS PAGE
 * /admin/finance/payouts
 * 
 * Review and process payout requests
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  User,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Building,
  CreditCard,
} from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface PayoutRequest {
  id: string
  user_id: string
  amount: number
  status: string
  bank_name: string
  account_number: string
  account_holder: string
  reference: string
  requested_at: string
  processed_at: string | null
  admin_notes: string | null
  user?: {
    full_name: string
    email: string
    avatar_url: string
  }
  wallet?: {
    balance: number
    pending_balance: number
  }
}

const ITEMS_PER_PAGE = 25

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700' },
  processing: { label: 'Processing', color: 'bg-purple-100 text-purple-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
}

export default function AdminPayoutsPage() {
  const supabase = createClient()
  
  const [payouts, setPayouts] = useState<PayoutRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Process dialog
  const [processOpen, setProcessOpen] = useState(false)
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null)
  const [processAction, setProcessAction] = useState<'approve' | 'reject' | 'complete'>('approve')
  const [adminNotes, setAdminNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  // Stats
  const [stats, setStats] = useState({
    pendingCount: 0,
    pendingAmount: 0,
    processedToday: 0,
    processedAmount: 0,
  })

  useEffect(() => {
    fetchPayouts()
    fetchStats()
  }, [page, statusFilter])

  const fetchStats = async () => {
    const today = new Date().toISOString().split('T')[0]
    
    const [pending, processed] = await Promise.all([
      supabase.from('payout_requests').select('amount').eq('status', 'pending'),
      supabase.from('payout_requests').select('amount').eq('status', 'completed').gte('processed_at', today),
    ])

    setStats({
      pendingCount: pending.data?.length || 0,
      pendingAmount: pending.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
      processedToday: processed.data?.length || 0,
      processedAmount: processed.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
    })
  }

  const fetchPayouts = async () => {
    setLoading(true)

    let query = supabase
      .from('payout_requests')
      .select(`
        *,
        user:profiles!payout_requests_user_id_fkey(full_name, email, avatar_url),
        wallet:wallets!payout_requests_user_id_fkey(balance, pending_balance)
      `, { count: 'exact' })
      .order('requested_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (!error && data) {
      setPayouts(data)
      setTotalCount(count || 0)
    }

    setLoading(false)
  }

  const openProcess = (payout: PayoutRequest, action: 'approve' | 'reject' | 'complete') => {
    setSelectedPayout(payout)
    setProcessAction(action)
    setAdminNotes('')
    setProcessOpen(true)
  }

  const handleProcess = async () => {
    if (!selectedPayout) return

    setProcessing(true)

    try {
      const { data: { user: admin } } = await supabase.auth.getUser()
      
      let newStatus = ''
      if (processAction === 'approve') newStatus = 'approved'
      else if (processAction === 'reject') newStatus = 'rejected'
      else if (processAction === 'complete') newStatus = 'completed'

      const updates: Record<string, any> = {
        status: newStatus,
        admin_notes: adminNotes || null,
        processed_by: admin?.id,
      }

      if (newStatus === 'completed' || newStatus === 'rejected') {
        updates.processed_at = new Date().toISOString()
      }

      // Update payout request
      const { error } = await supabase
        .from('payout_requests')
        .update(updates)
        .eq('id', selectedPayout.id)

      if (error) throw error

      // If completed, update wallet and create transaction
      if (newStatus === 'completed') {
        // Deduct from wallet
        await supabase.rpc('deduct_wallet_balance', {
          p_user_id: selectedPayout.user_id,
          p_amount: selectedPayout.amount,
        })

        // Create payout transaction
        await supabase.from('transactions').insert({
          reference: `PAYOUT-${selectedPayout.reference}`,
          type: 'payout',
          status: 'completed',
          amount: selectedPayout.amount,
          platform_fee: 0,
          net_amount: selectedPayout.amount,
          payer_id: selectedPayout.user_id,
          recipient_id: selectedPayout.user_id,
          gateway_provider: 'bank_transfer',
          gateway_response: {
            bank_name: selectedPayout.bank_name,
            account_number: selectedPayout.account_number,
            account_holder: selectedPayout.account_holder,
          },
        })
      }

      // If rejected, release pending balance back to available
      if (newStatus === 'rejected') {
        await supabase.rpc('release_pending_balance', {
          p_user_id: selectedPayout.user_id,
          p_amount: selectedPayout.amount,
        })
      }

      // Audit log
      await supabase.from('admin_audit_logs').insert({
        admin_id: admin?.id,
        action: processAction,
        entity_type: 'payout',
        entity_id: selectedPayout.id,
        details: {
          amount: selectedPayout.amount,
          status: newStatus,
          notes: adminNotes,
          user_email: selectedPayout.user?.email,
        },
      })

      toast.success(`Payout ${processAction}${processAction === 'complete' ? 'd' : 'ed'} successfully`)
      setProcessOpen(false)
      fetchPayouts()
      fetchStats()
    } catch (error) {
      console.error('Process error:', error)
      toast.error('Failed to process payout')
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
          <h2 className="text-2xl font-bold">Payouts</h2>
          <p className="text-muted-foreground">Review and process payout requests</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-700">Pending Review</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.pendingCount}</p>
            <p className="text-sm text-yellow-600">{formatCurrency(stats.pendingAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Processed Today</p>
            <p className="text-2xl font-bold text-green-600">{stats.processedToday}</p>
            <p className="text-sm text-muted-foreground">{formatCurrency(stats.processedAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Processing Time</p>
            <p className="text-2xl font-bold">1-3 days</p>
            <p className="text-sm text-muted-foreground">Average</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Min. Payout</p>
            <p className="text-2xl font-bold">R100</p>
            <p className="text-sm text-muted-foreground">Threshold</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payouts Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Bank Details</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Wallet Balance</TableHead>
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
              ) : payouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No payout requests found
                  </TableCell>
                </TableRow>
              ) : (
                payouts.map((payout) => {
                  const statusConfig = STATUS_CONFIG[payout.status] || STATUS_CONFIG.pending

                  return (
                    <TableRow key={payout.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center">
                            {payout.user?.avatar_url ? (
                              <img src={payout.user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <Link href={`/admin/users/${payout.user_id}`} className="font-medium hover:underline">
                              {payout.user?.full_name || 'Unknown'}
                            </Link>
                            <p className="text-xs text-muted-foreground">{payout.user?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            <span>{payout.bank_name}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <CreditCard className="h-3 w-3" />
                            <span>***{payout.account_number.slice(-4)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{payout.account_holder}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-lg">{formatCurrency(payout.amount)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-muted-foreground">
                          {payout.wallet ? formatCurrency(payout.wallet.balance) : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(payout.requested_at), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        {payout.status === 'pending' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openProcess(payout, 'approve')}>
                                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openProcess(payout, 'reject')}>
                                <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                Reject
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {payout.status === 'approved' && (
                          <Button
                            size="sm"
                            onClick={() => openProcess(payout, 'complete')}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark Complete
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {processAction === 'approve' && 'Approve Payout'}
              {processAction === 'reject' && 'Reject Payout'}
              {processAction === 'complete' && 'Complete Payout'}
            </DialogTitle>
            <DialogDescription>
              {processAction === 'approve' && 'Approve this payout request for processing'}
              {processAction === 'reject' && 'Reject this payout request'}
              {processAction === 'complete' && 'Mark this payout as completed (bank transfer done)'}
            </DialogDescription>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-4 mt-4">
              <div className="p-4 rounded-lg bg-neutral-50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{selectedPayout.user?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedPayout.user?.email}</p>
                  </div>
                  <p className="text-xl font-bold">{formatCurrency(selectedPayout.amount)}</p>
                </div>
                <div className="mt-3 pt-3 border-t text-sm">
                  <p><strong>Bank:</strong> {selectedPayout.bank_name}</p>
                  <p><strong>Account:</strong> {selectedPayout.account_number}</p>
                  <p><strong>Holder:</strong> {selectedPayout.account_holder}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Admin Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={processAction === 'reject' ? 'Reason for rejection...' : 'Any notes...'}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setProcessOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleProcess}
                  disabled={processing}
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
                      {processAction === 'complete' && <CheckCircle className="h-4 w-4 mr-2" />}
                      {processAction === 'approve' && 'Approve'}
                      {processAction === 'reject' && 'Reject'}
                      {processAction === 'complete' && 'Mark Complete'}
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
