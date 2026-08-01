'use client'

/**
 * ADMIN SEND EMAIL PAGE - ENHANCED
 * Full user list with search, filters, and proper selection
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Send, Loader2, Search, User, Filter } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_organizer: boolean
  is_artist: boolean
  is_provider: boolean
  created_at: string
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
  
  const [sending, setSending] = useState(false)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  
  const [formData, setFormData] = useState({
    subject: '',
    body: '',
    fromEmail: 'support', // support, info, accounts, noreply
  })

  useEffect(() => {
    void fetchTemplates()
    void fetchUsers()
    if (toUserId) {
      void fetchUser(toUserId)
    }
  }, [toUserId])

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
      .select('id, email, full_name, avatar_url, is_organizer, is_artist, is_provider, created_at')
      .eq('id', userId)
      .single()
    
    if (data) {
      setSelectedUser(data)
    }
  }

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    
    let query = supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, is_organizer, is_artist, is_provider, created_at')
      .order('created_at', { ascending: false })

    // Role filter
    if (roleFilter === 'organizers') {
      query = query.eq('is_organizer', true)
    } else if (roleFilter === 'artists') {
      query = query.eq('is_artist', true)
    } else if (roleFilter === 'providers') {
      query = query.eq('is_provider', true)
    } else if (roleFilter === 'groovists') {
      query = query.eq('is_organizer', false).eq('is_artist', false).eq('is_provider', false)
    }

    // Search filter
    if (searchQuery.trim()) {
      query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
    }

    const { data } = await query.limit(100)
    setUsers(data || [])
    setLoading(false)
  }, [searchQuery, roleFilter])

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setFormData({
        ...formData,
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
      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedUser.email,
          toUserId: selectedUser.id,
          toName: selectedUser.full_name,
          subject: formData.subject,
          body: formData.body,
          fromEmail: formData.fromEmail,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send email')
      }

      toast.success('Email sent successfully')
      router.push('/admin/communications')
    } catch {
      toast.error('Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const getUserRoles = (user: UserProfile) => {
    const roles = []
    if (user.is_organizer) roles.push('Organizer')
    if (user.is_artist) roles.push('Artist')
    if (user.is_provider) roles.push('Crew')
    if (roles.length === 0) roles.push('Groovist')
    return roles
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/communications">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold">Send Email</h2>
          <p className="text-muted-foreground">Select a user and compose an email</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Selection */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <h3 className="font-semibold mb-4">Select Recipient</h3>
              
              {selectedUser ? (
                <div className="p-4 bg-primary/10 rounded-lg space-y-3">
                  <div className="flex items-center gap-3">
                    {selectedUser.avatar_url ? (
                      <Image 
                        src={selectedUser.avatar_url} 
                        alt={selectedUser.full_name || 'User'} 
                        width={40} 
                        height={40} 
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center">
                        <User className="h-5 w-5 text-neutral-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{selectedUser.full_name || 'No name'}</p>
                      <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {getUserRoles(selectedUser).map(role => (
                      <Badge key={role} variant="secondary">{role}</Badge>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setSelectedUser(null)}>
                    Change Recipient
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-[140px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="groovists">Groovists</SelectItem>
                        <SelectItem value="organizers">Organizers</SelectItem>
                        <SelectItem value="artists">Artists</SelectItem>
                        <SelectItem value="providers">Crew</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border rounded-lg max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Roles</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                              Loading users...
                            </TableCell>
                          </TableRow>
                        ) : users.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                              No users found
                            </TableCell>
                          </TableRow>
                        ) : (
                          users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {user.avatar_url ? (
                                    <Image 
                                      src={user.avatar_url} 
                                      alt={user.full_name || 'User'} 
                                      width={32} 
                                      height={32} 
                                      className="rounded-full"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center">
                                      <User className="h-4 w-4 text-neutral-600" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-medium text-sm">{user.full_name || 'No name'}</p>
                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1 flex-wrap">
                                  {getUserRoles(user).map(role => (
                                    <Badge key={role} variant="secondary" className="text-xs">{role}</Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button size="sm" onClick={() => setSelectedUser(user)}>
                                  Select
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Email Compose */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold">Compose Email</h3>

            {/* Template */}
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label>Load Template (Optional)</Label>
                <Select onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template..." />
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

            {/* From Email */}
            <div className="space-y-2">
              <Label>From</Label>
              <Select value={formData.fromEmail} onValueChange={(v) => setFormData({ ...formData, fromEmail: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="support">Ziyawa Support &lt;support@zande.io&gt;</SelectItem>
                  <SelectItem value="info">Ziyawa Info &lt;info@zande.io&gt;</SelectItem>
                  <SelectItem value="accounts">Ziyawa Accounts &lt;accounts@zande.io&gt;</SelectItem>
                  <SelectItem value="noreply">Ziyawa &lt;noreply@zande.io&gt;</SelectItem>
                </SelectContent>
              </Select>
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
                rows={12}
              />
              <p className="text-xs text-muted-foreground">
                Variables: {"{{name}}"} = recipient's first name
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Link href="/admin/communications">
                <Button variant="outline">Cancel</Button>
              </Link>
              <Button onClick={handleSend} disabled={sending || !selectedUser}>
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
    </div>
  )
}
