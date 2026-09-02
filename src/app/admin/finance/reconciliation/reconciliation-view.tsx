'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, CheckCircle2, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/helpers'

type DailyRow = {
  day: string
  wallet_deposits_rands: number
  payout_requests_rands: number
  refunds_rands: number
  held_value_rands: number
  transaction_count: number
}

type ExceptionRow = {
  id: string
  reference?: string
  amount?: number
  failure_reason?: string | null
  created_at: string
  updated_at?: string
  amount_cents?: number
  status?: string
  reason_code?: string
}

export function AdminReconciliationView({
  daily,
  failedPayouts,
  failedRefunds,
  refundQueue,
}: {
  daily: DailyRow[]
  failedPayouts: ExceptionRow[]
  failedRefunds: ExceptionRow[]
  refundQueue: ExceptionRow[]
}) {

  const summary = useMemo(() => {
    const latest = daily[0]
    const totalHeld = daily.reduce((sum, row) => sum + Number(row.held_value_rands || 0), 0)
    return {
      latestDay: latest?.day || null,
      latestTxCount: Number(latest?.transaction_count || 0),
      latestDeposits: Number(latest?.wallet_deposits_rands || 0),
      latestPayoutRequests: Number(latest?.payout_requests_rands || 0),
      latestRefunds: Number(latest?.refunds_rands || 0),
      totalHeld,
      openExceptions: failedPayouts.length + failedRefunds.length + refundQueue.length,
    }
  }, [daily, failedPayouts, failedRefunds, refundQueue])

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
          <h2 className="text-2xl font-bold">Finance Reconciliation</h2>
          <p className="text-muted-foreground">Daily money movement checks and exception tracking</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Latest Day</p>
            <p className="text-xl font-semibold">{summary.latestDay || 'No data'}</p>
            <p className="text-sm text-muted-foreground">{summary.latestTxCount} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Latest Wallet Deposits</p>
            <p className="text-xl font-semibold">{formatCurrency(summary.latestDeposits)}</p>
            <p className="text-sm text-muted-foreground">Request volume snapshot</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Held Exposure (30d sum)</p>
            <p className="text-xl font-semibold">{formatCurrency(summary.totalHeld)}</p>
            <p className="text-sm text-muted-foreground">Held-value monitoring</p>
          </CardContent>
        </Card>
        <Card className={summary.openExceptions > 0 ? 'border-orange-300 bg-orange-50' : 'border-green-300 bg-green-50'}>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Open Exceptions</p>
            <p className="text-xl font-semibold">{summary.openExceptions}</p>
            <p className="text-sm text-muted-foreground">Failed payouts, refunds, queue backlog</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Daily Reconciliation (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead className="text-right">Wallet Deposits</TableHead>
                <TableHead className="text-right">Payout Requests</TableHead>
                <TableHead className="text-right">Refunds</TableHead>
                <TableHead className="text-right">Held Value</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {daily.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No reconciliation data yet</TableCell>
                </TableRow>
              ) : (
                daily.map((row) => (
                  <TableRow key={row.day}>
                    <TableCell>{row.day}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(row.wallet_deposits_rands || 0))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(row.payout_requests_rands || 0))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(row.refunds_rands || 0))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(row.held_value_rands || 0))}</TableCell>
                    <TableCell className="text-right">{Number(row.transaction_count || 0)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Failed Payouts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {failedPayouts.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" />No failed payouts</p>
            ) : (
              failedPayouts.slice(0, 5).map((row) => (
                <div key={row.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{row.reference || row.id}</p>
                  <p>{formatCurrency(Number(row.amount || 0) / 100)}</p>
                  <p className="text-muted-foreground">{row.failure_reason || 'Unknown reason'}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Failed Refund Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {failedRefunds.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" />No failed refunds</p>
            ) : (
              failedRefunds.slice(0, 5).map((row) => (
                <div key={row.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{row.reference || row.id}</p>
                  <p>{formatCurrency(Number(row.amount || 0) / 100)}</p>
                  <p className="text-muted-foreground">{row.failure_reason || 'Unknown reason'}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Open Refund Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {refundQueue.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" />No open queue backlog</p>
            ) : (
              refundQueue.slice(0, 5).map((row) => (
                <div key={row.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{row.id}</p>
                  <p>{formatCurrency(Number(row.amount_cents || 0) / 100)}</p>
                  <p className="text-muted-foreground">{row.reason_code || 'Unknown reason'} • {row.status || 'unknown'}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
