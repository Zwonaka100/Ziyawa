'use client'

import Link from 'next/link'
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
  Receipt,
  Wrench,
  Lock,
  LoaderCircle
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/helpers'
import { useRouter } from 'next/navigation'
import { PLATFORM_FEES } from '@/lib/constants'
import { WalletDepositDialog } from '@/components/payments/wallet-deposit-dialog'
import { WalletWithdrawDialog } from '@/components/payments/wallet-withdraw-dialog'

interface Transaction {
  id: string
  type: string
  amount: number
  state: string
  payer_id: string
  recipient_id: string | null
  created_at: string
}

export default function WalletPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTx, setLoadingTx] = useState(true)
  const [depositOpen, setDepositOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const supabase = createClient()

  async function fetchTransactions() {
    if (!user) {
      setTransactions([])
      setLoadingTx(false)
      return
    }

    setLoadingTx(true)

    const { data, error } = await supabase
      .from('transactions')
      .select('id, type, amount, state, payer_id, recipient_id, created_at')
      .or(`payer_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error && data) {
      setTransactions(data as Transaction[])
    }

    setLoadingTx(false)
  }

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/signin')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      void fetchTransactions()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

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

  const hasRoles = profile.is_organizer || profile.is_artist || profile.is_provider
  const availableBalance = profile.wallet_balance || 0
  const heldBalance = profile.held_balance || 0
  const pendingPayoutBalance = profile.pending_payout_balance || 0
  const minimumWithdrawal = PLATFORM_FEES.wallet.minimumWithdrawal / 100

  const handleWalletRefresh = async () => {
    await fetchTransactions()
    router.refresh()
  }

  const handleExportStatement = () => {
    if (transactions.length === 0) {
      return
    }

    const rows = transactions.map((tx) => ({
      date: tx.created_at,
      type: tx.type,
      state: tx.state,
      direction: tx.recipient_id === user.id && tx.type !== 'payout' ? 'credit' : 'debit',
      amount_zar: (tx.amount / 100).toFixed(2),
      reference: tx.id,
    }))

    const headers = ['date', 'type', 'state', 'direction', 'amount_zar', 'reference']
    const csv = [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => `"${String(row[header as keyof typeof row] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ziyawa-wallet-statement-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">My Wallet</h1>
        <p className="text-muted-foreground">
          Only cleared funds can be withdrawn. Escrow funds stay protected until the job or event is complete.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="pb-2">
            <CardDescription>Available Balance</CardDescription>
            <CardTitle className="text-3xl font-bold text-primary">
              {formatCurrency(availableBalance)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Ready for withdrawal or spending.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Held in Escrow</CardDescription>
            <CardTitle className="text-3xl font-bold text-amber-600">
              {formatCurrency(heldBalance)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Protected until event or service completion is confirmed.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Payouts Processing</CardDescription>
            <CardTitle className="text-3xl font-bold text-primary">
              {formatCurrency(pendingPayoutBalance)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Already requested and moving through Paystack.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              disabled={!hasRoles || availableBalance < minimumWithdrawal}
              className="flex-1"
              onClick={() => setWithdrawOpen(true)}
            >
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Request Payout
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setDepositOpen(true)}>
              <ArrowDownLeft className="h-4 w-4 mr-2" />
              Add Funds
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleExportStatement} disabled={loadingTx || transactions.length === 0}>
              <Receipt className="h-4 w-4 mr-2" />
              Download Statement
            </Button>
          </div>

          {!hasRoles && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Become an Organiser, Artist, or Provider to earn and withdraw funds.
            </p>
          )}

          {hasRoles && availableBalance < minimumWithdrawal && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Minimum payout amount is {formatCurrency(minimumWithdrawal)}.
            </p>
          )}

          <div className="mt-3 flex justify-center">
            <Link
              href={{
                pathname: '/support',
                query: {
                  new: '1',
                  category: 'payment',
                  priority: 'high',
                  subject: 'Wallet payout or balance issue',
                  message: 'Please review my wallet or payout issue. Include the payout amount, date, and what happened.',
                },
              }}
            >
              <Button variant="link" className="text-sm">Need help with a payout or balance?</Button>
            </Link>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">1. Earn</p>
              <p className="text-muted-foreground">Ticket and booking payments first enter escrow for safety.</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">2. Confirm</p>
              <p className="text-muted-foreground">Once the event or service is completed, funds move to available balance.</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">3. Withdraw</p>
              <p className="text-muted-foreground">Bank payouts usually land within 24 hours after Paystack confirms them.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {hasRoles && (
        <div className="grid md:grid-cols-3 gap-4">
          {profile.is_organizer && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-medium">Event Revenue</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(heldBalance + availableBalance)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Net of the {PLATFORM_FEES.ticketing.platformFeePercent}% platform fee.
                </p>
              </CardContent>
            </Card>
          )}

          {profile.is_artist && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Music className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-medium">Performance Earnings</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(heldBalance + availableBalance)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Released only after confirmation and the safety hold window.
                </p>
              </CardContent>
            </Card>
          )}

          {profile.is_provider && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-orange-600" />
                  <CardTitle className="text-sm font-medium">Service Earnings</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(heldBalance + availableBalance)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cleared after delivery is confirmed and reviewed.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <CardDescription>
            Purchases, earnings, deposits, and payouts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasRoles ? (
            <Tabs defaultValue="all">
              <TabsList className="mb-4 flex flex-wrap h-auto">
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
                {profile.is_provider && (
                  <TabsTrigger value="service-earnings">
                    <Wrench className="h-3 w-3 mr-1" />
                    Services
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="all">
                <TransactionList transactions={transactions} loading={loadingTx} currentUserId={user.id} />
              </TabsContent>
              <TabsContent value="purchases">
                <TransactionList
                  transactions={transactions.filter(t => t.type === 'ticket_purchase' && t.payer_id === user.id)}
                  loading={loadingTx}
                  currentUserId={user.id}
                />
              </TabsContent>
              {profile.is_organizer && (
                <TabsContent value="event-earnings">
                  <TransactionList
                    transactions={transactions.filter(t => t.type === 'ticket_purchase' && t.recipient_id === user.id)}
                    loading={loadingTx}
                    currentUserId={user.id}
                  />
                </TabsContent>
              )}
              {profile.is_artist && (
                <TabsContent value="booking-earnings">
                  <TransactionList
                    transactions={transactions.filter(t => ['booking_payment', 'artist_booking'].includes(t.type) && t.recipient_id === user.id)}
                    loading={loadingTx}
                    currentUserId={user.id}
                  />
                </TabsContent>
              )}
              {profile.is_provider && (
                <TabsContent value="service-earnings">
                  <TransactionList
                    transactions={transactions.filter(t => t.type === 'vendor_service' && t.recipient_id === user.id)}
                    loading={loadingTx}
                    currentUserId={user.id}
                  />
                </TabsContent>
              )}
            </Tabs>
          ) : (
            <TransactionList transactions={transactions} loading={loadingTx} currentUserId={user.id} />
          )}
        </CardContent>
      </Card>

      <WalletDepositDialog
        open={depositOpen}
        onOpenChange={setDepositOpen}
        currentBalance={availableBalance}
      />

      <WalletWithdrawDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        currentBalance={availableBalance}
        onSuccess={() => { void handleWalletRefresh() }}
      />
    </div>
  )
}

function TransactionList({
  transactions,
  loading,
  currentUserId,
}: {
  transactions: Transaction[]
  loading: boolean
  currentUserId: string
}) {
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
          Your wallet activity will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => {
        const isCredit = tx.type === 'wallet_deposit' || (tx.recipient_id === currentUserId && tx.type !== 'payout')
        const label =
          tx.type === 'ticket_purchase' ? 'Ticket Payment' :
          tx.type === 'wallet_deposit' ? 'Wallet Deposit' :
          tx.type === 'booking_payment' ? 'Booking Payment' :
          tx.type === 'artist_booking' ? 'Artist Booking' :
          tx.type === 'vendor_service' ? 'Service Payment' :
          tx.type === 'payout' ? 'Bank Payout' :
          tx.type

        const stateLabel =
          tx.state === 'held' ? 'In Escrow' :
          tx.type === 'payout' && tx.state === 'released' ? 'Processing' :
          tx.state === 'released' ? 'Available' :
          tx.state === 'settled' ? 'Settled' :
          tx.state === 'refunded' ? 'Returned' :
          tx.state === 'initiated' ? 'Started' :
          tx.state

        const stateHint =
          tx.type === 'payout' && tx.state === 'released'
            ? 'Sent to Paystack for bank transfer.'
            : tx.type === 'payout' && tx.state === 'failed'
              ? 'Payout failed and the funds were restored to your wallet.'
              : tx.type === 'payout' && tx.state === 'refunded'
                ? 'Transfer reversed and the funds were returned to your wallet.'
                : tx.state === 'held'
                  ? 'Protected until completion checks pass.'
                  : tx.state === 'released'
                    ? 'Funds are now available in your wallet.'
                    : tx.state === 'settled'
                      ? 'Completed successfully.'
                      : tx.state === 'initiated'
                        ? 'Waiting for gateway confirmation.'
                        : ''

        const iconClass =
          tx.type === 'ticket_purchase' ? 'bg-blue-100' :
          tx.type === 'wallet_deposit' ? 'bg-green-100' :
          tx.type === 'booking_payment' || tx.type === 'artist_booking' ? 'bg-neutral-100' :
          tx.type === 'vendor_service' ? 'bg-orange-100' :
          tx.type === 'payout' ? 'bg-amber-100' :
          'bg-muted'

        return (
          <div key={tx.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${iconClass}`}>
                {tx.type === 'ticket_purchase' && <Ticket className="h-4 w-4 text-blue-600" />}
                {tx.type === 'wallet_deposit' && <Wallet className="h-4 w-4 text-green-600" />}
                {(tx.type === 'booking_payment' || tx.type === 'artist_booking') && <Music className="h-4 w-4 text-primary" />}
                {tx.type === 'vendor_service' && <Wrench className="h-4 w-4 text-orange-600" />}
                {tx.type === 'payout' && <ArrowUpRight className="h-4 w-4 text-amber-600" />}
                {!['ticket_purchase', 'wallet_deposit', 'booking_payment', 'artist_booking', 'vendor_service', 'payout'].includes(tx.type) && (
                  <Receipt className="h-4 w-4" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
                {stateHint && <p className="mt-1 text-xs text-muted-foreground">{stateHint}</p>}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className={`font-semibold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                {isCredit ? '+' : '-'}{formatCurrency(tx.amount / 100)}
              </p>
              <Badge variant={tx.state === 'settled' || tx.state === 'released' ? 'default' : 'secondary'} className="text-xs capitalize gap-1">
                {tx.state === 'held' && <Lock className="h-3 w-3" />}
                {tx.type === 'payout' && tx.state === 'released' && <LoaderCircle className="h-3 w-3 animate-spin" />}
                {stateLabel}
              </Badge>
            </div>
          </div>
        )
      })}
    </div>
  )
}
