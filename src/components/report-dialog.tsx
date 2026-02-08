'use client'

/**
 * REPORT DIALOG COMPONENT
 * 
 * Reusable component for reporting content (users, events, reviews, etc.)
 * Usage: <ReportDialog type="user" targetId={userId} />
 */

import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Flag, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

type ReportType = 'user' | 'organizer' | 'artist' | 'vendor' | 'event' | 'review'

interface ReportDialogProps {
  type: ReportType
  targetId: string
  targetName?: string
  trigger?: React.ReactNode
  onSuccess?: () => void
}

const REPORT_REASONS: Record<ReportType, { value: string; label: string }[]> = {
  user: [
    { value: 'harassment', label: 'Harassment or bullying' },
    { value: 'spam', label: 'Spam or scam' },
    { value: 'impersonation', label: 'Impersonation' },
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'fraud', label: 'Fraudulent activity' },
    { value: 'other', label: 'Other' },
  ],
  organizer: [
    { value: 'scam', label: 'Scam or fraudulent event' },
    { value: 'no_show', label: 'Event did not happen' },
    { value: 'misleading', label: 'Misleading information' },
    { value: 'unprofessional', label: 'Unprofessional behavior' },
    { value: 'refund', label: 'Refund not provided' },
    { value: 'other', label: 'Other' },
  ],
  artist: [
    { value: 'no_show', label: 'Did not perform' },
    { value: 'unprofessional', label: 'Unprofessional behavior' },
    { value: 'misleading', label: 'Misleading profile' },
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'other', label: 'Other' },
  ],
  vendor: [
    { value: 'no_show', label: 'Did not provide service' },
    { value: 'poor_service', label: 'Poor quality service' },
    { value: 'unprofessional', label: 'Unprofessional behavior' },
    { value: 'overcharging', label: 'Overcharging' },
    { value: 'other', label: 'Other' },
  ],
  event: [
    { value: 'scam', label: 'Scam or fake event' },
    { value: 'misleading', label: 'Misleading information' },
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'safety', label: 'Safety concerns' },
    { value: 'cancelled', label: 'Event cancelled without notice' },
    { value: 'other', label: 'Other' },
  ],
  review: [
    { value: 'fake', label: 'Fake or paid review' },
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Harassment or hate speech' },
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'irrelevant', label: 'Irrelevant to event' },
    { value: 'other', label: 'Other' },
  ],
}

const TYPE_LABELS: Record<ReportType, string> = {
  user: 'User',
  organizer: 'Organizer',
  artist: 'Artist',
  vendor: 'Service Provider',
  event: 'Event',
  review: 'Review',
}

export function ReportDialog({ type, targetId, targetName, trigger, onSuccess }: ReportDialogProps) {
  const { user } = useAuth()
  const supabase = createClient()
  
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error('Please sign in to submit a report')
      return
    }

    if (!reason) {
      toast.error('Please select a reason')
      return
    }

    if (!description.trim()) {
      toast.error('Please provide details about your report')
      return
    }

    setSubmitting(true)

    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: user.id,
          reported_type: type,
          reported_id: targetId,
          reason: reason,
          description: description.trim(),
          status: 'pending',
          priority: 'medium',
        })

      if (error) throw error

      toast.success('Report submitted. Our team will review it shortly.')
      setOpen(false)
      setReason('')
      setDescription('')
      onSuccess?.()
    } catch (error) {
      console.error('Error submitting report:', error)
      toast.error('Failed to submit report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const reasons = REPORT_REASONS[type] || REPORT_REASONS.user

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-600">
            <Flag className="h-4 w-4 mr-1" />
            Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Report {TYPE_LABELS[type]}
          </DialogTitle>
          <DialogDescription>
            {targetName ? (
              <>Report &quot;{targetName}&quot; to our moderation team.</>
            ) : (
              <>Let us know what&apos;s wrong and we&apos;ll look into it.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for report *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Please provide details *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail. Include any relevant information that will help us investigate."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Be specific - include dates, screenshots if possible, and any other evidence.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> False reports may result in action against your account. 
              Only submit reports for genuine violations.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Flag className="h-4 w-4 mr-2" />
                  Submit Report
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
