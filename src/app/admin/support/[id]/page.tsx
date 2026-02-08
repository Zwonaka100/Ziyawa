'use client'

/**
 * ADMIN SUPPORT TICKET DETAIL PAGE
 * /admin/support/[id]
 * 
 * View ticket details, reply to users, manage ticket status
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Send,
  User,
  Shield,
  Mail,
  Phone,
  Calendar,
  ExternalLink,
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
  assigned_to: string | null
  user?: {
    id: string
    full_name: string
    email: string
    phone: string
    avatar_url: string
    created_at: string
  }
  assigned?: {
    full_name: string
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-green-100 text-green-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  waiting: { label: 'Waiting on User', color: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: 'Resolved', color: 'bg-neutral-100 text-neutral-700' },
  closed: { label: 'Closed', color: 'bg-neutral-100 text-neutral-700' },
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

export default function AdminTicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ticketId = params.id as string
  const supabase = createClient()

  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [replies, setReplies] = useState<TicketReply[]>([])
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [currentAdmin, setCurrentAdmin] = useState<{ id: string; full_name: string } | null>(null)

  // Fetch ticket and admin info
  useEffect(() => {
    fetchData()
  }, [ticketId])

  const fetchData = async () => {
    setLoading(true)

    // Get current admin
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', user.id)
        .single()
      setCurrentAdmin(adminProfile)
    }

    // Fetch ticket with user info
    const { data: ticketData, error: ticketError } = await supabase
      .from('support_tickets')
      .select(`
        *,
        user:profiles!support_tickets_user_id_fkey(id, full_name, email, phone, avatar_url, created_at),
        assigned:profiles!support_tickets_assigned_to_fkey(full_name)
      `)
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticketData) {
      toast.error('Ticket not found')
      router.push('/admin/support')
      return
    }

    setTicket(ticketData)
    setStatus(ticketData.status)
    setPriority(ticketData.priority)

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

  // Update status
  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus)
    
    const updates: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    if (newStatus === 'resolved') {
      updates.resolved_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', ticketId)

    if (error) {
      toast.error('Failed to update status')
      return
    }

    toast.success('Status updated')
    
    // Log action
    if (currentAdmin) {
      await supabase.from('admin_audit_logs').insert({
        admin_id: currentAdmin.id,
        action: 'update',
        entity_type: 'ticket',
        entity_id: ticketId,
        details: { status: newStatus, ticket_number: ticket?.ticket_number },
      })
    }
  }

  // Update priority
  const handlePriorityChange = async (newPriority: string) => {
    setPriority(newPriority)
    
    const { error } = await supabase
      .from('support_tickets')
      .update({ priority: newPriority, updated_at: new Date().toISOString() })
      .eq('id', ticketId)

    if (error) {
      toast.error('Failed to update priority')
      return
    }

    toast.success('Priority updated')
  }

  // Assign to self
  const handleAssignToMe = async () => {
    if (!currentAdmin) return

    const { error } = await supabase
      .from('support_tickets')
      .update({ 
        assigned_to: currentAdmin.id, 
        status: status === 'open' ? 'in_progress' : status,
        updated_at: new Date().toISOString() 
      })
      .eq('id', ticketId)

    if (error) {
      toast.error('Failed to assign ticket')
      return
    }

    toast.success('Ticket assigned to you')
    fetchData()
  }

  // Submit reply
  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!replyText.trim() || !currentAdmin) {
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
          user_id: currentAdmin.id,
          message: replyText.trim(),
          is_staff: true,
        })

      if (replyError) throw replyError

      // Update ticket status to waiting on user
      await supabase
        .from('support_tickets')
        .update({ 
          status: 'waiting', 
          updated_at: new Date().toISOString(),
          assigned_to: ticket?.assigned_to || currentAdmin.id,
        })
        .eq('id', ticketId)

      toast.success('Reply sent!')
      setReplyText('')
      setStatus('waiting')
      fetchData()
    } catch (error) {
      console.error('Error sending reply:', error)
      toast.error('Failed to send reply')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!ticket) {
    return null
  }

  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.open
  const isOpen = !['resolved', 'closed'].includes(status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/support">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{ticket.subject}</h2>
              <Badge variant="outline">#{ticket.ticket_number}</Badge>
            </div>
            <p className="text-muted-foreground">
              {CATEGORY_LABELS[ticket.category]} • Created {format(new Date(ticket.created_at), 'PPP')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/communications/send?to=${ticket.user_id}`}>
            <Button variant="outline">
              <Mail className="h-4 w-4 mr-2" />
              Email User
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Conversation */}
          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Original message */}
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  {ticket.user?.avatar_url ? (
                    <img src={ticket.user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="h-5 w-5 text-purple-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{ticket.user?.full_name || 'User'}</span>
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
                    ) : reply.user?.avatar_url ? (
                      <img src={reply.user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-purple-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {reply.is_staff ? (reply.user?.full_name || 'Support Staff') : (reply.user?.full_name || 'User')}
                      </span>
                      {reply.is_staff && (
                        <Badge variant="outline" className="text-xs bg-blue-50">Staff</Badge>
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
                  <span>This ticket has been {status}.</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reply Form */}
          {isOpen && (
            <Card>
              <CardHeader>
                <CardTitle>Reply to User</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitReply} className="space-y-4">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your response to the user..."
                    rows={5}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Your reply will be sent to the user and status will change to &quot;Waiting on User&quot;
                    </p>
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="waiting">Waiting on User</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assigned To</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {ticket.assigned?.full_name || 'Unassigned'}
                  </span>
                  {!ticket.assigned_to && (
                    <Button size="sm" variant="outline" onClick={handleAssignToMe}>
                      Assign to me
                    </Button>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{format(new Date(ticket.created_at), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span>{format(new Date(ticket.updated_at), 'MMM d, yyyy')}</span>
                </div>
                {ticket.resolved_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolved</span>
                    <span>{format(new Date(ticket.resolved_at), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center">
                  {ticket.user?.avatar_url ? (
                    <img src={ticket.user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{ticket.user?.full_name || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">{ticket.user?.email}</p>
                </div>
              </div>

              {ticket.user?.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{ticket.user.phone}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Joined {format(new Date(ticket.user?.created_at || ''), 'MMM yyyy')}</span>
              </div>

              <Link href={`/admin/users/${ticket.user_id}`}>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View User Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
