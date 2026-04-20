'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { Search, Lock, MessageSquare, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface Participant {
  id: string
  full_name: string | null
  avatar_url: string | null
}

interface ConversationRow {
  id: string
  context_type: string | null
  context_id: string | null
  is_closed: boolean | null
  closed_at: string | null
  closed_reason: string | null
  last_message_at: string | null
  last_message_preview: string | null
  created_at: string
  participant_one_profile: Participant | null
  participant_two_profile: Participant | null
}

interface Message {
  id: string
  sender_id: string
  content: string
  attachment_url: string | null
  created_at: string
}

const CONTEXT_LABELS: Record<string, string> = {
  booking: 'Artist Booking',
  provider_booking: 'Crew/Service Booking',
  event: 'Event',
  general: 'General',
}

export function ConversationLogsClient({ conversations }: { conversations: ConversationRow[] }) {
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [filterClosed, setFilterClosed] = useState<'all' | 'open' | 'closed'>('all')
  const [selectedConvo, setSelectedConvo] = useState<ConversationRow | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  const filtered = conversations.filter(c => {
    const nameOne = c.participant_one_profile?.full_name?.toLowerCase() ?? ''
    const nameTwo = c.participant_two_profile?.full_name?.toLowerCase() ?? ''
    const q = search.toLowerCase()
    const matchesSearch = !q || nameOne.includes(q) || nameTwo.includes(q)
    const matchesFilter =
      filterClosed === 'all' ||
      (filterClosed === 'closed' && c.is_closed) ||
      (filterClosed === 'open' && !c.is_closed)
    return matchesSearch && matchesFilter
  })

  async function openConversation(convo: ConversationRow) {
    setSelectedConvo(convo)
    setLoadingMessages(true)
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, content, attachment_url, created_at')
      .eq('conversation_id', convo.id)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])
    setLoadingMessages(false)
  }

  function getInitials(name: string | null) {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by participant name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'open', 'closed'] as const).map(f => (
            <Button
              key={f}
              size="sm"
              variant={filterClosed === f ? 'default' : 'outline'}
              onClick={() => setFilterClosed(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} conversation{filtered.length !== 1 ? 's' : ''}</p>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Participants</th>
                <th className="text-left px-4 py-3 font-medium">Context</th>
                <th className="text-left px-4 py-3 font-medium">Last message</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-muted-foreground">
                    No conversations found
                  </td>
                </tr>
              ) : (
                filtered.map(convo => (
                  <tr key={convo.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">
                          {convo.participant_one_profile?.full_name ?? 'Unknown'}
                        </span>
                        <span className="text-muted-foreground">
                          {convo.participant_two_profile?.full_name ?? 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {convo.context_type ? CONTEXT_LABELS[convo.context_type] ?? convo.context_type : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {convo.last_message_at
                        ? formatDistanceToNow(new Date(convo.last_message_at), { addSuffix: true })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {convo.is_closed ? (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="h-3 w-3" />
                          Closed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-green-700 border-green-300">
                          <MessageSquare className="h-3 w-3" />
                          Active
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openConversation(convo)}
                        className="gap-1"
                      >
                        View <ChevronRight className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Message viewer sheet */}
      <Sheet open={!!selectedConvo} onOpenChange={open => { if (!open) setSelectedConvo(null) }}>
        <SheetContent className="w-full sm:max-w-xl flex flex-col p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">
                  {selectedConvo?.participant_one_profile?.full_name ?? 'Unknown'} &amp; {selectedConvo?.participant_two_profile?.full_name ?? 'Unknown'}
                </div>
                <div className="text-xs text-muted-foreground font-normal mt-0.5">
                  {selectedConvo?.context_type ? CONTEXT_LABELS[selectedConvo.context_type] : 'Direct message'}
                  {selectedConvo?.is_closed && (
                    <span className="ml-2 inline-flex items-center gap-1 text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      Closed {selectedConvo.closed_at ? formatDistanceToNow(new Date(selectedConvo.closed_at), { addSuffix: true }) : ''}
                    </span>
                  )}
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1 p-4">
            {loadingMessages ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No messages in this conversation</p>
            ) : (
              <div className="space-y-3">
                {messages.map(msg => {
                  const senderProfile =
                    msg.sender_id === selectedConvo?.participant_one_profile?.id
                      ? selectedConvo?.participant_one_profile
                      : selectedConvo?.participant_two_profile
                  return (
                    <div key={msg.id} className="flex gap-3">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={senderProfile?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">{getInitials(senderProfile?.full_name ?? null)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-medium">{senderProfile?.full_name ?? 'Unknown'}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm mt-0.5 break-words">{msg.content}</p>
                        {msg.attachment_url && (
                          <a
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary underline mt-1 block"
                          >
                            Attachment
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          <div className="p-3 border-t bg-amber-50 text-xs text-amber-800 flex items-center gap-2">
            <Lock className="h-3 w-3 shrink-0" />
            For dispute investigation only. All access is logged.
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
