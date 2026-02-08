'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Hook to get unread message count for current user
 * Subscribes to real-time updates
 */
export function useUnreadMessages(userId: string | undefined) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const fetchUnreadCount = async () => {
      setLoading(true);
      
      const { data: conversations } = await supabase
        .from('conversations')
        .select('participant_one, participant_two, participant_one_unread, participant_two_unread')
        .or(`participant_one.eq.${userId},participant_two.eq.${userId}`);

      if (conversations) {
        const total = conversations.reduce((acc, convo) => {
          const unread = convo.participant_one === userId 
            ? convo.participant_one_unread 
            : convo.participant_two_unread;
          return acc + (unread || 0);
        }, 0);
        setUnreadCount(total);
      }

      setLoading(false);
    };

    fetchUnreadCount();

    // Subscribe to conversation updates for real-time unread count
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant_one=eq.${userId}`,
        },
        () => fetchUnreadCount()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant_two=eq.${userId}`,
        },
        () => fetchUnreadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { unreadCount, loading };
}
