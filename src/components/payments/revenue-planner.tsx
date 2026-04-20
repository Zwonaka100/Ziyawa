'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog'
import { calculateTicketSaleBreakdown } from '@/lib/constants'
import { formatCurrency } from '@/lib/helpers'
import { Calculator, FileDown, Plus, TrendingUp, Trash2, Users, Wallet } from 'lucide-react'

interface RevenuePlannerProps {
  title?: string
  description?: string
  initialTicketPrice?: number
  initialCapacity?: number
  embedded?: boolean
}

interface RevenuePlannerLauncherProps extends RevenuePlannerProps {
  triggerLabel?: string
  compactTitle?: string
  compactDescription?: string
  showCard?: boolean
}

interface PlannerTier {
  id: string
  name: string
  price: number
  quantity: number
}

interface PlannerExpense {
  id: string
  label: string
  amount: number
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export function RevenuePlannerLauncher({
  triggerLabel = 'Open Planner',
  compactTitle = 'Revenue planner',
  compactDescription = 'Open the calculator when you want to test pricing, turnout, and payout outcomes.',
  showCard = true,
  ...plannerProps
}: RevenuePlannerLauncherProps) {
  const trigger = (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Calculator className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[96vw] sm:w-[94vw] lg:w-[92vw] sm:max-w-[94vw] lg:max-w-[92vw] xl:max-w-[1400px] min-h-[80vh] max-h-[92vh] overflow-y-auto rounded-2xl p-4 sm:p-6 lg:p-8">
        <RevenuePlanner {...plannerProps} embedded />
      </DialogContent>
    </Dialog>
  )

  if (!showCard) {
    return trigger
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">{compactTitle}</p>
          <p className="text-sm text-muted-foreground">{compactDescription}</p>
        </div>
        {trigger}
      </CardContent>
    </Card>
  )
}

export function RevenuePlanner({
  title = 'Event Profit Planner',
  description = 'Plan your ticket mix, full event costs, and real break-even point before you launch.',
  initialTicketPrice = 150,
  initialCapacity = 100,
  embedded = false,
}: RevenuePlannerProps) {
  const safeBasePrice = Math.max(0, initialTicketPrice || 150)
  const safeCapacity = Math.max(1, initialCapacity || 100)

  const [ticketTiers, setTicketTiers] = useState<PlannerTier[]>([
    { id: createId('tier'), name: 'General', price: safeBasePrice, quantity: Math.max(1, Math.round(safeCapacity * 0.7)) },
  ])

  const [expenses, setExpenses] = useState<PlannerExpense[]>([
    { id: createId('expense'), label: 'Talent / performers', amount: 2500 },
    { id: createId('expense'), label: 'Venue', amount: 1500 },
    { id: createId('expense'), label: 'Marketing', amount: 1000 },
    { id: createId('expense'), label: 'Security / staffing', amount: 0 },
  ])

  const tierResults = useMemo(() => {
    return ticketTiers.map((tier) => {
      const price = Math.max(0, tier.price || 0)
      const quantity = Math.max(0, tier.quantity || 0)
      const breakdown = calculateTicketSaleBreakdown(Math.round(price * 100))

      const organizerPlatformFeePerTicket = (breakdown.ticketingCommission + breakdown.platformFee) / 100

      return {
        ...tier,
        quantity,
        grossSales: price * quantity,
        organizerNetPerTicket: breakdown.organizerNet / 100,
        buyerFeePerTicket: breakdown.bookingFee / 100,
        platformFeesPerTicket: organizerPlatformFeePerTicket,
        buyerCheckoutPerTicket: breakdown.buyerTotal / 100,
        netRevenue: (breakdown.organizerNet / 100) * quantity,
        platformFeesTotal: organizerPlatformFeePerTicket * quantity,
        buyerFeesTotal: (breakdown.bookingFee / 100) * quantity,
        buyerCheckoutTotal: (breakdown.buyerTotal / 100) * quantity,
      }
    })
  }, [ticketTiers])

  const totals = useMemo(() => {
    const ticketsSold = tierResults.reduce((sum, tier) => sum + tier.quantity, 0)
    const grossSales = tierResults.reduce((sum, tier) => sum + tier.grossSales, 0)
    const netRevenue = tierResults.reduce((sum, tier) => sum + tier.netRevenue, 0)
    const platformFees = tierResults.reduce((sum, tier) => sum + tier.platformFeesTotal, 0)
    const buyerFees = tierResults.reduce((sum, tier) => sum + tier.buyerFeesTotal, 0)
    const buyerCheckoutTotal = tierResults.reduce((sum, tier) => sum + tier.buyerCheckoutTotal, 0)
    const totalCosts = expenses.reduce((sum, expense) => sum + Math.max(0, expense.amount || 0), 0)
    const avgNetPerTicket = ticketsSold > 0 ? netRevenue / ticketsSold : 0
    const avgTicketPrice = ticketsSold > 0 ? grossSales / ticketsSold : 0
    const marginRate = grossSales > 0 ? netRevenue / grossSales : 0
    const breakEvenTickets = avgNetPerTicket > 0 ? Math.ceil(totalCosts / avgNetPerTicket) : null
    const breakEvenRevenue = marginRate > 0 ? totalCosts / marginRate : null
    const breakEvenCapacityPercent = breakEvenTickets !== null && safeCapacity > 0
      ? Math.ceil((breakEvenTickets / safeCapacity) * 100)
      : null
    const projectedProfit = netRevenue - totalCosts
    const sellThroughRate = safeCapacity > 0 ? Math.round((ticketsSold / safeCapacity) * 100) : 0

    return {
      ticketsSold,
      grossSales,
      netRevenue,
      platformFees,
      buyerFees,
      buyerCheckoutTotal,
      totalCosts,
      avgNetPerTicket,
      avgTicketPrice,
      marginRate,
      breakEvenTickets,
      breakEvenRevenue,
      breakEvenCapacityPercent,
      projectedProfit,
      sellThroughRate,
    }
  }, [expenses, safeCapacity, tierResults])

  const updateTier = (id: string, field: 'name' | 'price' | 'quantity', value: string) => {
    setTicketTiers((current) => current.map((tier) => (
      tier.id === id
        ? {
            ...tier,
            [field]: field === 'name' ? value : Math.max(0, Number(value) || 0),
          }
        : tier
    )))
  }

  const addTier = () => {
    setTicketTiers((current) => [
      ...current,
      { id: createId('tier'), name: `Tier ${current.length + 1}`, price: safeBasePrice, quantity: 0 },
    ])
  }

  const removeTier = (id: string) => {
    setTicketTiers((current) => current.filter((tier) => tier.id !== id))
  }

  const updateExpense = (id: string, field: 'label' | 'amount', value: string) => {
    setExpenses((current) => current.map((expense) => (
      expense.id === id
        ? {
            ...expense,
            [field]: field === 'label' ? value : Math.max(0, Number(value) || 0),
          }
        : expense
    )))
  }

  const addExpense = () => {
    setExpenses((current) => [
      ...current,
      { id: createId('expense'), label: `Other expense ${current.length - 2 > 0 ? current.length - 1 : ''}`.trim(), amount: 0 },
    ])
  }

  const removeExpense = (id: string) => {
    setExpenses((current) => current.filter((expense) => expense.id !== id))
  }

  const handleExportPdf = () => {
    try {
      const printWindow = window.open('', '_blank', 'width=960,height=1200')

      if (!printWindow) {
        toast.error('Please allow pop-ups to export the PDF.')
        return
      }

      const safeTitle = escapeHtml(title)
      const safeDescription = escapeHtml(description)
      const exportedAt = new Date().toLocaleString()
      const profitColor = totals.projectedProfit >= 0 ? '#15803d' : '#b91c1c'
      const avgPlatformFeePerTicket = Math.max(0, totals.avgTicketPrice - totals.avgNetPerTicket)
      const avgBookingFeePerTicket = totals.ticketsSold > 0 ? totals.buyerFees / totals.ticketsSold : 0
      const tierRows = tierResults.map((tier) => `
        <tr>
          <td>${escapeHtml(tier.name)}</td>
          <td>${formatCurrency(tier.price)}</td>
          <td>${tier.quantity}</td>
          <td>${formatCurrency(tier.platformFeesPerTicket)}</td>
          <td>${formatCurrency(tier.buyerFeePerTicket)}</td>
          <td>${formatCurrency(tier.netRevenue)}</td>
        </tr>
      `).join('')
      const expenseRows = expenses.map((expense) => `
        <tr>
          <td>${escapeHtml(expense.label)}</td>
          <td>${formatCurrency(expense.amount)}</td>
        </tr>
      `).join('')

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${safeTitle} - Ziyawa</title>
            <style>
              * { box-sizing: border-box; }
              body {
                margin: 0;
                padding: 28px;
                font-family: Arial, Helvetica, sans-serif;
                color: #0f172a;
                background: #f8fafc;
              }
              .sheet {
                max-width: 980px;
                margin: 0 auto;
              }
              .hero {
                border: 1px solid #dbeafe;
                background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
                border-radius: 20px;
                padding: 24px;
                margin-bottom: 20px;
              }
              .brand {
                display: inline-block;
                padding: 6px 10px;
                border-radius: 999px;
                background: #dbeafe;
                color: #1d4ed8;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.04em;
                margin-bottom: 12px;
              }
              h1 { margin: 0 0 8px; font-size: 28px; }
              .sub { color: #475569; font-size: 14px; line-height: 1.5; }
              .meta { color: #64748b; font-size: 12px; margin-top: 10px; }
              .grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 12px;
                margin-bottom: 16px;
              }
              .metric, .section {
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                background: #ffffff;
              }
              .metric { padding: 16px; }
              .metric .label { color: #64748b; font-size: 12px; margin-bottom: 6px; }
              .metric .value { font-size: 22px; font-weight: 700; }
              .section { padding: 18px; margin-bottom: 16px; }
              .section h2 { margin: 0 0 12px; font-size: 16px; }
              .section-note {
                color: #475569;
                font-size: 13px;
                line-height: 1.6;
                margin-bottom: 12px;
              }
              .statement-row, .mini-row {
                display: flex;
                justify-content: space-between;
                gap: 12px;
                padding: 8px 0;
                border-bottom: 1px solid #f1f5f9;
                font-size: 14px;
              }
              .statement-row.total {
                font-weight: 700;
                border-top: 1px solid #cbd5e1;
                border-bottom: none;
                margin-top: 4px;
                padding-top: 10px;
              }
              .muted { color: #64748b; }
              .profit { color: ${profitColor}; }
              table {
                width: 100%;
                border-collapse: collapse;
              }
              th, td {
                text-align: left;
                padding: 10px 8px;
                border-bottom: 1px solid #f1f5f9;
                font-size: 13px;
                vertical-align: top;
              }
              th {
                color: #475569;
                font-weight: 700;
                background: #f8fafc;
              }
              th:last-child, td:last-child {
                text-align: right;
              }
              .footnote {
                margin-top: 10px;
                color: #64748b;
                font-size: 12px;
              }
              @media print {
                body { padding: 0; background: #fff; }
              }
            </style>
          </head>
          <body>
            <div class="sheet">
              <div class="hero">
                <div class="brand">ZIYAWA REVENUE PLANNER</div>
                <h1>${safeTitle}</h1>
                <div class="sub">${safeDescription}</div>
                <div class="meta">Exported ${escapeHtml(exportedAt)}</div>
              </div>

              <div class="grid">
                <div class="metric"><div class="label">Ticket revenue</div><div class="value">${formatCurrency(totals.grossSales)}</div></div>
                <div class="metric"><div class="label">Net event income</div><div class="value">${formatCurrency(totals.netRevenue)}</div></div>
                <div class="metric"><div class="label">Total event costs</div><div class="value">${formatCurrency(totals.totalCosts)}</div></div>
                <div class="metric"><div class="label">Projected profit / loss</div><div class="value profit">${formatCurrency(totals.projectedProfit)}</div></div>
              </div>

              <div class="section">
                <h2>Break-even summary</h2>
                <div class="section-note">This break-even point includes all listed event costs and organizer-side platform fees.</div>
                <div class="mini-row"><span class="muted">Break-even tickets</span><strong>${totals.breakEvenTickets ?? 'Set ticket mix'}</strong></div>
                <div class="mini-row"><span class="muted">Break-even capacity needed</span><strong>${totals.breakEvenCapacityPercent !== null ? `${totals.breakEvenCapacityPercent}%` : 'Set ticket mix'}</strong></div>
                <div class="mini-row"><span class="muted">Break-even revenue</span><strong>${totals.breakEvenRevenue ? formatCurrency(totals.breakEvenRevenue) : 'Set ticket mix'}</strong></div>
                <div class="mini-row"><span class="muted">Planned tickets sold</span><strong>${totals.ticketsSold}</strong></div>
              </div>

              <div class="section">
                <h2>Per-ticket view</h2>
                <div class="mini-row"><span class="muted">Average ticket price</span><strong>${formatCurrency(totals.avgTicketPrice)}</strong></div>
                <div class="mini-row"><span class="muted">Platform fee per ticket</span><strong>${formatCurrency(avgPlatformFeePerTicket)}</strong></div>
                <div class="mini-row"><span class="muted">Booking fee per ticket</span><strong>${formatCurrency(avgBookingFeePerTicket)}</strong></div>
                <div class="mini-row"><span class="muted">You keep per ticket</span><strong>${formatCurrency(totals.avgNetPerTicket)}</strong></div>
                <div class="footnote">Booking fees are paid by the buyer at checkout and do not form part of organizer ticket revenue.</div>
              </div>

              <div class="section">
                <h2>Projected income statement</h2>
                <div class="statement-row"><span class="muted">Ticket revenue</span><strong>${formatCurrency(totals.grossSales)}</strong></div>
                <div class="statement-row"><span class="muted">Less platform fees</span><strong>(${formatCurrency(totals.platformFees)})</strong></div>
                <div class="statement-row"><span class="muted">Buyer booking fees to Ziyawa</span><strong>${formatCurrency(totals.buyerFees)}</strong></div>
                <div class="statement-row"><span class="muted">Net event income</span><strong>${formatCurrency(totals.netRevenue)}</strong></div>
                <div class="statement-row"><span class="muted">Less event expenses</span><strong>(${formatCurrency(totals.totalCosts)})</strong></div>
                <div class="statement-row total"><span>Projected profit / loss</span><span class="profit">${formatCurrency(totals.projectedProfit)}</span></div>
              </div>

              <div class="section">
                <h2>Ticket tier breakdown</h2>
                <table>
                  <tr><th>Tier</th><th>Price</th><th>Sold</th><th>Platform fee</th><th>Booking fee</th><th>You keep</th></tr>
                  ${tierRows}
                </table>
                <div class="footnote">Booking fee is paid by the buyer. “You keep” reflects organizer net after platform fees.</div>
              </div>

              <div class="section">
                <h2>Expense breakdown</h2>
                <table>
                  <tr><th>Expense</th><th>Amount</th></tr>
                  ${expenseRows}
                </table>
              </div>

              <div class="section">
                <h2>Ziyawa note</h2>
                <div class="section-note">Ticket funds are protected first, then move to available balance after event completion and the safety hold window.</div>
              </div>
            </div>
            <script>
              window.onload = function () { setTimeout(function () { window.print(); }, 300); };
              window.onafterprint = function () { window.close(); };
            </script>
          </body>
        </html>
      `)

      printWindow.document.close()
      printWindow.focus()
      toast.success('Print dialog opened. Choose Save as PDF to download the report.')
    } catch {
      toast.error('Unable to export the PDF right now.')
    }
  }

  return (
    <Card className={embedded ? 'h-full border-0 bg-transparent shadow-none' : 'border-primary/20 shadow-sm'}>
      <CardHeader className={embedded ? 'px-0 pt-0 pb-5' : ''}>
        <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-background p-5 sm:p-6">
          <div className="mb-4">
            <Badge variant="secondary" className="mb-3 bg-primary/10 text-primary hover:bg-primary/10">
              Ziyawa finance tool
            </Badge>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl sm:text-2xl">{title}</CardTitle>
            </div>
            <CardDescription className="mt-2 max-w-3xl text-sm sm:text-base">
              {description}
            </CardDescription>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border bg-background/80 p-4">
              <p className="text-xs text-muted-foreground">Ticket revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(totals.grossSales)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Excludes buyer booking fees paid to Ziyawa.</p>
            </div>
            <div className="rounded-xl border bg-background/80 p-4">
              <p className="text-xs text-muted-foreground">Net revenue after platform fees</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totals.netRevenue)}</p>
            </div>
            <div className="rounded-xl border bg-background/80 p-4">
              <p className="text-xs text-muted-foreground">Total event costs</p>
              <p className="text-2xl font-bold">{formatCurrency(totals.totalCosts)}</p>
            </div>
            <div className="rounded-xl border bg-background/80 p-4">
              <p className="text-xs text-muted-foreground">Projected profit</p>
              <p className={`text-2xl font-bold ${totals.projectedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totals.projectedProfit)}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className={`grid gap-5 lg:grid-cols-[1.15fr_0.85fr] content-start ${embedded ? 'px-0 pb-0' : ''}`}>
        <div className="space-y-4">
          <div className="rounded-xl border p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold">1. Ticket mix and sales forecast</h3>
                <p className="text-sm text-muted-foreground">
                  Start with General only, then add VIP, VVIP, early bird, tables, or any custom tier when you need them.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addTier}>
                <Plus className="h-4 w-4" />
                Add tier
              </Button>
            </div>

            <div className="space-y-3">
              {tierResults.map((tier) => (
                <div key={tier.id} className="rounded-xl border bg-muted/20 p-3 sm:p-4">
                  <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
                    <div className="space-y-2">
                      <Label>Tier name</Label>
                      <Input value={tier.name} onChange={(e) => updateTier(tier.id, 'name', e.target.value)} className="h-10" />
                    </div>
                    <div className="space-y-2">
                      <Label>Ticket price</Label>
                      <Input type="number" min="0" step="1" value={tier.price} onChange={(e) => updateTier(tier.id, 'price', e.target.value)} className="h-10" />
                    </div>
                    <div className="space-y-2">
                      <Label>Expected sold</Label>
                      <Input type="number" min="0" step="1" value={tier.quantity} onChange={(e) => updateTier(tier.id, 'quantity', e.target.value)} className="h-10" />
                    </div>
                    <div className="flex items-end">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeTier(tier.id)} disabled={ticketTiers.length <= 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4 text-sm">
                    <div className="rounded-lg bg-background p-3">
                      <p className="text-muted-foreground">Ticket revenue</p>
                      <p className="font-semibold">{formatCurrency(tier.grossSales)}</p>
                    </div>
                    <div className="rounded-lg bg-background p-3">
                      <p className="text-muted-foreground">You keep</p>
                      <p className="font-semibold text-primary">{formatCurrency(tier.netRevenue)}</p>
                    </div>
                    <div className="rounded-lg bg-background p-3">
                      <p className="text-muted-foreground">Platform fees</p>
                      <p className="font-semibold">{formatCurrency(tier.platformFeesTotal)}</p>
                    </div>
                    <div className="rounded-lg bg-background p-3">
                      <p className="text-muted-foreground">Buyer booking fees</p>
                      <p className="font-semibold">{formatCurrency(tier.buyerFeesTotal)}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">Paid by the buyer at checkout.</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold">2. Event costs and extra expenses</h3>
                <p className="text-sm text-muted-foreground">
                  Add every cost that affects your real profit, including marketing, transport, decor, staff, or anything else.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addExpense}>
                <Plus className="h-4 w-4" />
                Add expense
              </Button>
            </div>

            <div className="space-y-3">
              {expenses.map((expense) => (
                <div key={expense.id} className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_auto]">
                  <div className="space-y-2">
                    <Label>Expense name</Label>
                    <Input value={expense.label} onChange={(e) => updateExpense(expense.id, 'label', e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" min="0" step="1" value={expense.amount} onChange={(e) => updateExpense(expense.id, 'amount', e.target.value)} className="h-10" />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeExpense(expense.id)} disabled={expenses.length <= 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-primary/5 p-4 sm:p-5">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <TrendingUp className="h-4 w-4 text-primary" />
              3. Break-even summary
            </div>
            <p className="text-3xl font-bold text-primary">
              {totals.breakEvenTickets !== null ? `${totals.breakEvenTickets} tickets` : 'Set ticket mix'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              This is the number of tickets you need to sell to cover all event costs after organizer-side platform fees.
            </p>
            <div className="mt-4 grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-2 rounded-lg bg-background/80 p-3">
                <span className="text-muted-foreground">Break-even capacity needed</span>
                <span className="font-medium">{totals.breakEvenCapacityPercent !== null ? `${totals.breakEvenCapacityPercent}%` : 'Set ticket mix'}</span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg bg-background/80 p-3">
                <span className="text-muted-foreground">Break-even revenue</span>
                <span className="font-medium">{totals.breakEvenRevenue ? formatCurrency(totals.breakEvenRevenue) : 'Set ticket mix'}</span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg bg-background/80 p-3">
                <span className="text-muted-foreground">Planned tickets sold</span>
                <span className="font-medium">{totals.ticketsSold}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">4. Projected income statement</span>
              <Badge variant={totals.sellThroughRate >= 70 ? 'default' : 'secondary'}>
                <Users className="mr-1 h-3 w-3" />
                {totals.sellThroughRate}% of capacity
              </Badge>
            </div>

            <div className="rounded-lg bg-muted/20 p-3 text-sm space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Avg ticket price</span>
                <span className="font-medium">{formatCurrency(totals.avgTicketPrice)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Platform fee per ticket</span>
                <span className="font-medium">{formatCurrency(totals.avgTicketPrice - totals.avgNetPerTicket)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Booking fee per ticket</span>
                <span className="font-medium">{formatCurrency(totals.ticketsSold > 0 ? totals.buyerFees / totals.ticketsSold : 0)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t pt-2">
                <span className="font-medium">You keep per ticket</span>
                <span className="font-semibold text-primary">{formatCurrency(totals.avgNetPerTicket)}</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Platform fee is deducted from your ticket revenue.</p>
              <p>• Booking fee is paid by the buyer at checkout.</p>
              <p>• You keep is your net per ticket after platform fees.</p>
            </div>

            <div className="border-t pt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Ticket revenue</span>
                <span className="font-medium">{formatCurrency(totals.grossSales)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Less platform fees</span>
                <span className="font-medium">({formatCurrency(totals.platformFees)})</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Buyer booking fees to Ziyawa</span>
                <span className="font-medium">{formatCurrency(totals.buyerFees)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t pt-2">
                <span className="font-medium">Net event income</span>
                <span className="font-semibold">{formatCurrency(totals.netRevenue)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Less total event expenses</span>
                <span className="font-medium">({formatCurrency(totals.totalCosts)})</span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t pt-2">
                <span className="font-medium">Projected profit / loss</span>
                <span className={`font-semibold ${totals.projectedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totals.projectedProfit)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-amber-50 p-4 text-sm text-amber-900">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <Wallet className="h-4 w-4" />
              Ziyawa payout timing
            </div>
            <p>
              Ticket money is protected first, then moves to available balance after event completion and the safety hold window.
            </p>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" className="gap-2" onClick={handleExportPdf}>
              <FileDown className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
