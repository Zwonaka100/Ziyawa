import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/helpers'
import { ArrowLeft, Calendar, AlertTriangle } from 'lucide-react'

interface BookArtistEntryPageProps {
  params: Promise<{ id: string }>
}

export default async function BookArtistEntryPage({ params }: BookArtistEntryPageProps) {
  const { id: artistId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/auth/signin?redirect=/dashboard/organizer/book-artist/${artistId}`)
  }

  const [{ data: profile }, { data: artist }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, is_organizer')
      .eq('id', user.id)
      .single(),
    supabase
      .from('artists')
      .select('id, stage_name, is_available')
      .eq('id', artistId)
      .single(),
  ])

  if (!artist) {
    redirect('/artists')
  }

  const today = new Date().toISOString().split('T')[0]

  const { data: events } = await supabase
    .from('events')
    .select('id, title, event_date, venue, is_published')
    .eq('organizer_id', user.id)
    .eq('is_published', true)
    .gte('event_date', today)
    .order('event_date', { ascending: true })

  const eligibleEvents = events || []

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
      <Link href={`/artists/${artistId}`} className="inline-flex items-center text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Artist Profile
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Book {artist.stage_name}</CardTitle>
          <CardDescription>
            We&apos;ll verify your organizer setup before opening the request flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!artist.is_available && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
              This artist is currently unavailable for new bookings.
            </div>
          )}

          {!profile?.is_organizer ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-medium text-red-700">You are not an event organizer yet.</p>
                  <p className="text-sm text-red-700/90">
                    Upgrade your profile in settings to organizer to start booking artists.
                  </p>
                  <Link href="/dashboard/settings">
                    <Button size="sm" variant="destructive">Upgrade Organizer Profile</Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : eligibleEvents.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-700 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-medium text-amber-800">You do not have a published upcoming event.</p>
                  <p className="text-sm text-amber-800/90">
                    Publish at least one upcoming event to book artists directly.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Link href="/dashboard/organizer/events/new">
                      <Button size="sm">Create Event</Button>
                    </Link>
                    <Link href="/dashboard/organizer/events">
                      <Button size="sm" variant="outline">Manage Events</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Select which published event you want to book {artist.stage_name} for.
              </p>
              {eligibleEvents.map((event) => (
                <Card key={event.id} className="border-neutral-200">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        <Calendar className="inline h-3.5 w-3.5 mr-1" />
                        {formatDate(event.event_date)}
                        {event.venue ? ` • ${event.venue}` : ''}
                      </p>
                      <Badge variant="outline" className="mt-2">Published</Badge>
                    </div>
                    <Link href={`/dashboard/organizer/events/${event.id}/book?artist=${artist.id}`}>
                      <Button disabled={!artist.is_available}>Book For This Event</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
