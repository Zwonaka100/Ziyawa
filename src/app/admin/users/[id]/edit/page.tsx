'use client'

/**
 * ADMIN USER EDIT PAGE
 * /admin/users/[id]/edit
 * 
 * Edit user profile details as admin
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save, Loader2, User } from 'lucide-react'
import { toast } from 'sonner'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  location: string | null
  bio: string | null
  avatar_url: string | null
  is_organizer: boolean
  is_verified: boolean
  is_suspended: boolean
  is_banned: boolean
  is_admin: boolean
  admin_role: string | null
  suspension_reason: string | null
  ban_reason: string | null
}

const SA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
]

export default function AdminUserEditPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    location: '',
    bio: '',
    is_organizer: false,
    is_verified: false,
  })

  // Load user data
  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !data) {
        toast.error('User not found')
        router.push('/admin/users')
        return
      }

      setUser(data)
      setFormData({
        full_name: data.full_name || '',
        phone: data.phone || '',
        location: data.location || '',
        bio: data.bio || '',
        is_organizer: data.is_organizer || false,
        is_verified: data.is_verified || false,
      })
      setLoading(false)
    }

    loadUser()
  }, [userId, supabase, router])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name || null,
          phone: formData.phone || null,
          location: formData.location || null,
          bio: formData.bio || null,
          is_organizer: formData.is_organizer,
          is_verified: formData.is_verified,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) throw error

      // Log the action
      const { data: { user: currentAdmin } } = await supabase.auth.getUser()
      if (currentAdmin) {
        await supabase.from('admin_audit_logs').insert({
          admin_id: currentAdmin.id,
          action: 'update',
          entity_type: 'user',
          entity_id: userId,
          details: {
            updated_fields: Object.keys(formData),
            full_name: formData.full_name,
          },
        })
      }

      toast.success('User updated successfully')
      router.push(`/admin/users/${userId}`)
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/admin/users/${userId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold">Edit User</h2>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Edit the user&apos;s basic profile details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+27 XX XXX XXXX"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location (Province)</Label>
                  <Select
                    value={formData.location}
                    onValueChange={(value) => setFormData({ ...formData, location: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      {SA_PROVINCES.map((province) => (
                        <SelectItem key={province} value={province}>
                          {province}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="User bio..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Roles & Permissions</CardTitle>
                <CardDescription>
                  Manage user roles and verification status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Organizer Role</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow this user to create and manage events
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_organizer}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_organizer: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Verified Status</Label>
                    <p className="text-sm text-muted-foreground">
                      Mark this user as verified (shows badge on profile)
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_verified}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_verified: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{user.full_name || 'No name'}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>

                {/* Status indicators */}
                <div className="space-y-2 pt-4 border-t">
                  {user.is_admin && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      <span>Admin ({user.admin_role})</span>
                    </div>
                  )}
                  {user.is_suspended && (
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      <span>Suspended</span>
                    </div>
                  )}
                  {user.is_banned && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span>Banned</span>
                    </div>
                  )}
                </div>

                {(user.suspension_reason || user.ban_reason) && (
                  <div className="pt-4 border-t">
                    {user.suspension_reason && (
                      <div className="text-sm">
                        <p className="font-medium text-orange-600">Suspension Reason:</p>
                        <p className="text-muted-foreground">{user.suspension_reason}</p>
                      </div>
                    )}
                    {user.ban_reason && (
                      <div className="text-sm mt-2">
                        <p className="font-medium text-red-600">Ban Reason:</p>
                        <p className="text-muted-foreground">{user.ban_reason}</p>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs text-muted-foreground pt-4 border-t">
                  Note: To suspend, ban, or manage admin roles, use the actions on the user detail page.
                </p>
              </CardContent>
            </Card>

            {/* Save Button */}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.push(`/admin/users/${userId}`)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
