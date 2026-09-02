import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Minus,
} from 'lucide-react'
import { formatMoneyExact } from '@/lib/helpers'
import type {
  QueueSummary,
  TradingFigure,
  UpcomingEvent,
} from '@/lib/admin/dashboard'

/** How long the oldest item has been waiting, in plain words. */
export function waitingFor(oldestAt: string | null): string | null {
  if (!oldestAt) return null
  const days = Math.floor((Date.now() - new Date(oldestAt).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return '1 day'
  return `${days} days`
}

/**
 * A trading number with its period-on-period movement.
 *
 * The comparison is where the meaning is: "R1,240" says little, "R1,240, up 18%
 * on the previous 30 days" says whether things are working.
 */
export function TradingTile({
  label,
  figure,
  money = false,
  suffix = '',
  emphasis = false,
}: {
  label: string
  figure: TradingFigure
  money?: boolean
  suffix?: string
  emphasis?: boolean
}) {
  const format = (n: number) => (money ? formatMoneyExact(n) : `${n}${suffix}`)
  const { changePct } = figure

  const Direction =
    changePct === null || changePct === 0 ? Minus : changePct > 0 ? ArrowUpRight : ArrowDownRight
  const tone =
    changePct === null || changePct === 0
      ? 'text-muted-foreground'
      : changePct > 0
        ? 'text-green-600'
        : 'text-red-600'

  return (
    <Card className={emphasis ? 'border-primary/40' : undefined}>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`font-bold ${emphasis ? 'text-3xl' : 'text-2xl'} mt-1`}>
          {format(figure.value)}
        </p>
        <p className={`text-xs mt-1 flex items-center gap-1 ${tone}`}>
          <Direction className="h-3 w-3" />
          {changePct === null
            ? `nothing in the previous period`
            : `${changePct > 0 ? '+' : ''}${changePct}% on the previous period`}
          <span className="text-muted-foreground">({format(figure.previous)})</span>
        </p>
      </CardContent>
    </Card>
  )
}

export interface QueueProps {
  title: string
  href: string
  icon: React.ElementType
  queue: QueueSummary
  /** What lands here, shown when nothing is waiting. */
  whenEmpty: string
  amountLabel?: string
}

export function QueueCard({ title, href, icon: Icon, queue, whenEmpty, amountLabel }: QueueProps) {
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

/** Only rendered when something is actually wrong. A healthy day shows nothing. */
export function AlertBand({ alerts }: { alerts: { text: string; href?: string }[] }) {
  if (alerts.length === 0) return null

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
      {alerts.map((a) => (
        <div key={a.text} className="flex items-start gap-2 text-sm text-red-900">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          {a.href ? (
            <Link href={a.href} className="hover:underline">
              {a.text}
            </Link>
          ) : (
            <span>{a.text}</span>
          )}
        </div>
      ))}
    </div>
  )
}

function sellThrough(event: UpcomingEvent) {
  if (!event.capacity) return null
  return Math.round((event.tickets_sold / event.capacity) * 100)
}

export function UpcomingEventRow({ event }: { event: UpcomingEvent }) {
  const pct = sellThrough(event)

  return (
    <Link
      href={`/admin/events/${event.id}`}
      className="block rounded-md p-3 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <p className="font-medium truncate">{event.title}</p>
        <p className="text-xs text-muted-foreground shrink-0">
          {new Date(event.event_date).toLocaleDateString('en-ZA', {
            day: 'numeric',
            month: 'short',
          })}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {pct !== null && <Progress value={pct} className="h-1.5 flex-1" />}
        <p className="text-xs text-muted-foreground shrink-0">
          {event.tickets_sold} of {event.capacity || '—'}
          {pct !== null && ` (${pct}%)`}
        </p>
      </div>
    </Link>
  )
}

export function ForwardCard({
  title,
  events,
  emptyText,
}: {
  title: string
  events: UpcomingEvent[]
  emptyText: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">{emptyText}</p>
        ) : (
          <div className="-mx-3">
            {events.map((e) => (
              <UpcomingEventRow key={e.id} event={e} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
