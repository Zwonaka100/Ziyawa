'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Send, Loader2, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function BulkEmailPage() {
  const router = useRouter()
  const [sending, setSending] = useState(false)
  const [recipientCount, setRecipientCount] = useState(0)
  
  const [formData, setFormData] = useState({
    subject: '',
    body: '',
    audience: 'all', // all, organizers, artists, vendors
    testMode: true, // Send to admin first to test
  })

  useEffect(() => {
    fetchRecipientCount()
  }, [formData.audience])

  const fetchRecipientCount = async () => {
    const supabase = createClient()
    
    let query = supabase.from('profiles').select('id', { count: 'exact', head: true })
    
    if (formData.audience === 'organizers') {
      query = query.eq('is_organizer', true)
    } else if (formData.audience === 'artists') {
      // Would need to join with artists table
    }
    
    const { count } = await query
    setRecipientCount(count || 0)
  }

  const handleSend = async () => {
    if (!formData.subject.trim() || !formData.body.trim()) {
      toast.error('Please fill in subject and message')
      return
    }

    if (!confirm(`Are you sure you want to send this email to ${formData.testMode ? 'yourself (test)' : recipientCount + ' users'}?`)) {
      return
    }

    setSending(true)

    try {
      const response = await fetch('/api/admin/bulk-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: formData.subject,
          body: formData.body,
          audience: formData.audience,
          testMode: formData.testMode,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send emails')
      }

      const result = await response.json()
      toast.success(`Emails sent successfully to ${result.count} recipients`)
      
      if (!formData.testMode) {
        router.push('/admin/communications')
      }
    } catch (error) {
      toast.error('Failed to send emails')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/communications">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold">Bulk Email</h2>
          <p className="text-muted-foreground">Send emails to multiple users</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Audience */}
          <div className="space-y-2">
            <Label>Audience</Label>
            <Select 
              value={formData.audience} 
              onValueChange={(v) => setFormData({ ...formData, audience: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="organizers">Organizers Only</SelectItem>
                <SelectItem value="artists">Artists Only</SelectItem>
                <SelectItem value="vendors">Vendors Only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              {recipientCount} recipients
            </p>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Email subject..."
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="Write your message..."
              rows={10}
            />
            <p className="text-xs text-muted-foreground">
              Available variables: {"{{name}}"} - recipient&apos;s name
            </p>
          </div>

          {/* Test Mode */}
          <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Checkbox
              id="testMode"
              checked={formData.testMode}
              onCheckedChange={(checked) => setFormData({ ...formData, testMode: checked as boolean })}
            />
            <Label htmlFor="testMode" className="font-normal">
              Test mode - Send to myself first before sending to all recipients
            </Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Link href="/admin/communications">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {formData.testMode ? 'Send Test' : `Send to ${recipientCount} Users`}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
