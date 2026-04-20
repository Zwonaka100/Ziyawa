'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Users } from 'lucide-react'
import { EventStaffManager } from '@/components/events/event-staff-manager'
import { Button } from '@/components/ui/button'

export default function OrganizerEventTeamPage() {
  const params = useParams()
  const eventId = params.id as string

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <Link href={`/dashboard/organizer/events/${eventId}/manage`}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <Users className="h-4 w-4" />
              Team and Staff
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Event staff manager</h1>
            <p className="text-muted-foreground">Invite, manage, pay, and review everyone who worked this event.</p>
          </div>
        </div>
      </div>

      <EventStaffManager eventId={eventId} />
    </div>
  )
}
