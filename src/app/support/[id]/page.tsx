'use client'

/**
 * USER SUPPORT TICKET DETAIL PAGE
 * /support/[id]
 * 
 * View ticket details and reply thread
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Send,
  MessageSquare,
  User,
  Shield,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface TicketReply {
  id: string
  ticket_id: string
  user_id: string
  message: string
  is_staff: boolean
  created_at: string
  user?: {
    full_name: string
    avatar_url: string
  }
}

interface SupportTicket {
  id: string
  ticket_number: string
  user_id: string
  subject: string
  category: string
  priority: string
  status: string
  message: string
  created_at: string
  updated_at: string
  resolved_at: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: 'Open', color: 'bg-green-100 text-green-700', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Clock },
  waiting: { label: 'Awaiting Your Reply', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  resolved: { label: 'Resolved', color: 'bg-neutral-100 text-neutral-700', icon: CheckCircle },
  closed: { label: 'Closed', color: 'bg-neutral-100 text-neutral-700', icon: CheckCircle },
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-neutral-100 text-neutral-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General Inquiry',
  payment: 'Payment Issue',
  event: 'Event Related',
  technical: 'Technical Problem',
  report: 'Report Issue',
  refund: 'Refund Request',
  account: 'Account Help',
  other: 'Other',
}

export default function UserTicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const ticketId = params.id as string
  const supabase = createClient()

  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [replies, setReplies] = useState<TicketReply[]>([])
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirect=/support')
    }
  }, [user, authLoading, router])

  // Fetch ticket and replies
  useEffect(() => {
    if (user && ticketId) {
      fetchTicket()
    }
  }, [user, ticketId])

  const fetchTicket = async () => {
    setLoading(true)

    // Fetch ticket
    const { data: ticketData, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .eq('user_id', user?.id) // Ensure user owns this ticket
      .single()

    if (ticketError || !ticketData) {
      toast.error('Ticket not found')
      router.push('/support')
      return
    }

    setTicket(ticketData)

    // Fetch replies
    const { data: repliesData } = await supabase
      .from('ticket_replies')
      .select(`
        *,
        user:profiles(full_name, avatar_url)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    setReplies(repliesData || [])
    setLoading(false)
  }

  // Submit reply
  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!replyText.trim()) {
      toast.error('Please enter a message')
      return
    }

    setSubmitting(true)

    try {
      // Insert reply
      const { error: replyError } = await supabase
        .from('ticket_replies')
        .insert({
          ticket_id: ticketId,
          user_id: user?.id,
          message: replyText.trim(),
          is_staff: false,
        })

      if (replyError) throw replyError

      // Update ticket status to in_progress if it was waiting
      if (ticket?.status === 'waiting') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', ticketId)
      }

      toast.success('Reply sent!')
      setReplyText('')
      fetchTicket()
    } catch (error) {
      console.error('Error sending reply:', error)
      toast.error('Failed to send reply')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!ticket) {
    return null
  }

  const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open
  const StatusIcon = statusConfig.icon
  const isOpen = !['resolved', 'closed'].includes(ticket.status)

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-6">
          <Link href="/support">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Support
            </Button>
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{ticket.subject}</h1>
                <Badge variant="outline">#{ticket.ticket_number}</Badge>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{CATEGORY_LABELS[ticket.category] || ticket.category}</span>
                <span>•</span>
                <span>Created {format(new Date(ticket.created_at), 'MMM d, yyyy \'at\' h:mm a')}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={PRIORITY_COLORS[ticket.priority]}>
                {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
              </Badge>
              <Badge className={statusConfig.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Conversation */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Conversation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Original message */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">You</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(ticket.created_at), 'MMM d, yyyy \'at\' h:mm a')}
                  </span>
                </div>
                <div className="p-4 rounded-lg bg-purple-50 text-sm whitespace-pre-wrap">
                  {ticket.message}
                </div>
              </div>
            </div>

            {/* Replies */}
            {replies.map((reply) => (
              <div key={reply.id} className="flex gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  reply.is_staff ? 'bg-blue-100' : 'bg-purple-100'
                }`}>
                  {reply.is_staff ? (
                    <Shield className="h-5 w-5 text-blue-600" />
                  ) : (
                    <User className="h-5 w-5 text-purple-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">
                      {reply.is_staff ? 'Ziyawa Support' : reply.user?.full_name || 'You'}
                    </span>
                    {reply.is_staff && (
                      <Badge variant="outline" className="text-xs">Staff</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(reply.created_at), 'MMM d, yyyy \'at\' h:mm a')}
                    </span>
                  </div>
                  <div className={`p-4 rounded-lg text-sm whitespace-pre-wrap ${
                    reply.is_staff ? 'bg-blue-50' : 'bg-purple-50'
                  }`}>
                    {reply.message}
                  </div>
                </div>
              </div>
            ))}

            {/* Resolved message */}
            {!isOpen && (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span>This ticket has been {ticket.status}.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reply Form */}
        {isOpen && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reply</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitReply} className="space-y-4">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  rows={4}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={submitting || !replyText.trim()}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Reply
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
