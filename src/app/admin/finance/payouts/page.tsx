'use client'

/**
 * ADMIN PAYOUTS PAGE
 * /admin/finance/payouts
 *
 * The approval queue — the only route by which money leaves the platform.
 * Approving fires a real, irreversible Paystack transfer, so the UI leads with
 * what could go wrong: the funding balance, and why a given payout is blocked.
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Wallet,
} from 'lucide-react'
import { formatMoneyExact } from '@/lib/helpers'
import { toast } from 'sonner'

interface PayoutRow {
  id: string
  user_id: string
  amount: number
  bank_name: string | null
  account_number: string | null
  account_holder: string | null
  status: string
  reference: string | null
  admin_notes: string | null
  requested_at: string
  processed_at: string | null
  recipient: {
    full_name: string | null
    email: string
    is_verified: boolean
    wallet_balance: number
    pending_payout_balance: number
  } | null
  payout_account: {
    bank_name: string | null
    account_number: string | null
    account_holder: string | null
    legal_name: string | null
    paystack_recipient_code: string | null
    recipient_error: string | null
  } | null
  blockers: string[]
  payable: boolean
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'border-orange-400 text-orange-600',
    processing: 'border-blue-400 text-blue-600',
    completed: 'bg-green-500 text-white border-transparent',
    rejected: 'bg-red-500 text-white border-transparent',
    failed: 'bg-red-500 text-white border-transparent',
  }
  return <Badge variant="outline" className={map[status] || ''}>{status}</Badge>
}

export default function AdminPayoutsPage() {
  const [rows, setRows] = useState<PayoutRow[]>([])
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [processing, setProcessing] = useState<string | null>(null)
  const [confirmRow, setConfirmRow] = useState<PayoutRow | null>(null)
  const [rejectRow, setRejectRow] = useState<PayoutRow | null>(null)
  const [notes, setNotes] = useState('')

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/payouts?status=${statusFilter}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load payouts')
      setRows(data.requests || [])
      setBalance(data.paystackBalanceRands)
    } catch (error) {
      console.error('Failed to load payouts:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load payouts')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { void fetchRows() }, [fetchRows])

  const act = async (row: PayoutRow, action: 'approve' | 'reject') => {
    setProcessing(row.id)
    try {
      const res = await fetch(`/api/admin/payouts/${row.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, admin_notes: notes.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(data.message || 'Done')
      setConfirmRow(null)
      setRejectRow(null)
      setNotes('')
      await fetchRows()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed')
    } finally {
      setProcessing(null)
    }
  }

  const pendingTotal = rows
    .filter((r) => r.status === 'pending')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0)

  const balanceShort = balance !== null && pendingTotal > balance

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/finance" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center mb-1">
            <ArrowLeft className="h-4 w-4 mr-1" /> Finance
          </Link>
          <h1 className="text-2xl font-bold">Payouts</h1>
          <p className="text-muted-foreground">Approve money leaving the platform</p>
        </div>
        <Button variant="outline" onClick={() => void fetchRows()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Transfers are funded from the Paystack balance, so surface it up front. */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Paystack balance</p>
              <p className="font-semibold">
                {balance === null ? 'Unavailable' : formatMoneyExact(balance)}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pending payouts</p>
            <p className="font-semibold">{formatMoneyExact(pendingTotal)}</p>
          </div>
          {balanceShort && (
            <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="text-xs">
                Pending payouts exceed your Paystack balance. Transfers are funded from that balance,
                so approvals will fail until it is topped up or settles.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="processing">Processing</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
          <SelectItem value="all">All</SelectItem>
        </SelectContent>
      </Select>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          No {statusFilter === 'all' ? '' : statusFilter} payouts.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{row.recipient?.full_name || 'Unknown recipient'}</p>
                      <StatusBadge status={row.status} />
                      {row.recipient?.is_verified === false && (
                        <Badge variant="outline" className="border-red-400 text-red-600">Unverified</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{row.recipient?.email}</p>
                    <p className="text-sm">
                      {row.payout_account?.bank_name || row.bank_name || '—'} ····
                      {String(row.payout_account?.account_number || row.account_number || '').slice(-4)}
                      {' · '}
                      {row.payout_account?.account_holder || row.account_holder || '—'}
                    </p>
                    {row.reference && (
                      <p className="text-xs font-mono text-muted-foreground">{row.reference}</p>
                    )}
                    {row.admin_notes && (
                      <p className="text-xs text-muted-foreground">Note: {row.admin_notes}</p>
                    )}
                  </div>

                  <div className="text-right space-y-2">
                    <p className="text-2xl font-bold">{formatMoneyExact(Number(row.amount || 0))}</p>
                    {row.recipient && (
                      <p className="text-xs text-muted-foreground">
                        Available {formatMoneyExact(row.recipient.wallet_balance)}
                      </p>
                    )}
                    {row.status === 'pending' && (
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setNotes(''); setRejectRow(row) }}
                          disabled={processing === row.id}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={!row.payable || processing === row.id}
                          onClick={() => { setNotes(''); setConfirmRow(row) }}
                        >
                          {processing === row.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Approve &amp; send
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Why this can't be paid — shown rather than hidden, so a stuck
                    payout is visible and actionable. */}
                {row.blockers.length > 0 && row.status === 'pending' && (
                  <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-xs font-medium text-amber-900 mb-1">Cannot pay out yet:</p>
                    <ul className="text-xs text-amber-800 list-disc list-inside space-y-0.5">
                      {row.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve confirmation — deliberately explicit, since this is irreversible. */}
      <Dialog open={!!confirmRow} onOpenChange={(o) => { if (!o) setConfirmRow(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send this payout?</DialogTitle>
            <DialogDescription>
              This immediately transfers money to the recipient&apos;s bank account. Paystack transfers
              cannot be reversed once sent.
            </DialogDescription>
          </DialogHeader>
          {confirmRow && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Recipient</span><span className="font-medium">{confirmRow.recipient?.full_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Account holder</span><span className="font-medium">{confirmRow.payout_account?.account_holder || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span className="font-medium">{confirmRow.payout_account?.bank_name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Account</span><span className="font-mono">{confirmRow.payout_account?.account_number || '—'}</span></div>
              <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Amount</span><span className="font-bold text-lg">{formatMoneyExact(Number(confirmRow.amount || 0))}</span></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRow(null)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={processing === confirmRow?.id}
              onClick={() => confirmRow && act(confirmRow, 'approve')}
            >
              {processing === confirmRow?.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Confirm and send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject */}
      <Dialog open={!!rejectRow} onOpenChange={(o) => { if (!o) { setRejectRow(null); setNotes('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject payout</DialogTitle>
            <DialogDescription>
              The funds stay in the recipient&apos;s available balance and can be queued again later.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why is this being rejected? Recorded against the payout."
            rows={3}
            maxLength={500}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectRow(null); setNotes('') }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!notes.trim() || processing === rejectRow?.id}
              onClick={() => rejectRow && act(rejectRow, 'reject')}
            >
              {processing === rejectRow?.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
