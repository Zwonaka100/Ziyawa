import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/conversations/start
 * Create or retrieve existing conversation between two users
 * 
 * Body: { recipientId: string, contextType?: string, contextId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { recipientId, contextType, contextId } = await request.json()

    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 })
    }

    if (recipientId === user.id) {
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
    }

    // Check if conversation already exists between these two users
    const { data: existingConvo } = await supabase
      .from('conversations')
      .select('id')
      .or(
        `and(participant_one.eq.${user.id},participant_two.eq.${recipientId}),and(participant_one.eq.${recipientId},participant_two.eq.${user.id})`
      )
      .single()

    if (existingConvo) {
      // Return existing conversation
      return NextResponse.json({ 
        conversationId: existingConvo.id,
        isNew: false 
      })
    }

    // Create new conversation
    const now = new Date().toISOString()
    const { data: newConvo, error } = await supabase
      .from('conversations')
      .insert({
        participant_one: user.id,
        participant_two: recipientId,
        context_type: contextType || null,
        context_id: contextId || null,
        last_message_at: now,
        participant_one_last_read: now,
        participant_two_last_read: now,
        participant_one_unread: 0,
        participant_two_unread: 0,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating conversation:', error)
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    return NextResponse.json({ 
      conversationId: newConvo.id,
      isNew: true 
    })

  } catch (error) {
    console.error('Start conversation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
