'use client'

import { useEffect, useState } from 'react'
import { Loader2, ShieldCheck, UserPlus, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface TeamPerson {
  id: string
  fullName: string
  email: string
  phone?: string
  roleLabel: string
  status: string
  kind: 'member' | 'invite'
}

interface EventTeamAccessCardProps {
  eventId: string
  eventTitle: string
  isPastEvent?: boolean
}

export function EventTeamAccessCard({ eventId, eventTitle, isPastEvent = false }: EventTeamAccessCardProps) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [people, setPeople] = useState<TeamPerson[]>([])
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'door_staff',
  })

  const loadTeam = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/events/${eventId}/team`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load team access')
      }

      setPeople([...(data.members || []), ...(data.invites || [])])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load team access')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTeam()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.fullName.trim() || !form.email.trim()) {
      toast.error('Name and email are required')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/events/${eventId}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invite', ...form }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invite')
      }

      toast.success(data.resent ? 'Invite resent successfully' : 'Event work invite sent')
      setForm({ fullName: '', email: '', phone: '', role: 'door_staff' })
      await loadTeam()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send invite')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async (person: TeamPerson) => {
    try {
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
        throw new Error(data.error || 'Failed to revoke access')
      }

      toast.success(person.kind === 'member' ? 'Team access removed' : 'Invite revoked')
      await loadTeam()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke access')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Team Access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
          Invite trusted staff to work on {eventTitle} without giving them wallet or payout access. This invite activates My Work only — services and artists are booked separately.
        </div>

        {isPastEvent && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            This event has passed. Existing assignments remain in work history, but new active staff access should usually be avoided.
          </div>
        )}

        <form onSubmit={handleInvite} className="space-y-4 rounded-lg border p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="team-name">Full name</Label>
              <Input
                id="team-name"
                value={form.fullName}
                onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="Door staff name"
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="team-email">Email</Label>
              <Input
                id="team-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="staff@example.com"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="team-phone">Phone</Label>
              <Input
                id="team-phone"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Optional phone"
                disabled={submitting}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(value) => setForm((prev) => ({ ...prev, role: value }))}>
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

          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Send invite
          </Button>
        </form>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium">Current event team</p>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          {people.length === 0 && !loading ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No event staff invited yet.
            </div>
          ) : (
            <div className="space-y-2">
              {people.map((person) => (
                <div key={`${person.kind}-${person.id}`} className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{person.fullName}</p>
                      <Badge variant={person.kind === 'member' ? 'default' : 'secondary'}>
                        {person.kind === 'member' ? 'Active access' : 'Invite'}
                      </Badge>
                      <Badge variant="outline">{person.roleLabel}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{person.email}{person.phone ? ` • ${person.phone}` : ''}</p>
                  </div>

                  <Button variant="outline" size="sm" onClick={() => handleRevoke(person)}>
                    <UserX className="mr-2 h-4 w-4" />
                    {person.kind === 'member' ? 'Remove' : 'Revoke'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
