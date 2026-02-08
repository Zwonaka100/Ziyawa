import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  DollarSign, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  CreditCard,
  RefreshCcw
} from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'

export const metadata = {
  title: 'Finance | Admin | Ziyawa',
}

export default async function AdminFinancePage() {
  const supabase = await createClient()

  // Fetch financial stats
  const [
    { data: transactions },
    { data: wallets },
  ] = await Promise.all([
    supabase.from('transactions').select('amount, type, status').limit(1000),
    supabase.from('wallets').select('balance, pending_balance'),
  ])

  // Calculate totals
  const totalRevenue = transactions?.filter(t => t.type === 'ticket_sale' && t.status === 'completed')
    .reduce((sum, t) => sum + (t.amount || 0), 0) || 0
  
  const totalPayouts = transactions?.filter(t => t.type === 'payout' && t.status === 'completed')
    .reduce((sum, t) => sum + (t.amount || 0), 0) || 0

  const pendingPayouts = wallets?.reduce((sum, w) => sum + (w.pending_balance || 0), 0) || 0
  const totalWalletBalance = wallets?.reduce((sum, w) => sum + (w.balance || 0), 0) || 0

  // Platform commission (10%)
  const platformEarnings = totalRevenue * 0.10

  const stats = [
    { 
      name: 'Total Revenue', 
      value: formatCurrency(totalRevenue), 
      icon: DollarSign, 
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    { 
      name: 'Platform Earnings (10%)', 
      value: formatCurrency(platformEarnings), 
      icon: ArrowUpRight, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    { 
      name: 'Total Payouts', 
      value: formatCurrency(totalPayouts), 
      icon: ArrowDownRight, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    { 
      name: 'Pending Payouts', 
      value: formatCurrency(pendingPayouts), 
      icon: Wallet, 
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Financial Overview</h2>
        <p className="text-muted-foreground">Manage platform finances, payouts, and transactions</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.name}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
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

        <Link href="/admin/finance/wallets">
          <Card className="hover:shadow-md transition-shadow h-full cursor-pointer group">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                  <Wallet className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Wallets</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Manage user wallets and balances, credit or debit adjustments.
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
      </div>
    </div>
  )
}
