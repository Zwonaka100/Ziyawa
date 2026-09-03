import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react'
import { formatMoneyExact } from '@/lib/helpers'
import { loadFinanceOverview } from '@/lib/admin/finance-overview'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Finance | Admin | Ziyawa',
}

export default async function AdminFinancePage() {
  const overview = await loadFinanceOverview()

  const stats = [
    {
      name: 'Ticket sales',
      value: formatMoneyExact(overview.grossSalesRands),
      hint: `${overview.ticketSaleCount} completed sale${overview.ticketSaleCount === 1 ? '' : 's'}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Ziyawa net',
      value: formatMoneyExact(overview.ziyawaNetRands),
      hint: `${formatMoneyExact(overview.bookingFeesRands)} in fees, less ${formatMoneyExact(overview.gatewayFeesRands)} to Paystack`,
      icon: ArrowUpRight,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Owed to users',
      value: formatMoneyExact(overview.totalOwedRands),
      hint: `${formatMoneyExact(overview.heldRands)} held, ${formatMoneyExact(overview.availableRands)} payable, ${formatMoneyExact(overview.pendingPayoutRands)} in flight`,
      icon: ArrowDownRight,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      name: 'Paid out',
      value: formatMoneyExact(overview.paidOutRands),
      hint: 'Transfers that reached a bank account',
      icon: ShieldCheck,
      color: 'text-neutral-700',
      bgColor: 'bg-neutral-100',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Financial Overview</h2>
        <p className="text-muted-foreground">Every figure here counts money that actually moved — abandoned and failed checkouts are excluded, and refunds are not counted as revenue.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{stat.name}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/finance/transactions">
          <Card className="hover:shadow-md transition-shadow h-full cursor-pointer group">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neutral-100 group-hover:bg-neutral-200 transition-colors">
                  <CreditCard className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">Transactions</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                View all platform transactions, filter by type and status.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/finance/payouts">
          <Card className="hover:shadow-md transition-shadow h-full cursor-pointer group">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 group-hover:bg-green-200 transition-colors">
                  <ArrowUpRight className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">Payouts</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Review and process payout requests to organizers and artists.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/finance/refunds">
          <Card className="hover:shadow-md transition-shadow h-full cursor-pointer group">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 group-hover:bg-orange-200 transition-colors">
                  <RefreshCcw className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle className="text-lg">Refunds</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Process refund requests and manage refund history.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/finance/reconciliation">
          <Card className="hover:shadow-md transition-shadow h-full cursor-pointer group">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 group-hover:bg-purple-200 transition-colors">
                  <ShieldCheck className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg">Reconciliation</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Review daily money movement and resolve failed payout or refund exceptions.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
