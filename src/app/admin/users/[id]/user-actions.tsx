'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { 
  AlertTriangle, 
  Ban, 
  CheckCircle,
  Shield,
  Trash2,
  UserX
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface UserActionsProps {
  user: {
    id: string
    email: string
    full_name: string
    is_suspended: boolean
    is_banned: boolean
    is_admin: boolean
    admin_role: string | null
    is_verified: boolean
  }
}

export function UserActions({ user }: UserActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [warningOpen, setWarningOpen] = useState(false)
  const [warningReason, setWarningReason] = useState('')
  const [warningSeverity, setWarningSeverity] = useState('minor')
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [banOpen, setBanOpen] = useState(false)
  const [banReason, setBanReason] = useState('')

  const handleWarn = async () => {
    if (!warningReason.trim()) {
      toast.error('Please provide a reason')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data: { user: currentUser } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('user_warnings')
      .insert({
        user_id: user.id,
        issued_by: currentUser?.id,
        reason: warningReason,
        severity: warningSeverity,
      })

    if (!error) {
      // Update warnings count
      await supabase
        .from('profiles')
        .update({ warnings_count: (user as any).warnings_count + 1 })
        .eq('id', user.id)

      toast.success('Warning issued')
      setWarningOpen(false)
      setWarningReason('')
      router.refresh()
    } else {
      toast.error('Failed to issue warning')
    }

    setLoading(false)
  }

  const handleSuspend = async () => {
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        is_suspended: true,
        suspended_at: new Date().toISOString(),
        suspension_reason: suspendReason || null,
      })
      .eq('id', user.id)

    if (!error) {
      toast.success('User suspended')
      setSuspendOpen(false)
      router.refresh()
    } else {
      toast.error('Failed to suspend user')
    }

    setLoading(false)
  }

  const handleUnsuspend = async () => {
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        is_suspended: false,
        suspended_at: null,
        suspension_reason: null,
      })
      .eq('id', user.id)

    if (!error) {
      toast.success('User unsuspended')
      router.refresh()
    } else {
      toast.error('Failed to unsuspend user')
    }

    setLoading(false)
  }

  const handleBan = async () => {
    if (!banReason.trim()) {
      toast.error('Please provide a reason')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        is_banned: true,
        banned_at: new Date().toISOString(),
        ban_reason: banReason,
      })
      .eq('id', user.id)

    if (!error) {
      toast.success('User banned')
      setBanOpen(false)
      router.refresh()
    } else {
      toast.error('Failed to ban user')
    }

    setLoading(false)
  }

  const handleUnban = async () => {
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        is_banned: false,
        banned_at: null,
        ban_reason: null,
      })
      .eq('id', user.id)

    if (!error) {
      toast.success('User unbanned')
      router.refresh()
    } else {
      toast.error('Failed to unban user')
    }

    setLoading(false)
  }

  const handleVerify = async () => {
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: !user.is_verified })
      .eq('id', user.id)

    if (!error) {
      toast.success(user.is_verified ? 'Verification removed' : 'User verified')
      router.refresh()
    } else {
      toast.error('Failed to update verification')
    }

    setLoading(false)
  }

  const handleMakeAdmin = async (role: string | null) => {
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        is_admin: role !== null,
        admin_role: role,
      })
      .eq('id', user.id)

    if (!error) {
      toast.success(role ? `User made ${role}` : 'Admin role removed')
      router.refresh()
    } else {
      toast.error('Failed to update admin role')
    }

    setLoading(false)
  }

  return (
    <div className="space-y-3">
      {/* Verify */}
      <Button 
        variant="outline" 
        className="w-full justify-start"
        onClick={handleVerify}
        disabled={loading}
      >
        <CheckCircle className={`h-4 w-4 mr-2 ${user.is_verified ? 'text-green-600' : ''}`} />
        {user.is_verified ? 'Remove Verification' : 'Verify User'}
      </Button>

      {/* Issue Warning */}
      <Dialog open={warningOpen} onOpenChange={setWarningOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-start text-orange-600">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Issue Warning
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Warning</DialogTitle>
            <DialogDescription>
              Issue a formal warning to {user.full_name || user.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Severity</label>
              <Select value={warningSeverity} onValueChange={setWarningSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="severe">Severe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Textarea
                value={warningReason}
                onChange={(e) => setWarningReason(e.target.value)}
                placeholder="Explain the warning..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarningOpen(false)}>Cancel</Button>
            <Button onClick={handleWarn} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
              Issue Warning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend/Unsuspend */}
      {!user.is_banned && (
        <>
          {user.is_suspended ? (
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={handleUnsuspend}
              disabled={loading}
            >
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              Unsuspend User
            </Button>
          ) : (
            <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-orange-600">
                  <UserX className="h-4 w-4 mr-2" />
                  Suspend User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Suspend User</DialogTitle>
                  <DialogDescription>
                    Temporarily suspend {user.full_name || user.email}. They won&apos;t be able to access their account.
                  </DialogDescription>
                </DialogHeader>
                <div>
                  <label className="text-sm font-medium">Reason (optional)</label>
                  <Textarea
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    placeholder="Reason for suspension..."
                    rows={3}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSuspendOpen(false)}>Cancel</Button>
                  <Button onClick={handleSuspend} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                    Suspend
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}

      {/* Ban/Unban */}
      {user.is_banned ? (
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={handleUnban}
          disabled={loading}
        >
          <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
          Unban User
        </Button>
      ) : (
        <Dialog open={banOpen} onOpenChange={setBanOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-red-600">
              <Ban className="h-4 w-4 mr-2" />
              Ban User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ban User</DialogTitle>
              <DialogDescription>
                Permanently ban {user.full_name || user.email}. This action is serious and should be used for severe violations.
              </DialogDescription>
            </DialogHeader>
            <div>
              <label className="text-sm font-medium">Reason (required)</label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Reason for ban..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBanOpen(false)}>Cancel</Button>
              <Button onClick={handleBan} disabled={loading} variant="destructive">
                Ban User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Admin Role */}
      <div className="pt-4 border-t">
        <p className="text-sm font-medium mb-2">Admin Role</p>
        <Select 
          value={user.admin_role || 'none'} 
          onValueChange={(v) => handleMakeAdmin(v === 'none' ? null : v)}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not Admin</SelectItem>
            <SelectItem value="support">Support</SelectItem>
            <SelectItem value="moderator">Moderator</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
