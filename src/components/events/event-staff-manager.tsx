'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BadgeDollarSign,
  CalendarDays,
  ClipboardList,
  Clock3,
  Loader2,
  ShieldCheck,
  UserPlus,
  UserX,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatDate } from '@/lib/helpers'

interface TeamPerson {
  id: string
  fullName: string
  email: string
  phone?: string
  roleLabel: string
  status: string
  kind: 'member' | 'invite'
  createdAt?: string
}

interface TeamShift {
  id: string
  memberId: string
  fullName: string
  roleLabel: string
  shiftTitle: string
  workDate: string
  hoursWorked: number
  notes?: string
  status: string
  createdAt?: string
}

interface TeamPayment {
  id: string
  memberId: string
  fullName: string
  roleLabel: string
  amount: number
  currency: string
  paymentMethod: string
  notes?: string
  status: string
  paidAt?: string | null
  createdAt?: string
}

interface EventStaffManagerProps {
  eventId: string
  eventTitle?: string
  isPastEvent?: boolean
}

export function EventStaffManager({ eventId, eventTitle = 'This event', isPastEvent = false }: EventStaffManagerProps) {
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [currentEventTitle, setCurrentEventTitle] = useState(eventTitle)
  const [people, setPeople] = useState<TeamPerson[]>([])
  const [shifts, setShifts] = useState<TeamShift[]>([])
  const [payments, setPayments] = useState<TeamPayment[]>([])

  const [inviteForm, setInviteForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'door_staff',
    offeredRate: '',
    inviteMessage: '',
  })

  const [shiftForm, setShiftForm] = useState({
    memberId: '',
    shiftTitle: '',
    workDate: new Date().toISOString().slice(0, 10),
    hoursWorked: '5',
    notes: '',
    status: 'worked',
  })

  const [paymentForm, setPaymentForm] = useState({
    memberId: '',
    amount: '',
    paymentMethod: 'cash',
    notes: '',
    status: 'planned',
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/events/${eventId}/team`, { cache: 'no-store' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load staff tools')
      }

      setCurrentEventTitle(data.event?.title || eventTitle)
      setPeople([...(data.members || []), ...(data.invites || [])])
      setShifts(data.shifts || [])
      setPayments(data.payments || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load staff tools')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  const activeMembers = useMemo(
    () => people.filter((person) => person.kind === 'member' && person.status !== 'revoked'),
    [people]
  )

  useEffect(() => {
    if (activeMembers.length > 0 && !shiftForm.memberId) {
      setShiftForm((prev) => ({ ...prev, memberId: activeMembers[0].id }))
    }

    if (activeMembers.length > 0 && !paymentForm.memberId) {
      setPaymentForm((prev) => ({ ...prev, memberId: activeMembers[0].id }))
    }
  }, [activeMembers, paymentForm.memberId, shiftForm.memberId])

  const pendingInvites = useMemo(
    () => people.filter((person) => person.kind === 'invite' && person.status === 'pending'),
    [people]
  )

  const totalPaid = useMemo(
    () => payments
      .filter((payment) => payment.status === 'paid')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [payments]
  )

  const outstandingPay = useMemo(
    () => payments
      .filter((payment) => payment.status !== 'paid')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [payments]
  )

  const teamHistory = useMemo(() => {
    return activeMembers.map((member) => {
      const memberShifts = shifts.filter((shift) => shift.memberId === member.id)
      const memberPayments = payments.filter((payment) => payment.memberId === member.id)
      return {
        ...member,
        shiftCount: memberShifts.length,
        hoursWorked: memberShifts.reduce((sum, shift) => sum + Number(shift.hoursWorked || 0), 0),
        totalPaid: memberPayments.filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
        pendingPay: memberPayments.filter((payment) => payment.status !== 'paid').reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
        latestWorkDate: memberShifts[0]?.workDate || null,
      }
    })
  }, [activeMembers, payments, shifts])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inviteForm.fullName.trim() || !inviteForm.email.trim()) {
      toast.error('Name and email are required')
      return
    }

    try {
      setBusyAction('invite')
      const response = await fetch(`/api/events/${eventId}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invite',
          ...inviteForm,
          offeredRate: inviteForm.offeredRate ? Number(inviteForm.offeredRate) : null,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invite')
      }

      toast.success(data.resent ? 'Invite resent successfully' : 'Event work invite sent')
      setInviteForm({ fullName: '', email: '', phone: '', role: 'door_staff', offeredRate: '', inviteMessage: '' })
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send invite')
    } finally {
      setBusyAction(null)
    }
  }

  const handleRevoke = async (person: TeamPerson) => {
    try {
      setBusyAction(`revoke-${person.id}`)
      const response = await fetch(`/api/events/${eventId}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          person.kind === 'member'
            ? { action: 'revokeMember', memberId: person.id }
            : { action: 'revokeInvite', inviteId: person.id }
        ),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update staff access')
      }

      toast.success(person.kind === 'member' ? 'Team access removed' : 'Invite revoked')
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update staff access')
    } finally {
      setBusyAction(null)
    }
  }

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!shiftForm.memberId || !shiftForm.shiftTitle.trim()) {
      toast.error('Choose a staff member and add the work title')
      return
    }

    try {
      setBusyAction('shift')
      const response = await fetch(`/api/events/${eventId}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveShift',
          memberId: shiftForm.memberId,
          shiftTitle: shiftForm.shiftTitle,
          workDate: shiftForm.workDate,
          hoursWorked: Number(shiftForm.hoursWorked || 0),
          notes: shiftForm.notes,
          status: shiftForm.status,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save work log')
      }

      toast.success('Work log saved')
      setShiftForm((prev) => ({ ...prev, shiftTitle: '', hoursWorked: '5', notes: '', status: 'worked' }))
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save work log')
    } finally {
      setBusyAction(null)
    }
  }

  const handleDeleteShift = async (shiftId: string) => {
    try {
      setBusyAction(`shift-delete-${shiftId}`)
      const response = await fetch(`/api/events/${eventId}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteShift', shiftId }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete work log')
      }

      toast.success('Work log removed')
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete work log')
    } finally {
      setBusyAction(null)
    }
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!paymentForm.memberId || Number(paymentForm.amount) <= 0) {
      toast.error('Choose a staff member and add a valid amount')
      return
    }

    try {
      setBusyAction('payment')
      const response = await fetch(`/api/events/${eventId}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recordPayment',
          memberId: paymentForm.memberId,
          amount: Number(paymentForm.amount),
          paymentMethod: paymentForm.paymentMethod,
          notes: paymentForm.notes,
          status: paymentForm.status,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save staff payment')
      }

      toast.success(paymentForm.status === 'paid' ? 'Staff payment recorded' : 'Payment plan saved')
      setPaymentForm((prev) => ({ ...prev, amount: '', paymentMethod: 'cash', notes: '', status: 'planned' }))
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save staff payment')
    } finally {
      setBusyAction(null)
    }
  }

  const handleMarkPaymentPaid = async (paymentId: string) => {
    try {
      setBusyAction(`payment-paid-${paymentId}`)
      const response = await fetch(`/api/events/${eventId}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markPaymentPaid', paymentId }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update payment')
      }

      toast.success('Payment marked as paid')
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update payment')
    } finally {
      setBusyAction(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-background to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Event Team and Staff Hub
          </CardTitle>
          <CardDescription>
            Invite trusted staff, log what they worked on, and keep all team payments for {currentEventTitle} in one place.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
        Staff invites only activate <strong>My Work</strong> for event crew. Artists and service providers should still be booked through the normal Ziyawa booking flow.
      </div>

      {isPastEvent && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          This event has passed. You can still close payments and review the full staff history here.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{activeMembers.length}</p>
                <p className="text-sm text-muted-foreground">Active staff</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <UserPlus className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{pendingInvites.length}</p>
                <p className="text-sm text-muted-foreground">Pending invites</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{shifts.length}</p>
                <p className="text-sm text-muted-foreground">Work logs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Wallet className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p>
                <p className="text-sm text-muted-foreground">Staff paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="team" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="team">Invite & Manage</TabsTrigger>
          <TabsTrigger value="work">Work Log</TabsTrigger>
          <TabsTrigger value="payments">Pay Staff</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invite event staff</CardTitle>
              <CardDescription>Add door staff, guest-list staff, or event ops for this event only.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label htmlFor="team-name">Full name</Label>
                    <Input
                      id="team-name"
                      value={inviteForm.fullName}
                      onChange={(e) => setInviteForm((prev) => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Door staff name"
                      disabled={busyAction === 'invite'}
                    />
                  </div>
                  <div>
                    <Label htmlFor="team-email">Email</Label>
                    <Input
                      id="team-email"
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="staff@example.com"
                      disabled={busyAction === 'invite'}
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label htmlFor="team-phone">Phone</Label>
                    <Input
                      id="team-phone"
                      value={inviteForm.phone}
                      onChange={(e) => setInviteForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="Optional phone"
                      disabled={busyAction === 'invite'}
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={inviteForm.role} onValueChange={(value) => setInviteForm((prev) => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="door_staff">Door Staff</SelectItem>
                        <SelectItem value="guest_list_staff">Guest List Staff</SelectItem>
                        <SelectItem value="event_ops">Event Ops Lead</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label htmlFor="team-rate">Proposed rate</Label>
                    <Input
                      id="team-rate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={inviteForm.offeredRate}
                      onChange={(e) => setInviteForm((prev) => ({ ...prev, offeredRate: e.target.value }))}
                      placeholder="Optional offer amount"
                      disabled={busyAction === 'invite'}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      You can invite at a custom rate. They can accept or message you to discuss it.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="team-message">Invite note</Label>
                    <Textarea
                      id="team-message"
                      value={inviteForm.inviteMessage}
                      onChange={(e) => setInviteForm((prev) => ({ ...prev, inviteMessage: e.target.value }))}
                      placeholder="Shift details, arrival time, pay expectations..."
                      disabled={busyAction === 'invite'}
                    />
                  </div>
                </div>

                <Button type="submit" disabled={busyAction === 'invite'}>
                  {busyAction === 'invite' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Send invite
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current staff and invites</CardTitle>
              <CardDescription>Manage who can work on the event and revoke access when needed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {people.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No event staff added yet.
                </div>
              ) : (
                people.map((person) => (
                  <div key={`${person.kind}-${person.id}`} className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{person.fullName}</p>
                        <Badge variant={person.kind === 'member' ? 'default' : 'secondary'}>
                          {person.kind === 'member' ? 'Active access' : 'Invite'}
                        </Badge>
                        <Badge variant="outline">{person.roleLabel}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {person.email}
                        {person.phone ? ` • ${person.phone}` : ''}
                      </p>
                    </div>

                    <Button variant="outline" size="sm" onClick={() => handleRevoke(person)} disabled={busyAction === `revoke-${person.id}`}>
                      {busyAction === `revoke-${person.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserX className="mr-2 h-4 w-4" />}
                      {person.kind === 'member' ? 'Remove' : 'Revoke'}
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Log who worked and what they did</CardTitle>
              <CardDescription>Track shifts, responsibilities, hours, and notes for each staff member.</CardDescription>
            </CardHeader>
            <CardContent>
              {activeMembers.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Add or accept a staff member first to start recording work.
                </div>
              ) : (
                <form onSubmit={handleSaveShift} className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label>Staff member</Label>
                      <Select value={shiftForm.memberId} onValueChange={(value) => setShiftForm((prev) => ({ ...prev, memberId: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose staff" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.fullName} • {member.roleLabel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="shift-title">Work title</Label>
                      <Input
                        id="shift-title"
                        value={shiftForm.shiftTitle}
                        onChange={(e) => setShiftForm((prev) => ({ ...prev, shiftTitle: e.target.value }))}
                        placeholder="Main gate check-in"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <Label htmlFor="work-date">Date</Label>
                      <Input id="work-date" type="date" value={shiftForm.workDate} onChange={(e) => setShiftForm((prev) => ({ ...prev, workDate: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="hours-worked">Hours</Label>
                      <Input id="hours-worked" type="number" min="0" step="0.5" value={shiftForm.hoursWorked} onChange={(e) => setShiftForm((prev) => ({ ...prev, hoursWorked: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select value={shiftForm.status} onValueChange={(value) => setShiftForm((prev) => ({ ...prev, status: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="worked">Worked</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="work-notes">Notes</Label>
                    <Textarea
                      id="work-notes"
                      value={shiftForm.notes}
                      onChange={(e) => setShiftForm((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Guest list support, VIP wristbands, walkie check, issue handling..."
                    />
                  </div>

                  <Button type="submit" disabled={busyAction === 'shift'}>
                    {busyAction === 'shift' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardList className="mr-2 h-4 w-4" />}
                    Save work log
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent work logs</CardTitle>
              <CardDescription>See who worked for you and what they handled.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {shifts.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No work has been logged yet.
                </div>
              ) : (
                shifts.map((shift) => (
                  <div key={shift.id} className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{shift.fullName}</p>
                        <Badge variant="outline">{shift.roleLabel}</Badge>
                        <Badge variant="secondary">{shift.status}</Badge>
                      </div>
                      <p className="font-medium text-sm">{shift.shiftTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(shift.workDate)} • {shift.hoursWorked || 0}h
                      </p>
                      {shift.notes ? <p className="text-sm text-muted-foreground">{shift.notes}</p> : null}
                    </div>

                    <Button variant="outline" size="sm" onClick={() => handleDeleteShift(shift.id)} disabled={busyAction === `shift-delete-${shift.id}`}>
                      {busyAction === `shift-delete-${shift.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserX className="mr-2 h-4 w-4" />}
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plan or record staff payments</CardTitle>
              <CardDescription>Keep a clean record of who has been paid, what for, and what is still outstanding.</CardDescription>
            </CardHeader>
            <CardContent>
              {activeMembers.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Add staff members first before recording payments.
                </div>
              ) : (
                <form onSubmit={handleRecordPayment} className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label>Staff member</Label>
                      <Select value={paymentForm.memberId} onValueChange={(value) => setPaymentForm((prev) => ({ ...prev, memberId: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose staff" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.fullName} • {member.roleLabel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="payment-amount">Amount</Label>
                      <Input
                        id="payment-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                        placeholder="500"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label>Payment method</Label>
                      <Select value={paymentForm.paymentMethod} onValueChange={(value) => setPaymentForm((prev) => ({ ...prev, paymentMethod: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                          <SelectItem value="wallet">Wallet</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select value={paymentForm.status} onValueChange={(value) => setPaymentForm((prev) => ({ ...prev, status: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planned">Planned</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="payment-notes">What is this for?</Label>
                    <Textarea
                      id="payment-notes"
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Door shift, VIP support, setup crew, afterparty closeout..."
                    />
                  </div>

                  <Button type="submit" disabled={busyAction === 'payment'}>
                    {busyAction === 'payment' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BadgeDollarSign className="mr-2 h-4 w-4" />}
                    Save payment record
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Total paid</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatCurrency(totalPaid)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Still outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatCurrency(outstandingPay)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payment records</CardTitle>
              <CardDescription>All staff payment entries for this event.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {payments.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No staff payments recorded yet.
                </div>
              ) : (
                payments.map((payment) => (
                  <div key={payment.id} className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{payment.fullName}</p>
                        <Badge variant="outline">{payment.roleLabel}</Badge>
                        <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>{payment.status === 'paid' ? 'Paid' : 'Planned'}</Badge>
                      </div>
                      <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.paymentMethod.replace('_', ' ')}
                        {payment.paidAt ? ` • ${formatDate(payment.paidAt)}` : ''}
                      </p>
                      {payment.notes ? <p className="text-sm text-muted-foreground">{payment.notes}</p> : null}
                    </div>

                    {payment.status !== 'paid' ? (
                      <Button variant="outline" size="sm" onClick={() => handleMarkPaymentPaid(payment.id)} disabled={busyAction === `payment-paid-${payment.id}`}>
                        {busyAction === `payment-paid-${payment.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                        Mark paid
                      </Button>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Who worked for you and what they handled</CardTitle>
              <CardDescription>A clean per-person view of work history and pay status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {teamHistory.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No team history yet.
                </div>
              ) : (
                teamHistory.map((member) => (
                  <div key={member.id} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{member.fullName}</p>
                          <Badge variant="outline">{member.roleLabel}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                      <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-4">
                        <div className="rounded-lg bg-muted/50 px-3 py-2">
                          <div className="flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" /> {member.shiftCount} logs</div>
                        </div>
                        <div className="rounded-lg bg-muted/50 px-3 py-2">
                          <div className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {member.hoursWorked}h</div>
                        </div>
                        <div className="rounded-lg bg-muted/50 px-3 py-2">Paid {formatCurrency(member.totalPaid)}</div>
                        <div className="rounded-lg bg-muted/50 px-3 py-2">Open {formatCurrency(member.pendingPay)}</div>
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-muted-foreground">
                      {member.latestWorkDate ? (
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" />
                          Latest recorded work on {formatDate(member.latestWorkDate)}
                        </div>
                      ) : (
                        <div>No work date recorded yet.</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
