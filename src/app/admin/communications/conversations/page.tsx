import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ConversationLogsClient } from './conversations-client'

export const metadata = {
  title: 'Conversation Logs | Admin | Ziyawa',
}

// Supabase returns joined single-FK relations as arrays; normalise them here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseConversations(rows: any[]) {
  return rows.map(row => ({
    ...row,
    participant_one_profile: Array.isArray(row.participant_one_profile)
      ? (row.participant_one_profile[0] ?? null)
      : row.participant_one_profile,
    participant_two_profile: Array.isArray(row.participant_two_profile)
      ? (row.participant_two_profile[0] ?? null)
      : row.participant_two_profile,
  }))
}

export default async function AdminConversationLogsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/signin')

  // Verify admin/super_admin access
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, admin_role')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin && profile?.admin_role !== 'super_admin') {
    redirect('/dashboard')
  }

  // Fetch all conversations with participant info using service role would bypass RLS,
  // but admin policy in migration handles this. Admin policy lets admins see all.
  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      id,
      context_type,
      context_id,
      is_closed,
      closed_at,
      closed_reason,
      last_message_at,
      last_message_preview,
      created_at,
      participant_one_profile:participant_one (id, full_name, avatar_url),
      participant_two_profile:participant_two (id, full_name, avatar_url)
    `)
    .order('last_message_at', { ascending: false })
    .limit(200)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Conversation Logs</h2>
        <p className="text-muted-foreground">
          All on-platform messages are stored permanently. Use this for dispute investigation only.
        </p>
      </div>

      <ConversationLogsClient conversations={normaliseConversations(conversations || [])} />
    </div>
  )
}
