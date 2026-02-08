'use client'

/**
 * ADMIN TRANSACTIONS PAGE
 * /admin/finance/transactions
 * 
 * View all platform transactions with filters
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  Ticket,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCcw,
  CreditCard,
  ExternalLink,
  Download,
} from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'
import { format } from 'date-fns'

interface Transaction {
  id: string
  reference: string
  type: string
  status: string
  amount: number
  platform_fee: number
  net_amount: number
  payer_id: string
  recipient_id: string | null
  event_id: string | null
  created_at: string
  payer?: { full_name: string; email: string }
  recipient?: { full_name: string; email: string }
  event?: { title: string }
}

const ITEMS_PER_PAGE = 25

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  ticket_sale: { label: 'Ticket Sale', icon: Ticket, color: 'bg-green-100 text-green-700' },
  wallet_deposit: { label: 'Wallet Deposit', icon: Wallet, color: 'bg-blue-100 text-blue-700' },
  payout: { label: 'Payout', icon: ArrowUpRight, color: 'bg-orange-100 text-orange-700' },
  refund: { label: 'Refund', icon: RefreshCcw, color: 'bg-red-100 text-red-700' },
  booking_payment: { label: 'Booking Payment', icon: CreditCard, color: 'bg-purple-100 text-purple-700' },
  vendor_service: { label: 'Vendor Service', icon: CreditCard, color: 'bg-pink-100 text-pink-700' },
  platform_fee: { label: 'Platform Fee', icon: ArrowDownRight, color: 'bg-neutral-100 text-neutral-700' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  authorized: { label: 'Authorized', color: 'bg-blue-100 text-blue-700' },
  held: { label: 'Held', color: 'bg-purple-100 text-purple-700' },
  released: { label: 'Released', color: 'bg-green-100 text-green-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
  refunded: { label: 'Refunded', color: 'bg-orange-100 text-orange-700' },
}

export default function AdminTransactionsPage() {
  const supabase = createClient()
  
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Stats
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalVolume: 0,
    platformFees: 0,
    pendingCount: 0,
  })

  useEffect(() => {
    fetchTransactions()
    fetchStats()
  }, [page, typeFilter, statusFilter])

  const fetchStats = async () => {
    const { data, count } = await supabase
      .from('transactions')
      .select('amount, platform_fee, status', { count: 'exact' })

    if (data) {
      const completed = data.filter(t => t.status === 'completed')
      setStats({
        totalTransactions: count || 0,
        totalVolume: completed.reduce((sum, t) => sum + (t.amount || 0), 0),
        platformFees: completed.reduce((sum, t) => sum + (t.platform_fee || 0), 0),
        pendingCount: data.filter(t => t.status === 'pending' || t.status === 'held').length,
      })
    }
  }

  const fetchTransactions = async () => {
    setLoading(true)

    let query = supabase
      .from('transactions')
      .select(`
        *,
        payer:profiles!transactions_payer_id_fkey(full_name, email),
        recipient:profiles!transactions_recipient_id_fkey(full_name, email),
        event:events(title)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (typeFilter !== 'all') {
      query = query.eq('type', typeFilter)
    }

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (searchQuery) {
      query = query.or(`reference.ilike.%${searchQuery}%`)
    }

    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (!error && data) {
      setTransactions(data)
      setTotalCount(count || 0)
    }

    setLoading(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchTransactions()
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/finance">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold">Transactions</h2>
            <p className="text-muted-foreground">View all platform transactions</p>
          </div>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Transactions</p>
            <p className="text-2xl font-bold">{stats.totalTransactions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Volume</p>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalVolume)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Platform Fees</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.platformFees)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pendingCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <Input
                placeholder="Search by reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              <Button type="submit" variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </form>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="ticket_sale">Ticket Sales</SelectItem>
                <SelectItem value="wallet_deposit">Wallet Deposits</SelectItem>
                <SelectItem value="payout">Payouts</SelectItem>
                <SelectItem value="refund">Refunds</SelectItem>
                <SelectItem value="booking_payment">Booking Payments</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="held">Held</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Event</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => {
                  const typeConfig = TYPE_CONFIG[tx.type] || { label: tx.type, icon: CreditCard, color: 'bg-neutral-100' }
                  const statusConfig = STATUS_CONFIG[tx.status] || { label: tx.status, color: 'bg-neutral-100' }
                  const TypeIcon = typeConfig.icon

                  return (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <code className="text-xs bg-neutral-100 px-2 py-1 rounded">
                          {tx.reference.slice(0, 12)}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{typeConfig.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {tx.payer ? (
                          <Link href={`/admin/users/${tx.payer_id}`} className="hover:underline text-sm">
                            {tx.payer.full_name || tx.payer.email}
                          </Link>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {tx.recipient ? (
                          <Link href={`/admin/users/${tx.recipient_id}`} className="hover:underline text-sm">
                            {tx.recipient.full_name || tx.recipient.email}
                          </Link>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {tx.event ? (
                          <span className="text-sm truncate max-w-[150px] block">
                            {tx.event.title}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatCurrency(tx.platform_fee)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(tx.created_at), 'MMM d, HH:mm')}
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
    </div>
  )
}
