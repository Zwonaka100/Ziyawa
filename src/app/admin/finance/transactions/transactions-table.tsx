'use client'

/**
 * ADMIN TRANSACTIONS PAGE
 * /admin/finance/transactions
 * 
 * View all platform transactions with filters
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { TransactionStats } from '@/lib/admin/transactions'
import Link from 'next/link'
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
  ArrowUpRight,
  ArrowDownRight,
  RefreshCcw,
  CreditCard,
  Download,
  type LucideIcon,
} from 'lucide-react'
import { formatMoneyExact } from '@/lib/helpers'
// Server-free module on purpose: importing this from the loader would pull
// next/headers into the client bundle.
import { TRANSACTIONS_PAGE_SIZE } from '@/lib/admin/pagination'
import { format } from 'date-fns'

interface Transaction {
  id: string
  reference: string
  type: string
  state: string
  amount: number
  platform_fee: number
  /** What the gateway charged, in cents. Null on rows predating fee capture. */
  gateway_fee_cents: number | null
  net_amount: number
  payer_id: string
  recipient_id: string | null
  /** Who is owed, and in what role. Fetched all along; never rendered. */
  recipient_type: 'organizer' | 'artist' | 'vendor' | null
  event_id: string | null
  created_at: string
  payer?: { full_name: string; email: string }
  recipient?: { full_name: string; email: string }
  event?: { title: string }
}

const ITEMS_PER_PAGE = TRANSACTIONS_PAGE_SIZE

/**
 * transactions.recipient_type says who is owed and in what role. Crew and
 * service providers are both stored as `vendor`.
 */
const RECIPIENT_ROLE: Record<string, string> = {
  organizer: 'Organiser',
  artist: 'Artist',
  vendor: 'Crew / Provider',
}

const TYPE_CONFIG: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  ticket_purchase: { label: 'Ticket Sale', icon: Ticket, color: 'bg-green-100 text-green-700' },
  payout: { label: 'Payout', icon: ArrowUpRight, color: 'bg-orange-100 text-orange-700' },
  refund: { label: 'Refund', icon: RefreshCcw, color: 'bg-red-100 text-red-700' },
  artist_booking: { label: 'Artist Booking', icon: CreditCard, color: 'bg-neutral-100 text-neutral-700' },
  vendor_service: { label: 'Vendor Service', icon: CreditCard, color: 'bg-pink-100 text-pink-700' },
  platform_fee: { label: 'Platform Fee', icon: ArrowDownRight, color: 'bg-neutral-100 text-neutral-700' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  initiated: { label: 'Initiated', color: 'bg-yellow-100 text-yellow-700' },
  authorized: { label: 'Authorized', color: 'bg-blue-100 text-blue-700' },
  held: { label: 'Held', color: 'bg-neutral-100 text-neutral-700' },
  released: { label: 'Released', color: 'bg-green-100 text-green-700' },
  settled: { label: 'Settled', color: 'bg-emerald-100 text-emerald-700' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
  refunded: { label: 'Refunded', color: 'bg-orange-100 text-orange-700' },
}

export function AdminTransactionsTable({
  initialTransactions,
  initialTotalCount,
  initialStats,
}: {
  initialTransactions: Transaction[]
  initialTotalCount: number
  initialStats: TransactionStats
}) {
  // Seeded from the server render — no empty first paint, no fetch on mount.
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [loading, setLoading] = useState(false)
  const hydratedFromServer = useRef(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  // Abandoned checkouts are hidden until asked for.
  const [includeIncomplete, setIncludeIncomplete] = useState(false)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(initialTotalCount)

  // Stats
  const [stats, setStats] = useState<TransactionStats>(initialStats)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        type: typeFilter,
        status: statusFilter,
        includeIncomplete: String(includeIncomplete),
        page: String(page),
      })
      if (searchQuery) params.set('q', searchQuery)

      const res = await fetch(`/api/admin/transactions?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load transactions')

      setTransactions(data.transactions || [])
      setTotalCount(data.totalCount || 0)
      setStats(data.stats)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [page, typeFilter, statusFilter, searchQuery, includeIncomplete])

  useEffect(() => {
    if (hydratedFromServer.current) {
      hydratedFromServer.current = false
      return
    }
    void fetchTransactions()
  }, [fetchTransactions])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchTransactions()
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const getStatusConfig = (tx: Transaction) => {
    if (tx.type === 'payout' && tx.state === 'released') {
      return { label: 'Processing', color: 'bg-blue-100 text-blue-700' }
    }

    if (tx.state === 'held') {
      return { label: 'In Escrow', color: 'bg-neutral-100 text-neutral-700' }
    }

    if (tx.state === 'released') {
      return { label: 'Available', color: 'bg-green-100 text-green-700' }
    }

    return STATUS_CONFIG[tx.state] || { label: tx.state, color: 'bg-neutral-100' }
  }

  const handleExport = () => {
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const header = [
      'reference', 'type', 'state', 'payer', 'owed_to', 'owed_to_role',
      'event', 'amount_zar', 'booking_fee_zar', 'paystack_fee_zar', 'ziyawa_net_zar', 'created_at',
    ]
    const rows = transactions.map((tx) => [
      tx.reference,
      tx.type,
      tx.state,
      tx.payer?.full_name || tx.payer?.email || '',
      tx.recipient?.full_name || tx.recipient?.email || '',
      tx.recipient_type ? RECIPIENT_ROLE[tx.recipient_type] ?? tx.recipient_type : '',
      tx.event?.title || '',
      ((tx.amount || 0) / 100).toFixed(2),
      ((tx.platform_fee || 0) / 100).toFixed(2),
      tx.gateway_fee_cents === null ? '' : (tx.gateway_fee_cents / 100).toFixed(2),
      tx.gateway_fee_cents === null ? '' : (((tx.platform_fee || 0) - tx.gateway_fee_cents) / 100).toFixed(2),
      tx.created_at,
    ].map(escape).join(','))

    const csv = [header.join(','), ...rows].join(String.fromCharCode(10))
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `ziyawa-transactions-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

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
        <Button variant="outline" onClick={handleExport} disabled={transactions.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Transactions</p>
            <p className="text-2xl font-bold">{stats.totalTransactions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Volume</p>
            <p className="text-2xl font-bold">{formatMoneyExact(stats.totalVolume / 100)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Booking fees charged</p>
            <p className="text-2xl font-bold">{formatMoneyExact(stats.platformFees / 100)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Paid to Paystack</p>
            <p className="text-2xl font-bold text-red-600">{formatMoneyExact(stats.gatewayFees / 100)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/40">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Ziyawa net after Paystack</p>
            <p className="text-2xl font-bold text-green-600">{formatMoneyExact(stats.netAfterGateway / 100)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Held in Escrow</p>
            <p className="text-2xl font-bold text-primary">{formatMoneyExact(stats.heldVolume / 100)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Issues</p>
            <p className="text-2xl font-bold text-red-600">{stats.issueCount}</p>
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
                <SelectItem value="ticket_purchase">Ticket Sales</SelectItem>
                <SelectItem value="payout">Payouts</SelectItem>
                <SelectItem value="refund">Refunds</SelectItem>
                <SelectItem value="artist_booking">Artist Bookings</SelectItem>
                <SelectItem value="vendor_service">Crew / Vendor Services</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm whitespace-nowrap cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={includeIncomplete}
                onChange={(e) => { setIncludeIncomplete(e.target.checked); setPage(1) }}
              />
              Show abandoned &amp; failed
            </label>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="initiated">Initiated</SelectItem>
                <SelectItem value="held">Held</SelectItem>
                <SelectItem value="released">Released</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
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
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Owed to</TableHead>
                <TableHead>Event</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Booking fee</TableHead>
                <TableHead className="text-right">Paystack</TableHead>
                <TableHead className="text-right">Ziyawa net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => {
                  const typeConfig = TYPE_CONFIG[tx.type] || { label: tx.type, icon: CreditCard, color: 'bg-neutral-100' }
                  const statusConfig = getStatusConfig(tx)
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
                          <div className="flex flex-col gap-0.5">
                            <Link href={`/admin/users/${tx.recipient_id}`} className="hover:underline text-sm">
                              {tx.recipient.full_name || tx.recipient.email}
                            </Link>
                            {tx.recipient_type && (
                              <span className="text-xs text-muted-foreground">
                                {RECIPIENT_ROLE[tx.recipient_type] ?? tx.recipient_type}
                              </span>
                            )}
                          </div>
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
                        {formatMoneyExact(tx.amount / 100)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatMoneyExact(tx.platform_fee / 100)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-red-600">
                        {tx.gateway_fee_cents == null
                          ? '—'
                          : formatMoneyExact(tx.gateway_fee_cents / 100)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {tx.gateway_fee_cents == null
                          ? '—'
                          : formatMoneyExact((tx.platform_fee - tx.gateway_fee_cents) / 100)}
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
          </div>
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
