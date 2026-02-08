'use client'

/**
 * ADMIN REPORT DETAIL PAGE
 * /admin/reports/[id]
 * 
 * Full report details with resolution workflow:
 * - View reported content
 * - Review evidence
 * - Take action on reported user/content
 * - Resolve or dismiss report
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
  DialogDescription,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  User,
  Calendar,
  Star,
  ShoppingBag,
  MessageSquare,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Ban,
  Eye,
  Loader2,
  Flag,
  Clock,
  Shield,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface Report {
  id: string
  reporter_id: string
  reported_type: string
  reported_id: string
  reason: string
  description: string
  evidence_urls: string[]
  status: string
  priority: string
  admin_notes: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  reporter?: {
    id: string
    full_name: string
    email: string
    avatar_url: string
  }
  resolver?: {
    full_name: string
    email: string
  }
}

interface ReportedContent {
  type: string
  data: any
}

const TYPE_ICONS: Record<string, any> = {
  user: User,
  organizer: User,
  artist: Star,
  vendor: ShoppingBag,
  event: Calendar,
  review: MessageSquare,
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-700' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  under_review: { label: 'Under Review', color: 'bg-blue-100 text-blue-700' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
  dismissed: { label: 'Dismissed', color: 'bg-gray-100 text-gray-700' },
}

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam / Scam',
  inappropriate: 'Inappropriate Content',
  harassment: 'Harassment',
  violence: 'Violence / Threats',
  misinformation: 'Misinformation',
  fraud: 'Fraudulent Activity',
  impersonation: 'Impersonation',
  copyright: 'Copyright Violation',
  other: 'Other',
}

export default function AdminReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const reportId = params.id as string

  const [report, setReport] = useState<Report | null>(null)
  const [reportedContent, setReportedContent] = useState<ReportedContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [otherReports, setOtherReports] = useState<any[]>([])

  // Action dialog
  const [actionOpen, setActionOpen] = useState(false)
  const [actionType, setActionType] = useState<'resolve' | 'dismiss' | 'escalate' | 'action'>('resolve')
  const [adminNotes, setAdminNotes] = useState('')
  const [selectedAction, setSelectedAction] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchReport()
  }, [reportId])

  const fetchReport = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        reporter:profiles!reports_reporter_id_fkey(id, full_name, email, avatar_url),
        resolver:profiles!reports_resolved_by_fkey(full_name, email)
      `)
      .eq('id', reportId)
      .single()

    if (error) {
      toast.error('Failed to load report')
      console.error(error)
      setLoading(false)
      return
    }

    setReport(data)
    
    // Fetch reported content
    await fetchReportedContent(data.reported_type, data.reported_id)
    
    // Fetch other reports for same content
    const { data: otherData } = await supabase
      .from('reports')
      .select('id, reason, status, created_at')
      .eq('reported_type', data.reported_type)
      .eq('reported_id', data.reported_id)
      .neq('id', reportId)
      .order('created_at', { ascending: false })
      .limit(5)

    setOtherReports(otherData || [])
    setLoading(false)
  }

  const fetchReportedContent = async (type: string, id: string) => {
    let data = null

    switch (type) {
      case 'user':
      case 'organizer':
      case 'artist':
      case 'vendor':
        const { data: userData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single()
        data = userData
        break
      case 'event':
        const { data: eventData } = await supabase
          .from('events')
          .select('*, organizer:profiles!events_organizer_id_fkey(full_name, email)')
          .eq('id', id)
          .single()
        data = eventData
        break
      case 'review':
        const { data: reviewData } = await supabase
          .from('reviews')
          .select('*, user:profiles!reviews_user_id_fkey(full_name, email)')
          .eq('id', id)
          .single()
        data = reviewData
        break
    }

    setReportedContent({ type, data })
  }

  const openAction = (type: typeof actionType) => {
    setActionType(type)
    setAdminNotes(report?.admin_notes || '')
    setSelectedAction('')
    setActionOpen(true)
  }

  const handleAction = async () => {
    if (!report) return

    setProcessing(true)

    try {
      const { data: { user: admin } } = await supabase.auth.getUser()
      
      let newStatus = report.status

      if (actionType === 'resolve') {
        newStatus = 'resolved'
      } else if (actionType === 'dismiss') {
        newStatus = 'dismissed'
      } else if (actionType === 'escalate') {
        // Update priority to urgent
        await supabase
          .from('reports')
          .update({ priority: 'urgent' })
          .eq('id', reportId)
      }

      // Take action on reported content
      if (actionType === 'action' && selectedAction) {
        await takeContentAction(selectedAction)
      }

      // Update report
      const updates: Record<string, any> = {
        status: newStatus,
        admin_notes: adminNotes || null,
      }

      if (newStatus === 'resolved' || newStatus === 'dismissed') {
        updates.resolved_by = admin?.id
        updates.resolved_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('reports')
        .update(updates)
        .eq('id', reportId)

      if (error) throw error

      // Audit log
      await supabase.from('admin_audit_logs').insert({
        admin_id: admin?.id,
        action: `report_${actionType}`,
        entity_type: 'report',
        entity_id: reportId,
        details: {
          reported_type: report.reported_type,
          reported_id: report.reported_id,
          reason: report.reason,
          notes: adminNotes,
          action_taken: selectedAction,
        },
      })

      toast.success(
        actionType === 'resolve' ? 'Report resolved' :
        actionType === 'dismiss' ? 'Report dismissed' :
        actionType === 'escalate' ? 'Report escalated to urgent' :
        'Action taken successfully'
      )
      setActionOpen(false)
      fetchReport()
    } catch (error) {
      console.error('Action error:', error)
      toast.error('Failed to process action')
    } finally {
      setProcessing(false)
    }
  }

  const takeContentAction = async (action: string) => {
    if (!report || !reportedContent) return

    const { data: { user: admin } } = await supabase.auth.getUser()

    switch (action) {
      case 'warn_user':
        // Send warning notification
        await supabase.from('notifications').insert({
          user_id: report.reported_id,
          type: 'warning',
          title: 'Content Warning',
          message: `Your ${report.reported_type} has been flagged for violating our community guidelines. Please review our terms of service.`,
        })
        break

      case 'suspend_user':
        await supabase
          .from('profiles')
          .update({ status: 'suspended', suspended_at: new Date().toISOString() })
          .eq('id', report.reported_id)
        break

      case 'ban_user':
        await supabase
          .from('profiles')
          .update({ status: 'banned', banned_at: new Date().toISOString() })
          .eq('id', report.reported_id)
        break

      case 'remove_content':
        if (report.reported_type === 'event') {
          await supabase
            .from('events')
            .update({ is_published: false, state: 'removed' })
            .eq('id', report.reported_id)
        } else if (report.reported_type === 'review') {
          await supabase
            .from('reviews')
            .update({ is_visible: false })
            .eq('id', report.reported_id)
        }
        break

      case 'delete_content':
        if (report.reported_type === 'review') {
          await supabase
            .from('reviews')
            .delete()
            .eq('id', report.reported_id)
        }
        break
    }

    // Log the action
    await supabase.from('admin_audit_logs').insert({
      admin_id: admin?.id,
      action: action,
      entity_type: report.reported_type,
      entity_id: report.reported_id,
      details: { reason: `Reported for: ${report.reason}` },
    })
  }

  const markUnderReview = async () => {
    if (!report || report.status !== 'pending') return

    const { data: { user: admin } } = await supabase.auth.getUser()

    await supabase
      .from('reports')
      .update({ status: 'under_review' })
      .eq('id', reportId)

    await supabase.from('admin_audit_logs').insert({
      admin_id: admin?.id,
      action: 'report_review_started',
      entity_type: 'report',
      entity_id: reportId,
    })

    toast.success('Report marked as under review')
    fetchReport()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Report not found</p>
        <Link href="/admin/reports">
          <Button variant="outline" className="mt-4">Back to Reports</Button>
        </Link>
      </div>
    )
  }

  const TypeIcon = TYPE_ICONS[report.reported_type] || Flag
  const priorityConfig = PRIORITY_CONFIG[report.priority] || PRIORITY_CONFIG.medium
  const statusConfig = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/reports">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">Report #{reportId.slice(0, 8)}</h2>
              <Badge className={priorityConfig.color}>{priorityConfig.label}</Badge>
              <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
            </div>
            <p className="text-muted-foreground">
              Reported {formatDistanceToNow(new Date(report.created_at))} ago
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {report.status !== 'resolved' && report.status !== 'dismissed' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {report.status === 'pending' && (
                <Button onClick={markUnderReview} variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Mark Under Review
                </Button>
              )}
              <Button onClick={() => openAction('action')} variant="outline">
                <Ban className="h-4 w-4 mr-2" />
                Take Action
              </Button>
              <Button onClick={() => openAction('resolve')} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Resolve
              </Button>
              <Button onClick={() => openAction('dismiss')} variant="outline">
                <XCircle className="h-4 w-4 mr-2" />
                Dismiss
              </Button>
              {report.priority !== 'urgent' && (
                <Button onClick={() => openAction('escalate')} variant="outline" className="text-red-600 border-red-300">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Escalate
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-red-500" />
                Report Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Reason</Label>
                <p className="font-medium">{REASON_LABELS[report.reason] || report.reason}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="whitespace-pre-wrap">{report.description || 'No additional description provided'}</p>
              </div>
              {report.evidence_urls && report.evidence_urls.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Evidence</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {report.evidence_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={`Evidence ${i + 1}`} className="rounded-lg border max-h-40 object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reported Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TypeIcon className="h-5 w-5" />
                Reported {report.reported_type.charAt(0).toUpperCase() + report.reported_type.slice(1)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportedContent?.data ? (
                <div className="space-y-4">
                  {(report.reported_type === 'user' || report.reported_type === 'organizer' || report.reported_type === 'artist' || report.reported_type === 'vendor') && (
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden">
                        {reportedContent.data.avatar_url ? (
                          <Image
                            src={reportedContent.data.avatar_url}
                            alt=""
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{reportedContent.data.full_name}</h3>
                        <p className="text-muted-foreground text-sm">{reportedContent.data.email}</p>
                        <p className="text-sm mt-1">
                          <Badge variant="outline">{reportedContent.data.role || 'User'}</Badge>
                          <Badge variant="outline" className="ml-2">{reportedContent.data.status || 'Active'}</Badge>
                        </p>
                        <div className="mt-3">
                          <Link href={`/admin/users/${reportedContent.data.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View Profile
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {report.reported_type === 'event' && (
                    <div>
                      <h3 className="font-semibold text-lg">{reportedContent.data.title}</h3>
                      <p className="text-muted-foreground text-sm">
                        by {reportedContent.data.organizer?.full_name}
                      </p>
                      <p className="text-sm mt-2">{reportedContent.data.description?.slice(0, 200)}...</p>
                      <div className="mt-3 flex gap-2">
                        <Link href={`/admin/events/${reportedContent.data.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Event
                          </Button>
                        </Link>
                        <Link href={`/events/${reportedContent.data.id}`} target="_blank">
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Public Page
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}

                  {report.reported_type === 'review' && (
                    <div className="p-4 rounded-lg bg-neutral-50">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= reportedContent.data.rating
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          by {reportedContent.data.user?.full_name}
                        </span>
                      </div>
                      <p className="text-sm">{reportedContent.data.content}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Content not found or has been removed</p>
              )}
            </CardContent>
          </Card>

          {/* Admin Notes */}
          {report.admin_notes && (
            <Card>
              <CardHeader>
                <CardTitle>Admin Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{report.admin_notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Reporter Info */}
          <Card>
            <CardHeader>
              <CardTitle>Reporter</CardTitle>
            </CardHeader>
            <CardContent>
              {report.reporter ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden">
                    {report.reporter.avatar_url ? (
                      <Image
                        src={report.reporter.avatar_url}
                        alt=""
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <Link href={`/admin/users/${report.reporter.id}`} className="font-medium hover:underline">
                      {report.reporter.full_name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{report.reporter.email}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Anonymous</p>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Flag className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Report Submitted</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(report.created_at), 'PPp')}
                  </p>
                </div>
              </div>
              
              {report.status !== 'pending' && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Eye className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Under Review</p>
                    <p className="text-xs text-muted-foreground">Started review</p>
                  </div>
                </div>
              )}

              {report.resolved_at && (
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    report.status === 'resolved' ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {report.status === 'resolved' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {report.status === 'resolved' ? 'Resolved' : 'Dismissed'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(report.resolved_at), 'PPp')}
                    </p>
                    {report.resolver && (
                      <p className="text-xs text-muted-foreground">
                        by {report.resolver.full_name}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Other Reports */}
          {otherReports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Other Reports ({otherReports.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {otherReports.map((r) => (
                  <Link key={r.id} href={`/admin/reports/${r.id}`}>
                    <div className="p-2 rounded hover:bg-neutral-50 transition-colors">
                      <p className="text-sm font-medium">{REASON_LABELS[r.reason] || r.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(r.created_at))} ago • {r.status}
                      </p>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'resolve' && 'Resolve Report'}
              {actionType === 'dismiss' && 'Dismiss Report'}
              {actionType === 'escalate' && 'Escalate Report'}
              {actionType === 'action' && 'Take Action'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'resolve' && 'Mark this report as resolved after taking appropriate action.'}
              {actionType === 'dismiss' && 'Dismiss this report if it does not violate our guidelines.'}
              {actionType === 'escalate' && 'Escalate this report to urgent priority.'}
              {actionType === 'action' && 'Take action against the reported content or user.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {actionType === 'action' && (
              <div className="space-y-2">
                <Label>Select Action</Label>
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an action..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warn_user">Warn User</SelectItem>
                    <SelectItem value="suspend_user">Suspend User</SelectItem>
                    <SelectItem value="ban_user">Ban User</SelectItem>
                    {(report.reported_type === 'event' || report.reported_type === 'review') && (
                      <>
                        <SelectItem value="remove_content">Remove Content</SelectItem>
                        <SelectItem value="delete_content">Delete Content</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Admin Notes</Label>
              <Textarea
                id="notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this action..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setActionOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={processing || (actionType === 'action' && !selectedAction)}
                variant={actionType === 'dismiss' ? 'outline' : 'default'}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {actionType === 'resolve' && <CheckCircle className="h-4 w-4 mr-2" />}
                    {actionType === 'dismiss' && <XCircle className="h-4 w-4 mr-2" />}
                    {actionType === 'escalate' && <AlertTriangle className="h-4 w-4 mr-2" />}
                    {actionType === 'action' && <Ban className="h-4 w-4 mr-2" />}
                    {actionType === 'resolve' && 'Resolve Report'}
                    {actionType === 'dismiss' && 'Dismiss Report'}
                    {actionType === 'escalate' && 'Escalate to Urgent'}
                    {actionType === 'action' && 'Take Action'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
