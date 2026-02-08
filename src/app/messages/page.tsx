import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MessagesPageClient } from './messages-client';

export const metadata = {
  title: 'Messages | Ziyawa',
  description: 'Your conversations on Ziyawa',
};

export default async function MessagesPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login?redirect=/messages');
  }

  // Fetch conversations with participant info
  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      *,
      participant_one_profile:participant_one (
        id,
        full_name,
        avatar_url
      ),
      participant_two_profile:participant_two (
        id,
        full_name,
        avatar_url
      )
    `)
    .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
    .order('last_message_at', { ascending: false });

  // Transform to add other_participant
  const transformedConversations = (conversations || []).map(convo => {
    const isParticipantOne = convo.participant_one === user.id;
    return {
      ...convo,
      other_participant: isParticipantOne 
        ? convo.participant_two_profile 
        : convo.participant_one_profile,
    };
  });

  // Calculate total unread
  const totalUnread = transformedConversations.reduce((acc, convo) => {
    const unread = convo.participant_one === user.id 
      ? convo.participant_one_unread 
      : convo.participant_two_unread;
    return acc + (unread || 0);
  }, 0);

  return (
    <MessagesPageClient 
      conversations={transformedConversations}
      currentUserId={user.id}
      totalUnread={totalUnread}
    />
  );
}
