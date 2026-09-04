import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertTriangle,
  Banknote,
  CalendarCheck,
  CheckCircle2,
  Flag,
  MessageSquare,
  RotateCcw,
  Scale,
  ShieldCheck,
} from 'lucide-react'
import {
  loadBlockedMoney,
  loadDashboard,
  loadForwardView,
  loadTrading,
  hasRecentSales,
  TRADING_PERIODS,
  type TradingPeriod,
} from '@/lib/admin/dashboard'
import {
  AlertBand,
  ForwardCard,
  QueueCard,
  TradingTile,
  type QueueProps,
} from '@/components/admin/dashboard-sections'
import { formatMoneyExact } from '@/lib/helpers'

export const metadata = { title: 'Admin Dashboard | Ziyawa' }

/** Flag a dry spell before it becomes a surprise. */
const STALE_SALE_DAYS = 14
const LOW_COMPLETION_PCT = 50

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const params = await searchParams
  const requested = Number(params.days)
  // Default to all time until there is enough recent trade for a window to be
  // meaningful. With every sale older than 30 days, the default view reported
  // R0.00 across the board and showed the real R260.00 only as a "previous
  // period" figure in brackets - which reads as a business with no money.
  const days: TradingPeriod = (TRADING_PERIODS as readonly number[]).includes(requested)
    ? (requested as TradingPeriod)
    : ((await hasRecentSales()) ? 30 : 0)

  const [data, trading, forward, blocked] = await Promise.all([
    loadDashboard(),
    loadTrading(days),
    loadForwardView(),
    loadBlockedMoney(),
  ])

  const { money, failures } = data

  const queues: QueueProps[] = [
    {
      title: 'Events awaiting completion',
      href: '/admin/events?lifecycle=past',
      icon: CalendarCheck,
      queue: data.needsCompletion,
      amountLabel: 'Held for these organisers',
      whenEmpty: 'Past events appear here until their organiser marks them complete.',
    },
    {
      title: 'Verifications to review',
      href: '/admin/verifications',
      icon: ShieldCheck,
      queue: data.verifications,
      whenEmpty: 'ID and bank submissions land here for approve or decline.',
    },
    {
      title: 'Payouts to approve',
      href: '/admin/finance/payouts',
      icon: Banknote,
      queue: data.payouts,
      amountLabel: 'Requested',
      whenEmpty: 'Payouts land here for your approval once an event clears review. Nothing moves without you.',
    },
    {
      title: 'Refunds queued',
      href: '/admin/finance/refunds',
      icon: RotateCcw,
      queue: data.refunds,
      amountLabel: 'To refund',
      whenEmpty: 'Refunds queued by a cancellation or a buyer request appear here.',
    },
    {
      title: 'Open disputes',
      href: '/admin/disputes',
      icon: Scale,
      queue: data.disputes,
      whenEmpty: 'Disputed artist and crew bookings appear here to release or refund.',
    },
    {
      title: 'Reports to action',
      href: '/admin/reports',
      icon: Flag,
      queue: data.reports,
      whenEmpty: 'Reports about users, events or reviews appear here.',
    },
    {
      title: 'Support tickets open',
      href: '/admin/support',
      icon: MessageSquare,
      queue: data.support,
      whenEmpty: 'Tickets raised from the support form appear here.',
    },
  ]

  const waitingCount = queues.filter((q) => q.queue.count > 0).length
  const failureTotal = failures.failedPayouts + failures.failedRefunds + failures.failedEmails

  // Owed against what is actually in the Paystack balance. Transfers are funded
  // from that balance, so if it is lower, approving everything queued would
  // fail at Paystack rather than here.
  // Money already sent has left the Paystack balance, so counting it as still
  // owed reports a shortfall twice over. With R180 in flight and R40.50 held,
  // this claimed the balance was R159.99 short when the only money still to
  // find was R40.50.
  const stillToFundRands = money.heldRands + money.availableRands
  const shortfall =
    money.paystackBalanceRands !== null
      ? money.paystackBalanceRands - stillToFundRands
      : null

  const alerts: { text: string; href?: string }[] = []

  if (trading.daysSinceLastSale !== null && trading.daysSinceLastSale >= STALE_SALE_DAYS) {
    alerts.push({
      text: `No completed ticket sale in ${trading.daysSinceLastSale} days. The last checkout anyone started was ${trading.daysSinceLastAttempt} days ago.`,
      href: '/admin/finance/transactions',
    })
  }

  if (
    trading.completionPct !== null &&
    trading.completionPct < LOW_COMPLETION_PCT &&
    trading.checkoutsAttempted > 0
  ) {
    alerts.push({
      text: `Only ${trading.checkoutsCompleted} of ${trading.checkoutsAttempted} checkouts completed ${days === 0 ? 'in total' : `in the last ${days} days`} (${trading.completionPct}%). The rest were started and abandoned before payment.`,
      href: '/admin/finance/transactions',
    })
  }

  if (shortfall !== null && shortfall < 0) {
    alerts.push({
      text: `Paystack balance is ${formatMoneyExact(Math.abs(shortfall))} short of what still has to be paid out. Money already sent is not counted here.`,
      href: '/admin/finance/payouts',
    })
  }

  if (data.needsCompletion.count > 0) {
    alerts.push({
      text: `${data.needsCompletion.count} past ${data.needsCompletion.count === 1 ? 'event has' : 'events have'} not been marked complete, holding ${formatMoneyExact(data.needsCompletion.amountRands || 0)}.`,
      href: '/admin/events?lifecycle=past',
    })
  }

  return (
    <div className="space-y-8">
      <AlertBand alerts={alerts} />

      {/* ── Trading ─────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Trading</h2>
            <p className="text-muted-foreground text-sm">
              {days === 0
                ? 'Everything since Ziyawa opened.'
                : `Compared with the previous ${days} days.`}
            </p>
          </div>
          <div className="flex gap-1 rounded-lg border p-1">
            {TRADING_PERIODS.map((p) => (
              <Link
                key={p}
                href={`/admin?days=${p}`}
                scroll={false}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  p === days
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'hover:bg-muted text-muted-foreground'
                }`}
              >
                {p === 0 ? 'All time' : `${p} days`}
              </Link>
            ))}
          </div>
        </div>

        {/* Six tiles: three columns keeps them as two even rows. */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* The honest revenue line leads. Gross sits beside it, because the
              difference between the two is what Paystack takes. */}
          <TradingTile
            label="Ziyawa net (after Paystack)"
            figure={trading.netEarnedRands}
            money
            emphasis
          />
          <TradingTile label="Booking fees charged" figure={trading.feeEarnedRands} money />
          <TradingTile label="Paid to Paystack" figure={trading.gatewayFeesRands} money />
          <TradingTile label="Gross ticket sales" figure={trading.grossSalesRands} money />
          <TradingTile label="Tickets sold" figure={trading.ticketsSold} />
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Checkouts completed</p>
              <p className="text-2xl font-bold mt-1">
                {trading.completionPct === null ? '—' : `${trading.completionPct}%`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {trading.checkoutsCompleted} of {trading.checkoutsAttempted} started
              </p>
            </CardContent>
          </Card>
          <TradingTile label="New signups" figure={trading.newSignups} />
          <TradingTile label="Events created" figure={trading.newEvents} />
        </div>
      </section>

      {/* ── Work queues ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">
            {waitingCount === 0 ? 'Nothing needs you right now' : 'What needs you'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {waitingCount === 0
              ? 'Every queue is clear. The cards below say what would land in each.'
              : `${waitingCount} ${waitingCount === 1 ? 'queue has' : 'queues have'} work waiting.`}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {queues.map((q) => (
            <QueueCard key={q.title} {...q} />
          ))}
        </div>
      </section>

      {/* ── What's coming ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">What&apos;s coming</h2>
          <p className="text-muted-foreground text-sm">
            Events still ahead, and how they are selling.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ForwardCard
            title="Happening in the next 7 days"
            events={forward.nextSevenDays}
            emptyText="No published events in the next week."
          />
          <ForwardCard
            title="Published but selling nothing"
            events={forward.publishedNotSelling}
            emptyText="Every upcoming published event has sold at least one ticket."
          />
        </div>
      </section>

      {/* ── Money that cannot move ──────────────────────────────────────
          Every other queue lists something a person submitted. An organiser
          whose payout is stuck submitted nothing, and a completed event drops
          out of all seven queues — so the moment money became owed was the
          moment it became invisible. */}
      {blocked.rows.length > 0 && (
        <section>
          <Card className={blocked.stuckCount > 0 ? 'border-amber-300' : undefined}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Who is owed money
              </CardTitle>
              {blocked.stuckCount > 0 && (
                <p className="text-sm text-amber-700">
                  {formatMoneyExact(blocked.stuckRands)} is payable right now but blocked
                  {blocked.stuckCount === 1 ? ' for one person' : ` across ${blocked.stuckCount} people`}.
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {blocked.rows.map((row) => {
                const isStuck = ['not_verified', 'verification_pending', 'verification_rejected', 'no_payout_account'].includes(row.reason)
                return (
                  <div
                    key={row.profileId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                  >
                    <div className="min-w-0">
                      <Link href={`/admin/users/${row.profileId}`} className="font-medium hover:underline">
                        {row.name}
                      </Link>
                      <p className={isStuck ? 'text-xs text-amber-700' : 'text-xs text-muted-foreground'}>
                        {row.label}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatMoneyExact(row.availableRands + row.heldRands + row.pendingPayoutRands)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.heldRands > 0 && `${formatMoneyExact(row.heldRands)} held`}
                        {row.heldRands > 0 && row.availableRands > 0 && ' · '}
                        {row.availableRands > 0 && `${formatMoneyExact(row.availableRands)} payable`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Money and failures ──────────────────────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium">Money position</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Held against events not yet complete</span>
              <span className="font-medium">{formatMoneyExact(money.heldRands)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Released and ready to pay out</span>
              <span className="font-medium">{formatMoneyExact(money.availableRands)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Already paying out</span>
              <span className="font-medium">{formatMoneyExact(money.pendingPayoutRands)}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="font-medium">Total owed to people</span>
              <span className="font-bold">{formatMoneyExact(money.totalOwedRands)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paystack balance</span>
              <span className="font-medium">
                {money.paystackBalanceRands === null
                  ? 'Could not read'
                  : formatMoneyExact(money.paystackBalanceRands)}
              </span>
            </div>
            {shortfall !== null && (
              <p
                className={`text-sm rounded-md p-3 ${
                  shortfall < 0 ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
                }`}
              >
                {shortfall < 0
                  ? `Short by ${formatMoneyExact(Math.abs(shortfall))} if everyone withdrew at once.`
                  : `Covers everything owed, with ${formatMoneyExact(shortfall)} to spare.`}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium">Failures</CardTitle>
          </CardHeader>
          <CardContent>
            {failureTotal === 0 && failures.payoutsWithoutRecipient === 0 ? (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  No failed payouts, refunds or emails. Anything that fails quietly in the
                  background shows up here.
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {failures.failedPayouts > 0 && (
                  <Link
                    href="/admin/finance/reconciliation"
                    className="flex justify-between hover:underline"
                  >
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" /> Failed payouts
                    </span>
                    <span className="font-medium">{failures.failedPayouts}</span>
                  </Link>
                )}
                {failures.failedRefunds > 0 && (
                  <Link
                    href="/admin/finance/reconciliation"
                    className="flex justify-between hover:underline"
                  >
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" /> Failed refunds
                    </span>
                    <span className="font-medium">{failures.failedRefunds}</span>
                  </Link>
                )}
                {failures.failedEmails > 0 && (
                  <Link
                    href="/admin/communications/history?status=failed"
                    className="flex justify-between hover:underline"
                  >
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" /> Failed emails
                    </span>
                    <span className="font-medium">{failures.failedEmails}</span>
                  </Link>
                )}
                {failures.payoutsWithoutRecipient > 0 && (
                  <Link
                    href="/admin/finance/payouts"
                    className="flex justify-between hover:underline"
                  >
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" /> Payout accounts with no
                      Paystack recipient
                    </span>
                    <span className="font-medium">{failures.payoutsWithoutRecipient}</span>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
