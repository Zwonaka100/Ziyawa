import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Scale,
  ShieldCheck,
  MessageSquare,
  Banknote,
  RotateCcw,
  Flag,
} from 'lucide-react'
import { loadDashboard, type QueueSummary } from '@/lib/admin/dashboard'
import { formatMoneyExact } from '@/lib/helpers'

export const metadata = { title: 'Admin Dashboard | Ziyawa' }

/** How long the oldest item has been waiting, in plain words. */
function waitingFor(oldestAt: string | null): string | null {
  if (!oldestAt) return null
  const days = Math.floor((Date.now() - new Date(oldestAt).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return '1 day'
  return `${days} days`
}

interface QueueProps {
  title: string
  href: string
  icon: React.ElementType
  queue: QueueSummary
  /** What lands here, shown when nothing is waiting. */
  whenEmpty: string
  amountLabel?: string
}

function QueueCard({ title, href, icon: Icon, queue, whenEmpty, amountLabel }: QueueProps) {
  const waiting = waitingFor(queue.oldestAt)

  // An empty queue should still say what it is for. A blank screen with no
  // explanation is how a page that had approve and decline all along came
  // across as not having them.
  if (queue.count === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">Nothing waiting. {whenEmpty}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow h-full border-l-4 border-l-primary">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-primary shrink-0" />
                <p className="font-medium truncate">{title}</p>
              </div>
              <p className="text-3xl font-bold">{queue.count}</p>
              {queue.amountRands !== undefined && queue.amountRands > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {amountLabel || 'Value'}: {formatMoneyExact(queue.amountRands)}
                </p>
              )}
              {waiting && (
                <p className="text-xs text-muted-foreground mt-1">Oldest waiting {waiting}</p>
              )}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default async function AdminDashboard() {
  const data = await loadDashboard()

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
      whenEmpty: 'Withdrawal requests land here for approval before any money moves.',
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
  const { money, failures } = data
  const failureTotal = failures.failedPayouts + failures.failedRefunds + failures.failedEmails

  // What is owed to people against what is actually in the Paystack balance.
  // Transfers are funded from that balance, so if it is lower, approving
  // everything queued would fail at Paystack rather than here.
  const shortfall =
    money.paystackBalanceRands !== null
      ? money.paystackBalanceRands - money.totalOwedRands
      : null

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">
          {waitingCount === 0 ? 'Nothing needs you right now' : 'What needs you'}
        </h2>
        <p className="text-muted-foreground">
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

      <div className="grid gap-4 lg:grid-cols-2">
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
              <span className="text-muted-foreground">Available to withdraw</span>
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
      </div>
    </div>
  )
}
