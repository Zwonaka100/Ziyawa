'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Calendar, 
  Music,
  Ticket,
  TrendingUp,
  Receipt
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/helpers'
import { useRouter } from 'next/navigation'
import { PLATFORM_CONFIG } from '@/lib/constants'

interface Transaction {
  id: string
  type: string
  amount: number
  status: string
  created_at: string
  description?: string
}

export default function WalletPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTx, setLoadingTx] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchTransactions()
    }
  }, [user])

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .or(`from_user_id.eq.${user!.id},to_user_id.eq.${user!.id}`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error && data) {
      setTransactions(data)
    }
    setLoadingTx(false)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-48 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  const hasRoles = profile.is_organizer || profile.is_artist

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">My Wallet</h1>

      {/* Balance Card */}
      <Card className="mb-6 bg-gradient-to-br from-primary/10 to-primary/5">
        <CardHeader>
          <CardDescription>Total Available Balance</CardDescription>
          <CardTitle className="text-4xl font-bold text-primary">
            {formatCurrency(profile.wallet_balance || 0)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button disabled={!hasRoles} className="flex-1">
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Request Payout
            </Button>
            <Button variant="outline" disabled className="flex-1">
              <ArrowDownLeft className="h-4 w-4 mr-2" />
              Add Funds
            </Button>
          </div>
          {!hasRoles && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Become an Organiser or Artist to earn and withdraw funds
            </p>
          )}
        </CardContent>
      </Card>

      {/* Role-based earnings breakdown */}
      {hasRoles && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {profile.is_organizer && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-medium">Event Earnings</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(0)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  After {PLATFORM_CONFIG.platformFeePercent}% platform fee
                </p>
              </CardContent>
            </Card>
          )}

          {profile.is_artist && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Music className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-medium">Booking Earnings</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(0)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  From performances
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Transaction History with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <CardDescription>
            Your wallet activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasRoles ? (
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="purchases">
                  <Ticket className="h-3 w-3 mr-1" />
                  Purchases
                </TabsTrigger>
                {profile.is_organizer && (
                  <TabsTrigger value="event-earnings">
                    <Calendar className="h-3 w-3 mr-1" />
                    Event Earnings
                  </TabsTrigger>
                )}
                {profile.is_artist && (
                  <TabsTrigger value="booking-earnings">
                    <Music className="h-3 w-3 mr-1" />
                    Bookings
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="all">
                <TransactionList transactions={transactions} loading={loadingTx} />
              </TabsContent>
              <TabsContent value="purchases">
                <TransactionList 
                  transactions={transactions.filter(t => t.type === 'ticket_purchase')} 
                  loading={loadingTx} 
                />
              </TabsContent>
              {profile.is_organizer && (
                <TabsContent value="event-earnings">
                  <TransactionList 
                    transactions={transactions.filter(t => t.type === 'event_revenue')} 
                    loading={loadingTx} 
                  />
                </TabsContent>
              )}
              {profile.is_artist && (
                <TabsContent value="booking-earnings">
                  <TransactionList 
                    transactions={transactions.filter(t => t.type === 'booking_payment')} 
                    loading={loadingTx} 
                  />
                </TabsContent>
              )}
            </Tabs>
          ) : (
            <TransactionList transactions={transactions} loading={loadingTx} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TransactionList({ transactions, loading }: { transactions: Transaction[], loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse h-16 bg-muted rounded"></div>
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No transactions yet</p>
        <p className="text-sm mt-1">
          Your transaction history will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => (
        <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              tx.type === 'ticket_purchase' ? 'bg-blue-100' :
              tx.type === 'event_revenue' ? 'bg-green-100' :
              tx.type === 'booking_payment' ? 'bg-purple-100' :
              'bg-muted'
            }`}>
              {tx.type === 'ticket_purchase' && <Ticket className="h-4 w-4 text-blue-600" />}
              {tx.type === 'event_revenue' && <TrendingUp className="h-4 w-4 text-green-600" />}
              {tx.type === 'booking_payment' && <Music className="h-4 w-4 text-purple-600" />}
              {!['ticket_purchase', 'event_revenue', 'booking_payment'].includes(tx.type) && 
                <Receipt className="h-4 w-4" />
              }
            </div>
            <div>
              <p className="font-medium text-sm">
                {tx.type === 'ticket_purchase' ? 'Ticket Purchase' :
                 tx.type === 'event_revenue' ? 'Event Revenue' :
                 tx.type === 'booking_payment' ? 'Booking Payment' :
                 tx.type}
              </p>
              <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`font-semibold ${
              tx.type === 'ticket_purchase' ? 'text-red-600' : 'text-green-600'
            }`}>
              {tx.type === 'ticket_purchase' ? '-' : '+'}{formatCurrency(tx.amount)}
            </p>
            <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
              {tx.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}
