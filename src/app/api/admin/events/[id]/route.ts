import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const OPTIONAL_EVENT_COLUMNS = [
  'address',
  'cover_image',
  'is_approved',
  'updated_at',
] as const


function toOptionalString(value: unknown) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text.length > 0 ? text : null
}

function normalizeEventDate(value: string) {
  return value.includes('/') ? value.replace(/\//g, '-') : value
}

async function updateEventWithFallback(eventId: string, updates: Record<string, unknown>) {
  const tryUpdate = async (payload: Record<string, unknown>) => {
    const { error } = await supabaseAdmin
      .from('events')
      .update(payload)
      .eq('id', eventId)
    return error
  }

  let payload = { ...updates }
  let error = await tryUpdate(payload)

  if (!error) {
    return { error: null, payload }
  }

  for (const column of OPTIONAL_EVENT_COLUMNS) {
    if (!(column in payload)) continue

    const message = String(error.message || '')
    if (!message.toLowerCase().includes(column.toLowerCase())) continue

    const { [column]: _, ...nextPayload } = payload
    payload = nextPayload
    error = await tryUpdate(payload)

    if (!error) {
      return { error: null, payload }
    }
  }

  return { error, payload }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const gate = await requireAdminApi()
    if ('response' in gate) return gate.response
    const user = { id: gate.admin.userId }

    const body = await request.json().catch(() => ({})) as {
      adminAction?: 'approve' | 'reject' | 'suspend' | 'lock'
      notes?: string
      title?: string
      description?: string
      venue?: string
      location?: string
      address?: string
      event_date?: string
      start_time?: string
      end_time?: string
      cover_image?: string | null
      ticket_price?: number
      capacity?: number
    }

    const now = new Date().toISOString()
    const updates: Record<string, unknown> = { updated_at: now }

    if (body.adminAction) {
      if (body.adminAction === 'approve') {
        updates.state = 'published'
        updates.is_approved = true
        updates.is_published = true
      } else if (body.adminAction === 'reject') {
        updates.state = 'draft'
        updates.is_approved = false
        updates.is_published = false
      } else if (body.adminAction === 'suspend' || body.adminAction === 'lock') {
        updates.state = 'locked'
        updates.is_published = false
      }
    } else {
      if (body.title !== undefined) updates.title = String(body.title).trim()
      if (body.description !== undefined) updates.description = String(body.description).trim()
      if (body.venue !== undefined) updates.venue = String(body.venue).trim()
      if (body.location !== undefined) updates.location = String(body.location).trim()
      if (body.address !== undefined) updates.address = String(body.address).trim()
      if (body.event_date !== undefined) updates.event_date = normalizeEventDate(String(body.event_date))
      if (body.start_time !== undefined) updates.start_time = String(body.start_time)
      if (body.end_time !== undefined) updates.end_time = String(body.end_time)
      if (body.cover_image !== undefined) updates.cover_image = toOptionalString(body.cover_image)
      if (body.ticket_price !== undefined) updates.ticket_price = Number(body.ticket_price || 0)
      if (body.capacity !== undefined) updates.capacity = Math.max(1, Number(body.capacity || 1))
    }

    const { error } = await updateEventWithFallback(eventId, updates)

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to update event' }, { status: 500 })
    }

    await supabaseAdmin.from('admin_audit_logs').insert({
      admin_id: user.id,
      action: body.adminAction ? `admin_event_${body.adminAction}` : 'admin_event_update',
      action_type: 'event_edit',
      target_type: 'event',
      target_id: eventId,
      details: {
        adminAction: body.adminAction || null,
        notes: body.notes || null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin event PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}
