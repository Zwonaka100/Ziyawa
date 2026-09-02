'use client'

import Image from 'next/image'

/**
 * ADMIN WALLETS PAGE
 * /admin/finance/wallets
 * 
 * View and manage user wallets
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  mapProfileToWallet,
  type WalletStats,
  type WalletProfileRow,
  type WalletWithUser,
} from '@/lib/admin/wallet-types'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  User,
  Loader2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'
import { format } from 'date-fns'
import { toast } from 'sonner'



const ITEMS_PER_PAGE = 25


export function AdminWalletsTable({
  initialWallets,
  initialTotalCount,
  initialStats,
}: {
  initialWallets: WalletWithUser[]
  initialTotalCount: number
  initialStats: WalletStats
}) {
  // Seeded from the server render — no empty first paint, no fetch on mount.
  const [wallets, setWallets] = useState<WalletWithUser[]>(initialWallets)
  const hydratedFromServer = useRef(true)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [balanceFilter, setBalanceFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(initialTotalCount)

  // Adjustment dialog
  const [adjustmentOpen, setAdjustmentOpen] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<WalletWithUser | null>(null)
  const [adjustmentType, setAdjustmentType] = useState<'credit' | 'debit'>('credit')
  const [adjustmentAmount, setAdjustmentAmount] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  // Stats
  const [stats, setStats] = useState<WalletStats>(initialStats)

  const fetchWallets = useCallback(async (searchTerm?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        balance: balanceFilter,
        page: String(page),
      })
      const term = searchTerm ?? ''
      if (term.trim()) params.set('q', term.trim())

      const res = await fetch(`/api/admin/wallets?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load wallets')

      setWallets(((data.profiles || []) as WalletProfileRow[]).map(mapProfileToWallet))
      setTotalCount(data.totalCount || 0)
      setStats(data.stats)
    } catch (error) {
      console.error('Failed to load wallets:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load wallets')
    } finally {
      setLoading(false)
    }
  }, [page, balanceFilter])

  useEffect(() => {
    if (hydratedFromServer.current) {
      hydratedFromServer.current = false
      return
    }
    void fetchWallets()
  }, [fetchWallets])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    await fetchWallets(searchQuery)
  }

  const openAdjustment = (wallet: WalletWithUser, type: 'credit' | 'debit') => {
    setSelectedWallet(wallet)
    setAdjustmentType(type)
    setAdjustmentAmount('')
    setAdjustmentReason('')
    setAdjustmentOpen(true)
  }

  const handleAdjustment = async () => {
    if (!selectedWallet || !adjustmentAmount || !adjustmentReason) {
      toast.error('Please fill in all fields')
      return
    }

    const amount = parseFloat(adjustmentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (adjustmentType === 'debit' && amount > selectedWallet.balance) {
      toast.error('Cannot debit more than current balance')
      return
    }

    setAdjusting(true)

    try {
      const supabase = createClient()
      const newBalance = adjustmentType === 'credit' 
        ? selectedWallet.balance + amount 
        : selectedWallet.balance - amount

      const { data: { user: admin } } = await supabase.auth.getUser()
      if (!admin) throw new Error('Admin session not found')

      // Update live wallet balance stored on the profile
      const { error: walletError } = await supabase
        .from('profiles')
        .update({ 
          wallet_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedWallet.user_id)

      if (walletError) throw walletError

      // Create adjustment transaction record
      await supabase.from('transactions').insert({
        reference: `ADJ-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: adjustmentType === 'credit' ? 'wallet_deposit' : 'payout',
        state: 'settled',
        amount: amount,
        platform_fee: 0,
        net_amount: amount,
        payer_id: admin.id,
        recipient_id: selectedWallet.user_id,
        recipient_type: selectedWallet.user?.is_organizer
          ? 'organizer'
          : selectedWallet.user?.is_artist
            ? 'artist'
            : selectedWallet.user?.is_provider
              ? 'vendor'
              : null,
        gateway_provider: 'manual',
        gateway_response: {
          reason: adjustmentReason,
          admin_id: admin.id,
          manual_adjustment: true,
          adjustment_type: adjustmentType,
        },
        settled_at: new Date().toISOString(),
      })

      // Log audit
      await supabase.from('admin_audit_logs').insert({
        admin_id: admin?.id,
        action: adjustmentType === 'credit' ? 'create' : 'update',
        entity_type: 'wallet',
        entity_id: selectedWallet.id,
        details: {
          type: adjustmentType,
          amount,
          reason: adjustmentReason,
          old_balance: selectedWallet.balance,
          new_balance: newBalance,
          user_email: selectedWallet.user?.email,
        },
      })

      toast.success(`Successfully ${adjustmentType}ed ${formatCurrency(amount)}`)
      setAdjustmentOpen(false)
      void fetchWallets()
    } catch (error) {
      console.error('Adjustment error:', error)
      toast.error('Failed to process adjustment')
    } finally {
      setAdjusting(false)
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
          <h2 className="text-2xl font-bold">Wallets</h2>
          <p className="text-muted-foreground">View and manage user wallet balances</p>
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        Every user has a wallet ledger starting at {formatCurrency(0)}. It only becomes active after a deposit, a sale, a release from escrow, or a manual admin adjustment.
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Wallets</p>
            <p className="text-2xl font-bold">{stats.totalWallets.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Available Balance</p>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalBalance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Held + Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.totalPending)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Wallets With Activity</p>
            <p className="text-2xl font-bold text-green-600">{stats.activeWallets}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <Input
                placeholder="Search by user name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              <Button type="submit" variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </form>
            <Select value={balanceFilter} onValueChange={(v) => { setBalanceFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Wallets</SelectItem>
                <SelectItem value="positive">Has Balance</SelectItem>
                <SelectItem value="pending">Has Pending</SelectItem>
                <SelectItem value="zero">Zero Balance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Wallets Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Held</TableHead>
                <TableHead className="text-right">Pending Payout</TableHead>
                <TableHead>Last Updated</TableHead>
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
              ) : wallets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No users match the current wallet filters yet
                  </TableCell>
                </TableRow>
              ) : (
                wallets.map((wallet) => (
                  <TableRow key={wallet.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden">
                          {wallet.user?.avatar_url ? (
                            <Image
                              src={wallet.user.avatar_url}
                              alt=""
                              width={32}
                              height={32}
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <Link href={`/admin/users/${wallet.user_id}`} className="font-medium hover:underline">
                            {wallet.user?.full_name || 'Unknown'}
                          </Link>
                          <p className="text-xs text-muted-foreground">{wallet.user?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {wallet.user?.is_organizer && (
                          <Badge variant="outline" className="text-xs">Organizer</Badge>
                        )}
                        {wallet.user?.is_artist && (
                          <Badge variant="outline" className="text-xs">Artist</Badge>
                        )}
                        {wallet.user?.is_provider && (
                          <Badge variant="outline" className="text-xs">Provider</Badge>
                        )}
                        {!wallet.user?.is_organizer && !wallet.user?.is_artist && !wallet.user?.is_provider && (
                          <Badge variant="outline" className="text-xs">User</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(wallet.balance)}
                    </TableCell>
                    <TableCell className="text-right text-amber-600">
                      {wallet.held_balance > 0 ? formatCurrency(wallet.held_balance) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-yellow-600">
                      {wallet.pending_balance > 0 ? formatCurrency(wallet.pending_balance) : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(wallet.updated_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAdjustment(wallet, 'credit')}
                          title="Credit"
                        >
                          <Plus className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAdjustment(wallet, 'debit')}
                          title="Debit"
                        >
                          <Minus className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
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

      {/* Adjustment Dialog */}
      <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustmentType === 'credit' ? 'Credit' : 'Debit'} Wallet
            </DialogTitle>
            <DialogDescription>
              {adjustmentType === 'credit' 
                ? 'Add funds to this user\'s wallet'
                : 'Remove funds from this user\'s wallet'}
            </DialogDescription>
          </DialogHeader>

          {selectedWallet && (
            <div className="space-y-4 mt-4">
              <div className="p-4 rounded-lg bg-neutral-50">
                <p className="font-medium">{selectedWallet.user?.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedWallet.user?.email}</p>
                <p className="text-sm mt-2">
                  Current Balance: <strong>{formatCurrency(selectedWallet.balance)}</strong>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (ZAR)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason *</Label>
                <Textarea
                  id="reason"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Explain why this adjustment is being made..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setAdjustmentOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAdjustment}
                  disabled={adjusting}
                  variant={adjustmentType === 'debit' ? 'destructive' : 'default'}
                >
                  {adjusting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {adjustmentType === 'credit' ? (
                        <Plus className="h-4 w-4 mr-2" />
                      ) : (
                        <Minus className="h-4 w-4 mr-2" />
                      )}
                      {adjustmentType === 'credit' ? 'Credit' : 'Debit'} {adjustmentAmount ? formatCurrency(parseFloat(adjustmentAmount)) : 'R0.00'}
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
