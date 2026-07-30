import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Please sign in again to publish this event.' }, { status: 401 })
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, organizer_id, state, is_published')
      .eq('id', id)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
    }

    if (event.organizer_id !== user.id) {
      return NextResponse.json({ error: 'You do not have permission to publish this event.' }, { status: 403 })
    }

    if (event.state === 'completed' || event.state === 'cancelled') {
      return NextResponse.json({ error: `This event is ${event.state} and cannot be published.` }, { status: 400 })
    }

    if (event.state === 'locked') {
      return NextResponse.json({ error: 'This event is locked and cannot be moved back to published.' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('events')
      .update({
        state: 'published',
        is_published: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, state, is_published')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message || 'Failed to publish event.' }, { status: 400 })
    }

    if (!updated?.is_published || updated?.state !== 'published') {
      return NextResponse.json({ error: 'Publish write did not persist correctly.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, event: updated })
  } catch (error) {
    console.error('Publish event error:', error)
    return NextResponse.json({ error: 'Failed to publish event.' }, { status: 500 })
  }
}