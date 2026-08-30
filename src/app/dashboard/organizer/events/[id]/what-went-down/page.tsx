import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { ArrowLeft } from 'lucide-react'
import { WhatWentDownClient } from './what-went-down-client'

interface WhatWentDownPageProps {
  params: Promise<{ id: string }>
}

export default async function WhatWentDownPage({ params }: WhatWentDownPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  const { data: event } = await supabase
    .from('events')
    .select('id, title, organizer_id, event_date, state')
    .eq('id', id)
    .single()

  if (!event) notFound()
  if (event.organizer_id !== user.id) redirect('/dashboard/organizer')

  const today = new Date().toISOString().slice(0, 10)
  const isPastEvent = event.event_date < today || event.state === 'completed'

  if (!isPastEvent) {
    redirect(`/dashboard/organizer/events/${id}/manage`)
  }

  const WHAT_WENT_DOWN_TAG = '[[WWD]]'
  const { data: recapMedia } = await supabase
    .from('event_media')
    .select('*')
    .eq('event_id', id)
    .ilike('description', `%${WHAT_WENT_DOWN_TAG}%`)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-neutral-50">
      <DashboardHeader title="What Went Down" subtitle={event.title} />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href={`/dashboard/organizer/events/${id}/manage`}
          className="inline-flex items-center text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Event Manage
        </Link>

        <WhatWentDownClient
          eventId={event.id}
          eventTitle={event.title}
          initialItems={recapMedia || []}
        />
      </main>
    </div>
  )
}
