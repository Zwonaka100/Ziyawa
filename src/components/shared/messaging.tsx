'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  File, 
  CheckCheck, 
  Check,
  MoreVertical,
  Search,
  ArrowLeft
} from 'lucide-react';
import { Conversation, Message, Profile } from '@/types/database';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Message bubble component
interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  senderName?: string;
  senderAvatar?: string | null;
}

export function MessageBubble({ 
  message, 
  isOwn, 
  showAvatar = true,
  senderName,
  senderAvatar 
}: MessageBubbleProps) {
  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={cn('flex gap-2', isOwn ? 'justify-end' : 'justify-start')}>
      {/* Avatar for received messages */}
      {!isOwn && showAvatar && (
        <div className="w-8 h-8 rounded-full bg-neutral-200 overflow-hidden flex-shrink-0">
          {senderAvatar ? (
            <Image src={senderAvatar} alt="" width={32} height={32} className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-500 text-xs font-medium">
              {senderName?.charAt(0) || '?'}
            </div>
          )}
        </div>
      )}

      {/* Message content */}
      <div className={cn('max-w-[70%]', isOwn ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2',
            isOwn
              ? 'bg-black text-white rounded-br-md'
              : 'bg-neutral-100 text-neutral-900 rounded-bl-md'
          )}
        >
          {/* System messages */}
          {message.message_type === 'system' && (
            <p className="text-sm italic">{message.content}</p>
          )}

          {/* Booking request messages */}
          {message.message_type === 'booking_request' && message.metadata && (
            <div className="space-y-2">
              <p className="font-medium">Booking Request</p>
              <p className="text-sm opacity-90">{message.content}</p>
              {/* Could add booking details from metadata here */}
            </div>
          )}

          {/* Regular text messages */}
          {message.message_type === 'text' && (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}

          {/* Attachment */}
          {message.attachment_url && (
            <div className="mt-2">
              {message.attachment_type === 'image' ? (
                <Image
                  src={message.attachment_url}
                  alt="Attachment"
                  width={200}
                  height={150}
                  className="rounded-lg"
                />
              ) : (
                <a
                  href={message.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg',
                    isOwn ? 'bg-white/10' : 'bg-neutral-200'
                  )}
                >
                  <File className="h-4 w-4" />
                  <span className="text-sm truncate">{message.attachment_name || 'File'}</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Time and read status */}
        <div className={cn(
          'flex items-center gap-1 mt-1 text-xs text-neutral-500',
          isOwn ? 'justify-end' : 'justify-start'
        )}>
          <span>{formatTime(message.created_at)}</span>
          {isOwn && (
            message.is_read ? (
              <CheckCheck className="h-3 w-3 text-blue-500" />
            ) : (
              <Check className="h-3 w-3" />
            )
          )}
        </div>
      </div>
    </div>
  );
}

// Conversation list item
interface ConversationWithParticipant extends Conversation {
  other_participant?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface ConversationItemProps {
  conversation: ConversationWithParticipant;
  isSelected?: boolean;
  currentUserId: string;
  onClick: () => void;
}

export function ConversationItem({ 
  conversation, 
  isSelected, 
  currentUserId,
  onClick 
}: ConversationItemProps) {
  const unreadCount = conversation.participant_one === currentUserId
    ? conversation.participant_one_unread
    : conversation.participant_two_unread;

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return d.toLocaleDateString('en-ZA', { weekday: 'short' });
    } else {
      return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 text-left hover:bg-neutral-50 transition-colors',
        isSelected && 'bg-neutral-100'
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-neutral-200 overflow-hidden">
          {conversation.other_participant?.avatar_url ? (
            <Image
              src={conversation.other_participant.avatar_url}
              alt=""
              width={48}
              height={48}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-500 font-medium">
              {conversation.other_participant?.full_name?.charAt(0) || '?'}
            </div>
          )}
        </div>
        {/* Unread indicator */}
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-black text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={cn(
            'font-medium text-neutral-900 truncate',
            unreadCount > 0 && 'font-semibold'
          )}>
            {conversation.other_participant?.full_name || 'Unknown'}
          </p>
          <span className="text-xs text-neutral-500 flex-shrink-0 ml-2">
            {formatTime(conversation.last_message_at)}
          </span>
        </div>
        <p className={cn(
          'text-sm truncate',
          unreadCount > 0 ? 'text-neutral-900 font-medium' : 'text-neutral-500'
        )}>
          {conversation.last_message_preview || 'No messages yet'}
        </p>
      </div>
    </button>
  );
}

// Message input component
interface MessageInputProps {
  onSend: (content: string, attachment?: File) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MessageInput({ onSend, placeholder = 'Type a message...', disabled }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim() || attachment) {
      onSend(message.trim(), attachment || undefined);
      setMessage('');
      setAttachment(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAttachment(file);
  };

  return (
    <div className="border-t border-neutral-200 p-4">
      {/* Attachment preview */}
      {attachment && (
        <div className="mb-2 p-2 bg-neutral-100 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            {attachment.type.startsWith('image/') ? (
              <ImageIcon className="h-4 w-4 text-neutral-500" />
            ) : (
              <File className="h-4 w-4 text-neutral-500" />
            )}
            <span className="text-sm truncate">{attachment.name}</span>
          </div>
          <button
            onClick={() => setAttachment(null)}
            className="text-neutral-500 hover:text-neutral-700"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Attachment button */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <Paperclip className="h-5 w-5 text-neutral-500" />
        </Button>

        {/* Message input */}
        <div className="flex-1">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className="bg-neutral-100 border-0"
          />
        </div>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && !attachment)}
          size="icon"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

// Empty state for no conversations
export function NoConversations() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Send className="h-8 w-8 text-neutral-400" />
        </div>
        <h3 className="font-semibold text-neutral-900 mb-1">No messages yet</h3>
        <p className="text-sm text-neutral-500">
          Start a conversation by booking an artist or service
        </p>
      </div>
    </div>
  );
}

// Chat header
interface ChatHeaderProps {
  name: string;
  avatarUrl?: string | null;
  subtitle?: string;
  onBack?: () => void;
  profileLink?: string;
}

export function ChatHeader({ name, avatarUrl, subtitle, onBack, profileLink }: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-neutral-200">
      {onBack && (
        <button onClick={onBack} className="md:hidden p-1 -ml-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}

      <div className="w-10 h-10 rounded-full bg-neutral-200 overflow-hidden">
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" width={40} height={40} className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-500 font-medium">
            {name?.charAt(0) || '?'}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {profileLink ? (
          <Link href={profileLink} className="font-medium text-neutral-900 hover:underline truncate block">
            {name}
          </Link>
        ) : (
          <p className="font-medium text-neutral-900 truncate">{name}</p>
        )}
        {subtitle && <p className="text-sm text-neutral-500 truncate">{subtitle}</p>}
      </div>

      <Button variant="ghost" size="icon">
        <MoreVertical className="h-5 w-5 text-neutral-500" />
      </Button>
    </div>
  );
}

// Unread badge for nav
interface UnreadBadgeProps {
  count: number;
  className?: string;
}

export function UnreadBadge({ count, className }: UnreadBadgeProps) {
  if (count === 0) return null;

  return (
    <span className={cn(
      'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-black text-white text-xs font-medium rounded-full',
      className
    )}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
