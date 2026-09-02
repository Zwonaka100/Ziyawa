'use client'

/**
 * ADMIN BULK EMAIL PAGE - ENHANCED
 * Multi-select users with filters, batch sending, and proper tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { RecipientRow } from '@/lib/admin/recipients'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
import { ArrowLeft, Send, Loader2, Users, Search, Filter, User, CheckSquare, Square } from 'lucide-react'
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

export function AdminBulkEmailForm({
  initialRecipients,
  initialTemplates,
}: {
  initialRecipients: RecipientRow[]
  initialTemplates: { id: string; name: string; subject: string; body: string }[]
}) {
  const router = useRouter()
  const [sending, setSending] = useState(false)
  // Seeded from the server render — no empty first paint, no fetch on mount.
  const [users, setUsers] = useState<RecipientRow[]>(initialRecipients)
  const hydratedFromServer = useRef(true)
  const [templates] = useState(initialTemplates)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    subject: '',
    body: '',
    fromEmail: 'info', // support, info, accounts, noreply
    testMode: true,
  })



  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ role: roleFilter, limit: '500' })
      if (searchQuery.trim()) params.set('q', searchQuery.trim())

      const res = await fetch(`/api/admin/recipients?${params.toString()}`, { cache: 'no-store' })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Failed to load recipients')
      setUsers(payload.recipients || [])
    } catch (error) {
      console.error(error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery, roleFilter])

  useEffect(() => {
    if (hydratedFromServer.current) {
      hydratedFromServer.current = false
      return
    }
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

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUserIds)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUserIds(newSelected)
  }

  const toggleAll = () => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set())
    } else {
      setSelectedUserIds(new Set(users.map(u => u.id)))
    }
  }

  const selectByRole = (role: 'organizers' | 'artists' | 'providers' | 'groovists') => {
    const filtered = users.filter(u => {
      if (role === 'organizers') return u.is_organizer
      if (role === 'artists') return u.is_artist
      if (role === 'providers') return u.is_provider
      if (role === 'groovists') return !u.is_organizer && !u.is_artist && !u.is_provider
      return false
    })
    setSelectedUserIds(new Set(filtered.map(u => u.id)))
  }

  const handleSend = async () => {
    if (selectedUserIds.size === 0) {
      toast.error('Please select at least one recipient')
      return
    }

    if (!formData.subject.trim() || !formData.body.trim()) {
      toast.error('Please fill in subject and message')
      return
    }

    const recipientCount = formData.testMode ? 1 : selectedUserIds.size
    if (!confirm(`Send this email to ${formData.testMode ? 'yourself (test mode)' : recipientCount + ' users'}?`)) {
      return
    }

    setSending(true)

    try {
      const selectedUsers = users.filter(u => selectedUserIds.has(u.id))
      
      const response = await fetch('/api/admin/bulk-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: formData.subject,
          body: formData.body,
          fromEmail: formData.fromEmail,
          testMode: formData.testMode,
          recipients: selectedUsers.map(u => ({
            id: u.id,
            email: u.email,
            name: u.full_name,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send emails')
      }

      const result = await response.json()
      toast.success(`Emails sent successfully to ${result.count} recipient(s)`)
      
      if (!formData.testMode) {
        router.push('/admin/communications')
      }
    } catch {
      toast.error('Failed to send emails')
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
          <h2 className="text-2xl font-bold">Bulk Email</h2>
          <p className="text-muted-foreground">Send emails to multiple users</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Selection */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Select Recipients</h3>
              <Badge variant="secondary">
                <Users className="h-3 w-3 mr-1" />
                {selectedUserIds.size} selected
              </Badge>
            </div>

            {/* Quick Select */}
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={toggleAll}>
                {selectedUserIds.size === users.length ? <Square className="h-3 w-3 mr-1" /> : <CheckSquare className="h-3 w-3 mr-1" />}
                All ({users.length})
              </Button>
              <Button size="sm" variant="outline" onClick={() => selectByRole('organizers')}>
                Organizers
              </Button>
              <Button size="sm" variant="outline" onClick={() => selectByRole('artists')}>
                Artists
              </Button>
              <Button size="sm" variant="outline" onClick={() => selectByRole('providers')}>
                Crew
              </Button>
              <Button size="sm" variant="outline" onClick={() => selectByRole('groovists')}>
                Groovists
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedUserIds(new Set())}>
                Clear
              </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
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

            {/* User List */}
            <div className="border rounded-lg max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedUserIds.size === users.length && users.length > 0}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Roles</TableHead>
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
                      <TableRow 
                        key={user.id} 
                        className="cursor-pointer hover:bg-neutral-50"
                        onClick={() => toggleUser(user.id)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedUserIds.has(user.id)}
                            onCheckedChange={() => toggleUser(user.id)}
                          />
                        </TableCell>
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
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
                  <SelectItem value="support">Ziyawa Support &lt;support@ziyawa.com&gt;</SelectItem>
                  <SelectItem value="info">Ziyawa Info &lt;info@ziyawa.com&gt;</SelectItem>
                  <SelectItem value="accounts">Ziyawa Accounts &lt;accounts@ziyawa.com&gt;</SelectItem>
                  <SelectItem value="noreply">Ziyawa &lt;noreply@ziyawa.com&gt;</SelectItem>
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
                rows={10}
              />
              <p className="text-xs text-muted-foreground">
                Variables: {"{{name}}"} = recipient's first name
              </p>
            </div>

            {/* Test Mode */}
            <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Checkbox
                id="testMode"
                checked={formData.testMode}
                onCheckedChange={(checked) => setFormData({ ...formData, testMode: checked as boolean })}
              />
              <Label htmlFor="testMode" className="font-normal cursor-pointer">
                Test mode - Send to myself first
              </Label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Link href="/admin/communications">
                <Button variant="outline">Cancel</Button>
              </Link>
              <Button onClick={handleSend} disabled={sending || selectedUserIds.size === 0}>
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {formData.testMode ? 'Send Test' : `Send to ${selectedUserIds.size} Users`}
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
