/**
 * Support ticket detail for admin, shared by the API route and the server page.
 *
 * Note on replies: ticket_replies has no foreign keys at all, so the page's
 * `user:profiles(...)` embed had nothing for PostgREST to resolve. There are no
 * replies on the platform yet, so nothing has visibly broken — but the first
 * one posted would have vanished from this page. The author is attached from a
 * separate narrow read instead, which does not depend on a constraint existing.
 */

import { createAdminServiceClient } from '@/lib/admin-auth'

export interface SupportTicketDetail {
  ticket: Record<string, unknown> | null
  replies: Record<string, unknown>[]
}

export async function loadSupportTicket(ticketId: string): Promise<SupportTicketDetail> {
  const supabaseAdmin = createAdminServiceClient()

  // Neither needs the other's result.
  const [ticketResult, repliesResult] = await Promise.all([
    supabaseAdmin
      .from('support_tickets')
      .select(`
        *,
        user:profiles!support_tickets_user_id_fkey(id, full_name, email, phone, avatar_url, created_at),
        assigned:profiles!support_tickets_assigned_to_fkey(full_name)
      `)
      .eq('id', ticketId)
      .maybeSingle(),
    supabaseAdmin
      .from('ticket_replies')
      .select('id, ticket_id, user_id, message, is_admin_reply, attachments, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true }),
  ])

  if (ticketResult.error) throw new Error('Failed to load ticket')
  if (repliesResult.error) console.error('Failed to load replies:', repliesResult.error)

  const replies = repliesResult.data || []

  // Attach reply authors without relying on a relationship that isn't declared.
  const authorIds = [...new Set(replies.map((r) => r.user_id).filter(Boolean))]
  let authorsById = new Map<string, { full_name: string | null; avatar_url: string | null }>()

  if (authorIds.length > 0) {
    const { data: authors } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', authorIds)
    authorsById = new Map((authors || []).map((a) => [a.id, a]))
  }

  return {
    ticket: ticketResult.data as Record<string, unknown> | null,
    replies: replies.map((r) => ({ ...r, user: authorsById.get(r.user_id) ?? null })),
  }
}
