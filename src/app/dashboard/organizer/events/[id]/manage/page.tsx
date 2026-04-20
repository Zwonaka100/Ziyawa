'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { formatCurrency, formatDate, formatTime } from '@/lib/helpers'
import { RevenuePlannerLauncher } from '@/components/payments/revenue-planner'
import {
  ArrowLeft,
  BarChart3,
  Download,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Send,
  Ticket,
  UserCheck,
  UserPlus,
  Users,
  Gift,
  CircleDollarSign,
  ShieldAlert,
  CheckCheck,
} from 'lucide-react'

interface EventSummary {
  id: string
  title: string
  event_date: string
  start_time: string
  venue: string
  tickets_sold: number
}

interface EventStats {
  totalPeople: number
  paidTickets: number
  guestPasses: number
  checkedIn: number
  pendingArrival: number
  uniqueBuyers: number
  emailableContacts: number
}

interface Attendee {
  id: string
  source: 'ticket' | 'guest_pass'
  userId: string | null
  name: string
  email: string | null
  phone: string | null
  code: string
  entryType: string
  checkedIn: boolean
  checkedInAt: string | null
  createdAt: string
  pricePaid: number
  buyerName?: string | null
  buyerEmail?: string | null
  claimedAt?: string | null
  deliveryStatus?: string | null
}

const emptyStats: EventStats = {
  totalPeople: 0,
  paidTickets: 0,
  guestPasses: 0,
  checkedIn: 0,
  pendingArrival: 0,
  uniqueBuyers: 0,
  emailableContacts: 0,
}

const campaignTemplateOptions = {
  event_reminder: [
    { value: 'arrival_info', label: 'Arrival info' },
    { value: 'doors_open', label: 'Doors open' },
    { value: 'final_call', label: 'Final reminder' },
  ],
  event_update: [
    { value: 'general_update', label: 'General update' },
    { value: 'venue_change', label: 'Venue change' },
    { value: 'time_change', label: 'Time change' },
  ],
  review_request: [
    { value: 'thank_you_review', label: 'Thank you + review' },
  ],
} as const

function getEventStatus(eventDate?: string) {
  if (!eventDate) {
    return { label: 'Upcoming', className: 'bg-blue-100 text-blue-700' }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const target = new Date(eventDate)
  target.setHours(0, 0, 0, 0)

  if (target.getTime() === today.getTime()) {
    return { label: 'Live today', className: 'bg-green-100 text-green-700' }
  }

  if (target < today) {
    return { label: 'Past event', className: 'bg-slate-100 text-slate-700' }
  }

  return { label: 'Upcoming', className: 'bg-blue-100 text-blue-700' }
}

export default function OrganizerEventManagePage() {
  const params = useParams()
  const eventId = params.id as string
  const { profile, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [event, setEvent] = useState<EventSummary | null>(null)
  const [stats, setStats] = useState<EventStats>(emptyStats)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [audience, setAudience] = useState('all')
  const [campaignType, setCampaignType] = useState('event_reminder')
  const [messagePreset, setMessagePreset] = useState('arrival_info')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [creatingPass, setCreatingPass] = useState(false)
  const [checkingInId, setCheckingInId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [completingEvent, setCompletingEvent] = useState(false)
  const [passForm, setPassForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    passType: 'guest_list',
    quantity: '1',
    notes: '',
  })

  const loadAttendees = async () => {
    if (!eventId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/events/${eventId}/attendees`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load event manager')
      }

      setEvent(data.event)
      setStats(data.stats || emptyStats)
      setAttendees(data.attendees || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load event manager')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profile?.id) {
      loadAttendees()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, eventId])

  useEffect(() => {
    const allowedPresets = campaignTemplateOptions[campaignType as keyof typeof campaignTemplateOptions] ?? campaignTemplateOptions.event_reminder

    if (!allowedPresets.some((option) => option.value === messagePreset)) {
      setMessagePreset(allowedPresets[0].value)
    }
  }, [campaignType, messagePreset])

  useEffect(() => {
    if (!event) return

    if (campaignType === 'review_request') {
      setSubject(`Thank you for attending ${event.title}`)
      setMessage(
        `Thanks for being part of ${event.title}. We would love your review and we have more events waiting for you on Ziyawa.`
      )
      return
    }

    if (campaignType === 'event_reminder') {
      if (messagePreset === 'doors_open') {
        setSubject(`Doors open soon for ${event.title}`)
        setMessage(
          `Doors open soon for ${event.title}. Please have your Ziyawa ticket ready, arrive early, and keep an eye on your dashboard for any last-minute notices.`
        )
        return
      }

      if (messagePreset === 'final_call') {
        setSubject(`Final reminder for ${event.title}`)
        setMessage(
          `This is your final reminder for ${event.title}. Your ticket is ready in your Ziyawa dashboard. Please arrive early and show your QR code or ticket code at the entrance.`
        )
        return
      }

      setSubject(`Reminder: ${event.title} is almost here`)
      setMessage(
        `Your event is coming up soon. Please arrive early, keep your ticket ready for check-in, and use your Ziyawa dashboard if you need your ticket again.`
      )
      return
    }

    if (campaignType === 'event_update') {
      if (messagePreset === 'venue_change') {
        setSubject(`Important venue update for ${event.title}`)
        setMessage(
          `Please note that there is an important venue-related update for ${event.title}. Check the event page and your ticket dashboard before travelling.`
        )
        return
      }

      if (messagePreset === 'time_change') {
        setSubject(`Important time update for ${event.title}`)
        setMessage(
          `We have an important schedule update for ${event.title}. Please review the latest start time and event details on Ziyawa before you arrive.`
        )
        return
      }

      setSubject(`Important update for ${event.title}`)
      setMessage(
        `We have an important update for ${event.title}. Please review the latest event details on Ziyawa before you travel.`
      )
      return
    }
  }, [campaignType, event, messagePreset])

  const filteredAttendees = useMemo(() => {
    const term = search.trim().toLowerCase()

    return attendees.filter((attendee) => {
      const matchesSearch = !term || [
        attendee.name,
        attendee.email || '',
        attendee.phone || '',
        attendee.code,
        attendee.entryType,
        attendee.buyerName || '',
        attendee.buyerEmail || '',
      ].some((value) => value.toLowerCase().includes(term))

      if (!matchesSearch) return false

      switch (filter) {
        case 'paid':
          return attendee.source === 'ticket'
        case 'guest_list':
          return attendee.source === 'guest_pass'
        case 'checked_in':
          return attendee.checkedIn
        case 'not_checked_in':
          return !attendee.checkedIn
        default:
          return true
      }
    })
  }, [attendees, filter, search])

  const _visibleEmailableCount = useMemo(() => {
    const uniqueEmails = new Set(
      filteredAttendees
        .map((attendee) => attendee.email?.trim().toLowerCase())
        .filter(Boolean)
    )
    return uniqueEmails.size
  }, [filteredAttendees])

  const audienceRecipientCount = useMemo(() => {
    const selected = attendees.filter((attendee) => {
      switch (audience) {
        case 'paid':
          return attendee.source === 'ticket'
        case 'guest_list':
          return attendee.source === 'guest_pass'
        case 'checked_in':
          return attendee.checkedIn
        case 'not_checked_in':
          return !attendee.checkedIn
        default:
          return true
      }
    })

    return new Set(
      selected
        .map((attendee) => attendee.email?.trim().toLowerCase())
        .filter(Boolean)
    ).size
  }, [attendees, audience])

  const guestPasses = useMemo(
    () => attendees.filter((attendee) => attendee.source === 'guest_pass'),
    [attendees]
  )

  const paidRevenue = useMemo(
    () => attendees.filter((attendee) => attendee.source === 'ticket').reduce((sum, attendee) => sum + Number(attendee.pricePaid || 0), 0),
    [attendees]
  )

  const giftedTicketsCount = useMemo(
    () => attendees.filter((attendee) => attendee.source === 'ticket' && attendee.buyerEmail && attendee.email && attendee.buyerEmail !== attendee.email).length,
    [attendees]
  )

  const claimedGiftCount = useMemo(
    () => attendees.filter((attendee) => attendee.source === 'ticket' && Boolean(attendee.claimedAt)).length,
    [attendees]
  )

  const eventStatus = getEventStatus(event?.event_date)
  const isPastEvent = eventStatus.label === 'Past event'
  const activeTemplateOptions = campaignTemplateOptions[campaignType as keyof typeof campaignTemplateOptions] ?? campaignTemplateOptions.event_reminder
  const attendanceRate = stats.totalPeople > 0 ? Math.round((stats.checkedIn / stats.totalPeople) * 100) : 0
  const plannerTicketPrice = stats.paidTickets > 0 ? Math.round(paidRevenue / stats.paidTickets) : 150
  const plannerCapacity = Math.max(Number(event?.tickets_sold || 0), stats.totalPeople, 100)
  const recentArrivals = useMemo(
    () => attendees.filter((attendee) => attendee.checkedIn).sort((a, b) => {
      const first = a.checkedInAt ? new Date(a.checkedInAt).getTime() : 0
      const second = b.checkedInAt ? new Date(b.checkedInAt).getTime() : 0
      return second - first
    }).slice(0, 5),
    [attendees]
  )

  useEffect(() => {
    if (isPastEvent && campaignType !== 'review_request') {
      setCampaignType('review_request')
    }
  }, [campaignType, isPastEvent])

  const handleCreatePass = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isPastEvent) {
      toast.error('Guest list is closed after the event date')
      return
    }

    if (!passForm.fullName.trim()) {
      toast.error('Guest name is required')
      return
    }

    try {
      setCreatingPass(true)
      const response = await fetch(`/api/events/${eventId}/guest-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passForm),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create guest pass')
      }

      toast.success(`Created ${data.passes?.length || 1} access pass${(data.passes?.length || 1) > 1 ? 'es' : ''}`)
      setPassForm({
        fullName: '',
        email: '',
        phone: '',
        passType: 'guest_list',
        quantity: '1',
        notes: '',
      })
      await loadAttendees()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create guest pass')
    } finally {
      setCreatingPass(false)
    }
  }

  const handleMarkPresent = async (attendee: Attendee) => {
    if (isPastEvent) {
      toast.error('Check-in is closed for past events')
      return
    }

    const confirmed = window.confirm(`Confirm check-in for ${attendee.name}?`)
    if (!confirmed) return

    try {
      setCheckingInId(attendee.id)
      const response = await fetch('/api/tickets/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: attendee.id,
          eventId,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to check in attendee')
      }

      toast.success(`${attendee.name} is now checked in`)
      await loadAttendees()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to check in attendee')
    } finally {
      setCheckingInId(null)
    }
  }

  const handleResendTicket = async (attendee: Attendee) => {
    if (attendee.source !== 'ticket') return

    try {
      setResendingId(attendee.id)
      const response = await fetch(`/api/tickets/${attendee.id}/resend`, {
        method: 'POST',
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend ticket email')
      }

      toast.success(data.message || 'Ticket email resent')
      await loadAttendees()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resend ticket email')
    } finally {
      setResendingId(null)
    }
  }

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Please add a subject and message')
      return
    }

    try {
      setSending(true)
      const response = await fetch(`/api/events/${eventId}/attendees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          message,
          audience,
          campaignType: isPastEvent ? 'review_request' : campaignType,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send update')
      }

      toast.success(`Sent ${data.sentCount} attendee emails${data.failedCount ? `, ${data.failedCount} failed` : ''}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send attendee email')
    } finally {
      setSending(false)
    }
  }

  const handleExportAttendees = (scope: 'all' | 'filtered') => {
    const exportRows = scope === 'all' ? attendees : filteredAttendees

    if (exportRows.length === 0) {
      toast.error('There is no attendee data to export')
      return
    }

    const escapeValue = (value: string | number | null | undefined) => {
      const text = String(value ?? '').replace(/"/g, '""')
      return `"${text}"`
    }

    const headers = [
      'Name',
      'Email',
      'Phone',
      'Source',
      'Entry Type',
      'Code',
      'Checked In',
      'Buyer Name',
      'Buyer Email',
      'Price Paid',
      'Created At',
    ]

    const lines = [
      headers.join(','),
      ...exportRows.map((attendee) => ([
        attendee.name,
        attendee.email,
        attendee.phone,
        attendee.source === 'ticket' ? 'Paid ticket' : 'Guest / comp',
        attendee.entryType,
        attendee.code,
        attendee.checkedIn ? 'Yes' : 'No',
        attendee.buyerName,
        attendee.buyerEmail,
        attendee.pricePaid,
        attendee.createdAt,
      ].map(escapeValue).join(','))),
    ]

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${(event?.title || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${scope}-attendees.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    toast.success(`${exportRows.length} attendee rows exported`)
  }

  const handleCompleteEvent = async () => {
    const confirmed = window.confirm('Mark this event as completed? This will start the payout release process once hold rules are satisfied.')
    if (!confirmed) return

    try {
      setCompletingEvent(true)
      const response = await fetch(`/api/events/${eventId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete event')
      }

      toast.success(`Event marked complete. ${data.releaseResult?.released || 0} payout batch${(data.releaseResult?.released || 0) === 1 ? '' : 'es'} released.`)
      await loadAttendees()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to complete event')
    } finally {
      setCompletingEvent(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            This event manager could not be loaded.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/organizer">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Event Manager</h1>
            <p className="text-muted-foreground">
              {event.title} • {formatDate(event.event_date)} • {formatTime(event.start_time)}
            </p>
            <p className="text-sm text-muted-foreground">{event.venue}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline" className={eventStatus.className}>
                {eventStatus.label}
              </Badge>
              <Badge variant="secondary">{stats.paidTickets} tickets on record</Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isPastEvent ? (
            <Button variant="outline" disabled>
              <UserCheck className="h-4 w-4 mr-2" />
              Check-in closed
            </Button>
          ) : (
            <Link href={`/dashboard/organizer/events/${event.id}/checkin`}>
              <Button variant="outline">
                <UserCheck className="h-4 w-4 mr-2" />
                Door / Check-in
              </Button>
            </Link>
          )}
          <Link href={`/dashboard/organizer/events/${event.id}/bookings`}>
            <Button>
              <Users className="h-4 w-4 mr-2" />
              Book, Manage &amp; Pay
            </Button>
          </Link>
          <RevenuePlannerLauncher
            showCard={false}
            triggerLabel="Revenue Planner"
            title="Event Revenue Planner"
            description="Use this event context to test sales, costs, and payout outcomes before making pricing decisions."
            initialTicketPrice={plannerTicketPrice}
            initialCapacity={plannerCapacity}
          />
          <Button variant="outline" onClick={() => handleExportAttendees('all')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          {(eventStatus.label === 'Live today' || eventStatus.label === 'Past event') && (
            <Button onClick={handleCompleteEvent} disabled={completingEvent}>
              {completingEvent ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCheck className="h-4 w-4 mr-2" />}
              Complete Event
            </Button>
          )}
          <Button variant="outline" onClick={loadAttendees}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.totalPeople}</p>
                <p className="text-sm text-muted-foreground">People on list</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.checkedIn}</p>
                <p className="text-sm text-muted-foreground">Checked in</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Ticket className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.uniqueBuyers}</p>
                <p className="text-sm text-muted-foreground">Ticket buyers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Mail className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{stats.emailableContacts}</p>
                <p className="text-sm text-muted-foreground">Email contacts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CircleDollarSign className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(paidRevenue)}</p>
                <p className="text-sm text-muted-foreground">Paid ticket revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Gift className="h-8 w-8 text-pink-600" />
              <div>
                <p className="text-2xl font-bold">{giftedTicketsCount}</p>
                <p className="text-sm text-muted-foreground">Gifted tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{claimedGiftCount}</p>
                <p className="text-sm text-muted-foreground">Claims completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold">{Math.max(0, giftedTicketsCount - claimedGiftCount)}</p>
                <p className="text-sm text-muted-foreground">Pending ticket claims</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="people" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="guestlist">Guest List & Comp</TabsTrigger>
          <TabsTrigger value="messages">Email updates</TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendees and buyers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, email, code or ticket type"
                    className="pl-10"
                  />
                </div>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-full md:w-[220px]">
                    <SelectValue placeholder="Filter people" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All people</SelectItem>
                    <SelectItem value="paid">Paid tickets</SelectItem>
                    <SelectItem value="guest_list">Guest list / comp</SelectItem>
                    <SelectItem value="checked_in">Checked in</SelectItem>
                    <SelectItem value="not_checked_in">Not checked in</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => handleExportAttendees('filtered')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export filtered
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm text-muted-foreground">Attendance rate</p>
                  <p className="text-2xl font-bold">{attendanceRate}%</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm text-muted-foreground">Pending arrivals</p>
                  <p className="text-2xl font-bold">{stats.pendingArrival}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm text-muted-foreground">Latest arrival</p>
                  <p className="font-semibold">{recentArrivals[0]?.name || 'None yet'}</p>
                </div>
              </div>

              <div className="rounded-lg border">
                {filteredAttendees.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">No people match this filter yet.</div>
                ) : (
                  <div className="divide-y">
                    {filteredAttendees.map((attendee) => (
                      <div key={`${attendee.source}-${attendee.id}`} className="p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold">{attendee.name}</p>
                              <Badge
                                variant={attendee.checkedIn ? 'default' : 'outline'}
                                className={attendee.checkedIn ? 'bg-green-500 hover:bg-green-500 text-white' : ''}
                              >
                                {attendee.checkedIn ? 'Checked in' : 'Pending'}
                              </Badge>
                              <Badge variant="secondary">
                                {attendee.source === 'ticket' ? 'Paid ticket' : 'Guest / comp'}
                              </Badge>
                              {attendee.source === 'ticket' && attendee.buyerEmail && attendee.email && attendee.buyerEmail !== attendee.email && (
                                <Badge variant="outline">
                                  {attendee.claimedAt ? 'Gift claimed' : 'Gifted ticket'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {attendee.entryType} • Code: {attendee.code}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Attending: {attendee.email || 'No email'}{attendee.phone ? ` • ${attendee.phone}` : ''}
                            </p>
                            {attendee.source === 'ticket' && attendee.buyerName && (
                              <p className="text-sm text-muted-foreground">
                                Bought by: {attendee.buyerName}{attendee.buyerEmail ? ` • ${attendee.buyerEmail}` : ''}
                              </p>
                            )}
                          </div>

                          <div className="text-sm text-muted-foreground lg:text-right">
                            <p>Added {formatDate(attendee.createdAt)}</p>
                            <p>
                              {attendee.source === 'ticket'
                                ? `Paid ${formatCurrency(attendee.pricePaid || 0)}`
                                : 'Guest access'}
                            </p>
                            {!isPastEvent && attendee.source === 'ticket' && attendee.email && attendee.buyerEmail && attendee.buyerEmail !== attendee.email && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2 mr-2"
                                onClick={() => handleResendTicket(attendee)}
                                disabled={resendingId === attendee.id}
                              >
                                {resendingId === attendee.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                                Resend ticket
                              </Button>
                            )}
                            {!isPastEvent && !attendee.checkedIn && (
                              <Button
                                size="sm"
                                className="mt-2"
                                onClick={() => handleMarkPresent(attendee)}
                                disabled={checkingInId === attendee.id}
                              >
                                {checkingInId === attendee.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserCheck className="h-4 w-4 mr-2" />}
                                Verify & check in
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guestlist" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>Add guest list or comp passes</CardTitle>
              </CardHeader>
              <CardContent>
                {isPastEvent && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Guest list and pass creation is closed because this event has already taken place.
                  </div>
                )}
                <form onSubmit={handleCreatePass} className="space-y-4">
                  <div>
                    <p className="mb-2 text-sm font-medium">Guest name</p>
                    <Input
                      value={passForm.fullName}
                      onChange={(e) => setPassForm((prev) => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Full name"
                      disabled={isPastEvent}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-sm font-medium">Email</p>
                      <Input
                        value={passForm.email}
                        onChange={(e) => setPassForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="guest@email.com"
                        disabled={isPastEvent}
                      />
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium">Phone</p>
                      <Input
                        value={passForm.phone}
                        onChange={(e) => setPassForm((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="Optional phone"
                        disabled={isPastEvent}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-sm font-medium">Pass type</p>
                      <Select value={passForm.passType} onValueChange={(value) => setPassForm((prev) => ({ ...prev, passType: value }))} disabled={isPastEvent}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="guest_list">Guest list</SelectItem>
                          <SelectItem value="comp">Comp</SelectItem>
                          <SelectItem value="vip_guest">VIP guest</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium">Quantity</p>
                      <Input
                        value={passForm.quantity}
                        onChange={(e) => setPassForm((prev) => ({ ...prev, quantity: e.target.value }))}
                        type="number"
                        min="1"
                        max="20"
                        disabled={isPastEvent}
                      />
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium">Notes</p>
                    <Textarea
                      value={passForm.notes}
                      onChange={(e) => setPassForm((prev) => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      placeholder="Optional notes for your team"
                      disabled={isPastEvent}
                    />
                  </div>

                  <Button type="submit" disabled={creatingPass || isPastEvent}>
                    {creatingPass ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                    Add pass
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current guest list</CardTitle>
              </CardHeader>
              <CardContent>
                {guestPasses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No guest list or comp passes yet.</p>
                ) : (
                  <div className="space-y-3">
                    {guestPasses.map((guest) => (
                      <div key={guest.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{guest.name}</p>
                            <p className="text-sm text-muted-foreground">{guest.entryType} • {guest.code}</p>
                            <p className="text-sm text-muted-foreground">{guest.email || 'No email'}{guest.phone ? ` • ${guest.phone}` : ''}</p>
                          </div>
                          <Badge
                            variant={guest.checkedIn ? 'default' : 'outline'}
                            className={guest.checkedIn ? 'bg-green-500 hover:bg-green-500 text-white' : ''}
                          >
                            {guest.checkedIn ? 'Checked in' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <Card>
              <CardHeader>
                <CardTitle>Send attendee update</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isPastEvent && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                    This event has passed, so only post-event thank-you and review emails can be sent.
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="mb-2 text-sm font-medium">Campaign type</p>
                    <Select value={campaignType} onValueChange={setCampaignType} disabled={isPastEvent}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="event_reminder">Pre-event reminder</SelectItem>
                        <SelectItem value="event_update">Important event update</SelectItem>
                        <SelectItem value="review_request">Post-event thank you + review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium">Audience</p>
                    <Select value={audience} onValueChange={setAudience}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All attendees</SelectItem>
                        <SelectItem value="paid">Paid ticket buyers</SelectItem>
                        <SelectItem value="guest_list">Guest list / comp</SelectItem>
                        <SelectItem value="checked_in">Checked-in people only</SelectItem>
                        <SelectItem value="not_checked_in">Not checked in yet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium">Quick template</p>
                    <Select value={messagePreset} onValueChange={setMessagePreset} disabled={isPastEvent}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {activeTemplateOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                  This message will go out as an <span className="font-medium text-foreground">email and an in-app notification</span> to about <span className="font-medium text-foreground">{audienceRecipientCount}</span> matching contacts.
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">Subject</p>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">Message</p>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={8}
                    placeholder="Write the update your attendees should receive"
                  />
                </div>

                <Button onClick={handleSend} disabled={sending} className="w-full md:w-auto">
                  {sending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send update
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lifecycle actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="rounded-lg bg-muted p-3">
                  <p className="font-medium">Audience reachable now</p>
                  <p className="text-2xl font-bold">{audienceRecipientCount}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-primary" />
                    <span>Paid tickets: {stats.paidTickets}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-pink-600" />
                    <span>Guest / comp: {stats.guestPasses}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-green-600" />
                    <span>Checked in: {stats.checkedIn}</span>
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="font-medium mb-2">Recommended flow</p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Send reminder the day before</li>
                    <li>• Send a doors-open or arrival update on the morning of the event</li>
                    <li>• Use urgent updates for venue or time changes</li>
                    <li>• Send thank-you and review request after the event</li>
                  </ul>
                </div>

              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
