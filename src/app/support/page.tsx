'use client'

/**
 * USER SUPPORT PAGE
 * /support
 * 
 * Users can view their tickets and submit new support requests
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  HelpCircle,
  CreditCard,
  Calendar,
  Settings,
  Shield,
  RefreshCw,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface SupportTicket {
  id: string
  ticket_number: string
  subject: string
  category: string
  priority: string
  status: string
  created_at: string
  updated_at: string
  message?: string
}

const CATEGORIES = [
  { value: 'general', label: 'General Inquiry', icon: HelpCircle },
  { value: 'payment', label: 'Payment Issue', icon: CreditCard },
  { value: 'event', label: 'Event Related', icon: Calendar },
  { value: 'technical', label: 'Technical Problem', icon: Settings },
  { value: 'report', label: 'Report Issue', icon: Shield },
  { value: 'refund', label: 'Refund Request', icon: RefreshCw },
  { value: 'account', label: 'Account Help', icon: User },
  { value: 'other', label: 'Other', icon: MessageSquare },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: 'Open', color: 'bg-green-100 text-green-700', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Clock },
  waiting: { label: 'Awaiting Reply', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  resolved: { label: 'Resolved', color: 'bg-neutral-100 text-neutral-700', icon: CheckCircle },
  closed: { label: 'Closed', color: 'bg-neutral-100 text-neutral-700', icon: CheckCircle },
}

export default function SupportPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    subject: '',
    category: '',
    priority: 'medium',
    message: '',
  })

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirect=/support')
    }
  }, [user, authLoading, router])

  // Fetch user's tickets
  useEffect(() => {
    if (user) {
      fetchTickets()
    }
  }, [user])

  const fetchTickets = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setTickets(data)
    }
    setLoading(false)
  }

  // Generate ticket number
  const generateTicketNumber = () => {
    const prefix = 'ZYW'
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `${prefix}-${timestamp}-${random}`
  }

  // Submit new ticket
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.subject || !formData.category || !formData.message) {
      toast.error('Please fill in all required fields')
      return
    }

    setSubmitting(true)

    try {
      const ticketNumber = generateTicketNumber()
      
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          ticket_number: ticketNumber,
          user_id: user?.id,
          subject: formData.subject,
          category: formData.category,
          priority: formData.priority,
          message: formData.message,
          status: 'open',
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Support ticket submitted successfully!')
      setDialogOpen(false)
      setFormData({ subject: '', category: '', priority: 'medium', message: '' })
      fetchTickets()
    } catch (error) {
      console.error('Error submitting ticket:', error)
      toast.error('Failed to submit ticket. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const openTickets = tickets.filter(t => ['open', 'in_progress', 'waiting'].includes(t.status))
  const resolvedTickets = tickets.filter(t => ['resolved', 'closed'].includes(t.status))

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container max-w-5xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Help & Support</h1>
            <p className="text-muted-foreground">Get help with your Ziyawa account</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Submit Support Request</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2">
                            <cat.icon className="h-4 w-4" />
                            {cat.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Brief description of your issue"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - General question</SelectItem>
                      <SelectItem value="medium">Medium - Need help soon</SelectItem>
                      <SelectItem value="high">High - Urgent issue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Please describe your issue in detail..."
                    rows={5}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Ticket'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Quick Help Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-blue-100">
                  <HelpCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">FAQ</h3>
                  <p className="text-sm text-muted-foreground">
                    Find answers to common questions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-green-100">
                  <MessageSquare className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Email Us</h3>
                  <p className="text-sm text-muted-foreground">
                    support@ziyawa.co.za
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Response Time</h3>
                  <p className="text-sm text-muted-foreground">
                    Usually within 24 hours
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Tickets */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-green-600" />
                Active Tickets ({openTickets.length})
              </CardTitle>
              <CardDescription>Your open support requests</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : openTickets.length > 0 ? (
                <div className="space-y-3">
                  {openTickets.map((ticket) => {
                    const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open
                    const category = CATEGORIES.find(c => c.value === ticket.category)
                    const CategoryIcon = category?.icon || MessageSquare

                    return (
                      <Link
                        key={ticket.id}
                        href={`/support/${ticket.id}`}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-neutral-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-neutral-100">
                            <CategoryIcon className="h-5 w-5 text-neutral-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{ticket.subject}</span>
                              <Badge variant="outline" className="text-xs">
                                #{ticket.ticket_number}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {category?.label} • {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={statusConfig.color}>
                            {statusConfig.label}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No active tickets</p>
                  <p className="text-sm">Create a new ticket if you need help</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resolved Tickets */}
          {resolvedTickets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-neutral-500" />
                  Resolved ({resolvedTickets.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {resolvedTickets.slice(0, 5).map((ticket) => {
                    const category = CATEGORIES.find(c => c.value === ticket.category)

                    return (
                      <Link
                        key={ticket.id}
                        href={`/support/${ticket.id}`}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-neutral-50 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-muted-foreground">{ticket.subject}</span>
                            <Badge variant="outline" className="text-xs">
                              #{ticket.ticket_number}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {category?.label} • Closed {format(new Date(ticket.updated_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
