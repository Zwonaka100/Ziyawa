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
import { formatMoneyExact } from '@/lib/helpers'

type DailyRow = {
  day: string
  ticket_sales_rands: number
  payout_requests_rands: number
  refunds_rands: number
  held_value_rands: number
  transaction_count: number
  abandoned_count: number
  failed_count: number
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
    // `daily` is ordered newest-first by the view, but a LIMIT without an
    // explicit ORDER BY is not contractually ordered, so sort here rather than
    // trusting daily[0] to be the latest.
    const sorted = [...daily].sort((a, b) => (a.day < b.day ? 1 : -1))
    const latest = sorted[0]
    return {
      latestDay: latest?.day || null,
      latestTxCount: Number(latest?.transaction_count || 0),
      latestAbandoned: Number(latest?.abandoned_count || 0),
      latestTicketSales: Number(latest?.ticket_sales_rands || 0),
      // Ticket sales over the whole window, which is a flow and can be summed.
      // The tile here used to sum held_value_rands across 30 rows — that is a
      // BALANCE, so adding it up over time produced roughly 30x the exposure
      // and meant nothing at all.
      windowTicketSales: daily.reduce((sum, row) => sum + Number(row.ticket_sales_rands || 0), 0),
      // The current held balance is the latest day's figure, not a sum.
      currentHeld: Number(latest?.held_value_rands || 0),
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
          <p className="text-muted-foreground">Daily money movement and open exceptions. &ldquo;Payouts Sent&rdquo; counts transfers that left Ziyawa, not requests still waiting for approval.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Latest Day</p>
            <p className="text-xl font-semibold">{summary.latestDay || 'No data'}</p>
            <p className="text-sm text-muted-foreground">
              {summary.latestTxCount} paid{summary.latestAbandoned > 0 ? `, ${summary.latestAbandoned} abandoned` : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Ticket Sales (30d)</p>
            <p className="text-xl font-semibold">{formatMoneyExact(summary.windowTicketSales)}</p>
            <p className="text-sm text-muted-foreground">{formatMoneyExact(summary.latestTicketSales)} on the latest day</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Held Exposure</p>
            <p className="text-xl font-semibold">{formatMoneyExact(summary.currentHeld)}</p>
            <p className="text-sm text-muted-foreground">Owed on the latest day, not a sum</p>
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
                <TableHead className="text-right">Ticket Sales</TableHead>
                <TableHead className="text-right">Payouts Sent</TableHead>
                <TableHead className="text-right">Refunds</TableHead>
                <TableHead className="text-right">Held Value</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Abandoned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {daily.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No reconciliation data yet</TableCell>
                </TableRow>
              ) : (
                daily.map((row) => (
                  <TableRow key={row.day}>
                    <TableCell>{row.day}</TableCell>
                    <TableCell className="text-right">{formatMoneyExact(Number(row.ticket_sales_rands || 0))}</TableCell>
                    <TableCell className="text-right">{formatMoneyExact(Number(row.payout_requests_rands || 0))}</TableCell>
                    <TableCell className="text-right">{formatMoneyExact(Number(row.refunds_rands || 0))}</TableCell>
                    <TableCell className="text-right">{formatMoneyExact(Number(row.held_value_rands || 0))}</TableCell>
                    <TableCell className="text-right">{Number(row.transaction_count || 0)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{Number(row.abandoned_count || 0)}</TableCell>
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
                  <p>{formatMoneyExact(Number(row.amount || 0) / 100)}</p>
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
                  <p>{formatMoneyExact(Number(row.amount || 0) / 100)}</p>
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
                  <p>{formatMoneyExact(Number(row.amount_cents || 0) / 100)}</p>
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
