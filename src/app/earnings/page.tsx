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
  History, 
  Calendar, 
  Music,
  Ticket,
  Receipt,
  Wrench,
  Lock,
  LoaderCircle
} from 'lucide-react'
import { formatDate, formatMoneyExact } from '@/lib/helpers'
import { useRouter } from 'next/navigation'
import { PLATFORM_FEES } from '@/lib/constants'

interface Transaction {
  id: string
  type: string
  amount: number
  state: string
  payer_id: string
  recipient_id: string | null
  created_at: string
}

export default function EarningsPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTx, setLoadingTx] = useState(true)
  const supabase = createClient()

  async function fetchTransactions() {
    if (!user) {
      setTransactions([])
      setLoadingTx(false)
      return
    }

    setLoadingTx(true)

    // Only money that actually moved. A checkout someone started and abandoned
    // sits in 'initiated' forever, and showing those here made a person's own
    // earnings list read like a series of failed payments.
    const { data, error } = await supabase
      .from('transactions')
      .select('id, type, amount, state, payer_id, recipient_id, created_at')
      .or(`payer_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .not('state', 'in', '(initiated,failed)')
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
    link.download = `ziyawa-earnings-statement-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Earnings</h1>
        <p className="text-muted-foreground">
          Money from your events shows up here and is paid to your verified bank account after our team reviews it.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="pb-2">
            <CardDescription>Ready for payout</CardDescription>
            <CardTitle className="text-3xl font-bold text-primary">
              {formatMoneyExact(availableBalance)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Cleared and queued to be paid to you.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Not yet cleared</CardDescription>
            <CardTitle className="text-3xl font-bold text-amber-600">
              {formatMoneyExact(heldBalance)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Clears once your event is marked complete.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Payout on the way</CardDescription>
            <CardTitle className="text-3xl font-bold text-primary">
              {formatMoneyExact(pendingPayoutBalance)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Approved and heading to your bank account.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* Payouts are released by an admin, so there is nothing to request
              here. Explain what happens instead of offering a dead button. */}
          {availableBalance > 0 ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-medium text-green-900">
                {formatMoneyExact(availableBalance)} is queued for payout
              </p>
              <p className="text-xs text-green-800 mt-1">
                Our team reviews and releases payouts to your verified bank account. You don&apos;t need to
                request anything — we&apos;ll email you once it&apos;s on the way.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm font-medium">No funds ready for payout yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Money from your events becomes available once the event is marked complete. It&apos;s then
                paid out to your verified bank account automatically, after review.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row mt-3">
            <Button variant="outline" className="flex-1" onClick={handleExportStatement} disabled={loadingTx || transactions.length === 0}>
              <Receipt className="h-4 w-4 mr-2" />
              Download Statement
            </Button>
          </div>

          {!hasRoles && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Become an Organiser, Artist, or Provider to earn on Ziyawa.
            </p>
          )}

          {/*
            This used to be unlinked text that only appeared once money had
            already been released. An organiser whose event has just completed
            has everything in `held`, so the one screen where they look for
            their money said nothing at all about the step blocking it.
          */}
          {hasRoles && !profile.is_verified && (heldBalance + availableBalance) > 0 && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-center">
              <p className="text-sm font-medium text-amber-900">
                Verify your account so we can pay you
              </p>
              <p className="mt-1 text-xs text-amber-800">
                {formatMoneyExact(heldBalance + availableBalance)} is waiting. We can only send money to a
                verified account — it takes a few minutes and needs your ID and bank details.
              </p>
              <Link href="/dashboard/settings?tab=verification">
                <Button size="sm" className="mt-3">Verify my account</Button>
              </Link>
            </div>
          )}

          <div className="mt-3 flex justify-center">
            <Link
              href={{
                pathname: '/support',
                query: {
                  new: '1',
                  category: 'payment',
                  priority: 'high',
                  subject: 'Payout or earnings issue',
                  message: 'Please review my payout or earnings issue. Include the amount, date, and what happened.',
                },
              }}
            >
              <Button variant="link" className="text-sm">Need help with a payout or balance?</Button>
            </Link>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">1. Earn</p>
              <p className="text-muted-foreground">Ticket sales are collected and held while your event runs.</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">2. Confirm</p>
              <p className="text-muted-foreground">Once your event is marked complete, your money clears.</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">3. Get paid</p>
              <p className="text-muted-foreground">We review and send it to your bank, usually landing within 24 hours.</p>
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
                <p className="text-2xl font-bold">{formatMoneyExact(heldBalance + availableBalance)}</p>
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
                <p className="text-2xl font-bold">{formatMoneyExact(heldBalance + availableBalance)}</p>
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
                <p className="text-2xl font-bold">{formatMoneyExact(heldBalance + availableBalance)}</p>
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
          Your earnings activity will appear here.
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
          tx.type === 'wallet_deposit' ? 'Added funds' :
          tx.type === 'booking_payment' ? 'Booking Payment' :
          tx.type === 'artist_booking' ? 'Artist Booking' :
          tx.type === 'vendor_service' ? 'Service Payment' :
          tx.type === 'payout' ? 'Bank Payout' :
          tx.type

        const stateLabel =
          tx.state === 'held' ? 'Clearing' :
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
              ? 'Payout failed and the funds were returned to your available earnings.'
              : tx.type === 'payout' && tx.state === 'refunded'
                ? 'Transfer reversed and the funds were returned to your available earnings.'
                : tx.state === 'held'
                  ? 'Protected until completion checks pass.'
                  : tx.state === 'released'
                    ? 'This money has cleared and is ready for payout.'
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
                {isCredit ? '+' : '-'}{formatMoneyExact(tx.amount / 100)}
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
