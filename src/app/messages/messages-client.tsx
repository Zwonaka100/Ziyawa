'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  ConversationItem, 
  MessageBubble, 
  MessageInput, 
  NoConversations, 
  ChatHeader 
} from '@/components/shared/messaging';
import type { Conversation, Message } from '@/types/database';

interface ConversationWithParticipant extends Conversation {
  other_participant?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface MessagesPageClientProps {
  conversations: ConversationWithParticipant[];
  currentUserId: string;
  totalUnread: number;
}

export function MessagesPageClient({ 
  conversations: initialConversations, 
  currentUserId,
  totalUnread 
}: MessagesPageClientProps) {
  const searchParams = useSearchParams();
  const chatParam = searchParams.get('chat');
  
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(chatParam);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const selectedConvo = conversations.find(c => c.id === selectedConvoId);

  // Handle chat query param change
  useEffect(() => {
    if (chatParam && chatParam !== selectedConvoId) {
      setSelectedConvoId(chatParam);
    }
  }, [chatParam]);

  // Filter conversations by search
  const filteredConversations = conversations.filter(convo => 
    convo.other_participant?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Load messages when conversation is selected
  useEffect(() => {
    if (!selectedConvoId) return;

    const loadMessages = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConvoId)
        .order('created_at', { ascending: true });
      
      setMessages(data || []);
      setLoading(false);

      // Mark as read
      await supabase.rpc('mark_conversation_read', { convo_id: selectedConvoId });
      
      // Update local state
      setConversations(prev => prev.map(c => {
        if (c.id !== selectedConvoId) return c;
        return {
          ...c,
          participant_one_unread: c.participant_one === currentUserId ? 0 : c.participant_one_unread,
          participant_two_unread: c.participant_two === currentUserId ? 0 : c.participant_two_unread,
        };
      }));
    };

    loadMessages();
  }, [selectedConvoId, currentUserId, supabase]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to new messages
  useEffect(() => {
    if (!selectedConvoId) return;

    const channel = supabase
      .channel(`messages:${selectedConvoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConvoId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConvoId, supabase]);

  // Send message
  const handleSendMessage = async (content: string, attachment?: File) => {
    if (!selectedConvoId || !content.trim()) return;

    let attachmentUrl: string | undefined;
    let attachmentType: string | undefined;
    let attachmentName: string | undefined;

    // Upload attachment if provided
    if (attachment) {
      const fileExt = attachment.name.split('.').pop();
      const filePath = `${currentUserId}/${selectedConvoId}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('message-attachments')
        .upload(filePath, attachment);

      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(filePath);
        
        attachmentUrl = publicUrl;
        attachmentType = attachment.type.startsWith('image/') ? 'image' : 'document';
        attachmentName = attachment.name;
      }
    }

    // Insert message
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: selectedConvoId,
        sender_id: currentUserId,
        content,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
        attachment_name: attachmentName,
      });

    if (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="h-screen flex bg-white">
      {/* Conversations List */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-neutral-200 flex flex-col ${selectedConvoId ? 'hidden md:flex' : ''}`}>
        {/* Header */}
        <div className="p-4 border-b border-neutral-200">
          <h1 className="text-xl font-bold text-neutral-900 mb-4">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-neutral-100 border-0"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((convo) => (
              <ConversationItem
                key={convo.id}
                conversation={convo}
                isSelected={convo.id === selectedConvoId}
                currentUserId={currentUserId}
                onClick={() => setSelectedConvoId(convo.id)}
              />
            ))
          ) : (
            <NoConversations />
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${!selectedConvoId ? 'hidden md:flex' : ''}`}>
        {selectedConvo ? (
          <>
            {/* Chat Header */}
            <ChatHeader
              name={selectedConvo.other_participant?.full_name || 'Unknown'}
              avatarUrl={selectedConvo.other_participant?.avatar_url}
              onBack={() => setSelectedConvoId(null)}
            />

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
                </div>
              ) : messages.length > 0 ? (
                messages.map((message, index) => {
                  const isOwn = message.sender_id === currentUserId;
                  const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;
                  
                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={isOwn}
                      showAvatar={showAvatar}
                      senderName={isOwn ? 'You' : selectedConvo.other_participant?.full_name || 'Unknown'}
                      senderAvatar={isOwn ? undefined : selectedConvo.other_participant?.avatar_url}
                    />
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-full text-neutral-500">
                  No messages yet. Start the conversation!
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <MessageInput onSend={handleSendMessage} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-neutral-500">
              <p className="text-lg font-medium mb-1">Select a conversation</p>
              <p className="text-sm">Choose from your existing conversations</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
