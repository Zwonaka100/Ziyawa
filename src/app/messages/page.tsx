import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessagesPageClient } from './messages-client';

export const metadata = {
  title: 'Messages | Ziyawa',
  description: 'Your conversations on Ziyawa',
};

export default async function MessagesPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/signin?redirect=/messages');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, is_organizer, is_artist, is_provider')
    .eq('id', user.id)
    .single();

  const canUseMessaging = Boolean(
    profile?.is_admin || profile?.is_organizer || profile?.is_artist || profile?.is_provider
  );

  if (!canUseMessaging) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Messaging is for organisers, artists, and providers</CardTitle>
            <CardDescription>
              Groovists can contact an organiser directly from their purchased tickets.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/dashboard/tickets">
              <Button>Go to My Tickets</Button>
            </Link>
            <Link href="/ziwaphi">
              <Button variant="outline">Browse Events</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
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
