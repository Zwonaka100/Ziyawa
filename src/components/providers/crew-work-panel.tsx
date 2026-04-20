'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, Calendar, Loader2, MapPin, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatTime } from '@/lib/helpers'

interface CrewAssignment {
  id: string
  eventId: string
  role?: string
  roleLabel?: string
  organizerName?: string
  organizerId?: string | null
  status: string
  isPast: boolean
  event?: {
    id: string
    title: string
    eventDate: string
    startTime: string
    venue: string
  } | null
}

interface CrewWorkPanelProps {
  assignments: CrewAssignment[]
  loading?: boolean
  title?: string
  description?: string
}

export function CrewWorkPanel({
  assignments,
  loading = false,
  title = 'Crew work',
  description = 'Track your invited event assignments, active jobs, and completed work history.',
}: CrewWorkPanelProps) {
  const router = useRouter()
  const [startingChatFor, setStartingChatFor] = useState<string | null>(null)
  const activeAssignments = assignments.filter((assignment) => assignment.status === 'active' && !assignment.isPast)
  const pastAssignments = assignments.filter((assignment) => assignment.status !== 'active' || assignment.isPast)

  const handleMessageOrganizer = async (organizerId: string, assignmentId: string) => {
    setStartingChatFor(assignmentId)
    try {
      const response = await fetch('/api/conversations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: organizerId,
          contextType: 'event',
          contextId: assignmentId,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start conversation')
      }

      router.push(`/messages?chat=${data.conversationId}`)
    } catch (error) {
      console.error('Error starting organizer conversation:', error)
    } finally {
      setStartingChatFor(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Upcoming & Active Work ({activeAssignments.length})</h3>
          <p className="text-sm text-muted-foreground">These event assignments are open for you right now.</p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">Loading crew work...</CardContent>
          </Card>
        ) : activeAssignments.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              You do not have any active crew assignments yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {activeAssignments.map((assignment) => (
              <Card key={assignment.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>{String(assignment.event?.title || 'Assigned event')}</CardTitle>
                      <CardDescription>Working with {String(assignment.organizerName || 'Organizer')}</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{String(assignment.roleLabel || 'Crew')}</Badge>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {assignment.event?.eventDate ? formatDate(String(assignment.event.eventDate)) : 'Date TBA'}
                        {' • '}
                        {assignment.event?.startTime ? formatTime(String(assignment.event.startTime)) : 'Time TBA'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{String(assignment.event?.venue || 'Venue TBA')}</span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                    This assignment unlocks only the event-day tools needed for your role. Use messages to confirm your rate, shift details, or negotiate any final changes with the organiser.
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link href={`/dashboard/organizer/events/${assignment.eventId}/checkin`}>
                      <Button>
                        Open Event Tools
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    {assignment.organizerId && (
                      <Button
                        variant="outline"
                        onClick={() => handleMessageOrganizer(assignment.organizerId as string, assignment.id)}
                        disabled={startingChatFor === assignment.id}
                      >
                        {startingChatFor === assignment.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <MessageSquare className="mr-2 h-4 w-4" />
                        )}
                        Message Organizer
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Past Crew Work ({pastAssignments.length})</h3>
          <p className="text-sm text-muted-foreground">Completed assignments stay here as your work history.</p>
        </div>

        {loading ? null : pastAssignments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No past crew work yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pastAssignments.map((assignment) => (
              <Card key={assignment.id} className="opacity-95">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{String(assignment.event?.title || 'Past event')}</p>
                        <Badge variant="outline">{String(assignment.roleLabel || 'Crew')}</Badge>
                        <Badge variant="secondary">Past</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {assignment.event?.eventDate ? formatDate(String(assignment.event.eventDate)) : 'Date TBA'}
                        {' • '}
                        {String(assignment.event?.venue || 'Venue TBA')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                      Read-only history
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
