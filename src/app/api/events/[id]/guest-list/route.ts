import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function generateAccessCode() {
  return `GL-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await context.params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: event } = await supabase
      .from('events')
      .select('id, organizer_id')
      .eq('id', eventId)
      .single()

    if (!event || event.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('event_access_passes')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === 'PGRST205') {
        return NextResponse.json({ passes: [] })
      }
      throw error
    }

    return NextResponse.json({ passes: data || [] })
  } catch (error) {
    console.error('Guest list fetch error:', error)
    return NextResponse.json({ error: 'Failed to load guest list' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await context.params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: event } = await supabase
      .from('events')
      .select('id, organizer_id')
      .eq('id', eventId)
      .single()

    if (!event || event.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const body = await request.json()
    const {
      fullName,
      email,
      phone,
      passType = 'guest_list',
      quantity = 1,
      notes,
    } = body

    if (!fullName?.trim()) {
      return NextResponse.json({ error: 'Guest name is required' }, { status: 400 })
    }

    const safeQuantity = Math.min(Math.max(Number(quantity) || 1, 1), 20)

    const rows = Array.from({ length: safeQuantity }, (_, index) => ({
      event_id: eventId,
      created_by: user.id,
      full_name: safeQuantity > 1 ? `${fullName.trim()} ${index + 1}` : fullName.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      pass_type: passType,
      code: generateAccessCode(),
      notes: notes?.trim() || null,
    }))

    const { data, error } = await supabase
      .from('event_access_passes')
      .insert(rows)
      .select('*')

    if (error) throw error

    return NextResponse.json({ success: true, passes: data || [] })
  } catch (error) {
    console.error('Guest list create error:', error)
    return NextResponse.json({ error: 'Failed to create guest pass' }, { status: 500 })
  }
}
