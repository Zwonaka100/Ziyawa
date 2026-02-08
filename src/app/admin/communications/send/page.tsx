'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ArrowLeft, Send, Loader2, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  full_name: string
}

interface Template {
  id: string
  name: string
  subject: string
  body: string
}

export default function SendEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toUserId = searchParams.get('to')
  
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  
  const [formData, setFormData] = useState({
    subject: '',
    body: '',
  })

  useEffect(() => {
    fetchTemplates()
    if (toUserId) {
      fetchUser(toUserId)
    }
  }, [toUserId])

  useEffect(() => {
    if (userSearch.length >= 2) {
      searchUsers()
    }
  }, [userSearch])

  const fetchTemplates = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('email_templates')
      .select('id, name, subject, body')
      .order('name')
    
    setTemplates(data || [])
  }

  const fetchUser = async (userId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', userId)
      .single()
    
    if (data) {
      setSelectedUser(data)
    }
  }

  const searchUsers = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .or(`full_name.ilike.%${userSearch}%,email.ilike.%${userSearch}%`)
      .limit(10)
    
    setUsers(data || [])
    setShowUserDropdown(true)
  }

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setFormData({
        subject: template.subject,
        body: template.body,
      })
    }
  }

  const handleSend = async () => {
    if (!selectedUser) {
      toast.error('Please select a recipient')
      return
    }

    if (!formData.subject.trim() || !formData.body.trim()) {
      toast.error('Please fill in subject and message')
      return
    }

    setSending(true)

    try {
      // Call API to send email
      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedUser.email,
          toUserId: selectedUser.id,
          subject: formData.subject,
          body: formData.body,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send email')
      }

      toast.success('Email sent successfully')
      router.push('/admin/communications')
    } catch (error) {
      toast.error('Failed to send email')
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
          <h2 className="text-2xl font-bold">Send Email</h2>
          <p className="text-muted-foreground">Compose and send an email to a user</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Recipient */}
          <div className="space-y-2">
            <Label>Recipient</Label>
            {selectedUser ? (
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div>
                  <p className="font-medium">{selectedUser.full_name || 'No name'}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onFocus={() => userSearch.length >= 2 && setShowUserDropdown(true)}
                  className="pl-10"
                />
                {showUserDropdown && users.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {users.map((user) => (
                      <button
                        key={user.id}
                        className="w-full text-left p-3 hover:bg-neutral-50 border-b last:border-b-0"
                        onClick={() => {
                          setSelectedUser(user)
                          setShowUserDropdown(false)
                          setUserSearch('')
                        }}
                      >
                        <p className="font-medium">{user.full_name || 'No name'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Template */}
          {templates.length > 0 && (
            <div className="space-y-2">
              <Label>Use Template (optional)</Label>
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
              You can use {"{{name}}"} to insert the recipient&apos;s name.
            </p>
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
                  Send Email
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
