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
  UserX
} from 'lucide-react'
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

  // Every action goes through the admin API on the service key. Writing
  // profiles from the browser only ever touched the admin's own row, so these
  // used to report success while changing nothing.
  const runAction = async (body: Record<string, unknown>, success: string, onDone?: () => void) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Action failed')
      toast.success(success)
      onDone?.()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  const handleWarn = () => {
    if (!warningReason.trim()) {
      toast.error('Please provide a reason')
      return
    }
    void runAction({ warn: { reason: warningReason, severity: warningSeverity } }, 'Warning issued', () => {
      setWarningOpen(false)
      setWarningReason('')
    })
  }

  const handleSuspend = () =>
    void runAction({ suspend: true, reason: suspendReason }, 'User suspended', () => setSuspendOpen(false))

  const handleUnsuspend = () => void runAction({ suspend: false }, 'User unsuspended')

  const handleBan = () => {
    if (!banReason.trim()) {
      toast.error('Please provide a reason')
      return
    }
    void runAction({ ban: true, reason: banReason }, 'User banned', () => setBanOpen(false))
  }

  const handleUnban = () => void runAction({ ban: false }, 'User unbanned')

  const handleVerify = () =>
    void runAction(
      { verify: !user.is_verified },
      user.is_verified ? 'Verification removed' : 'User verified'
    )

  const handleMakeAdmin = (role: string | null) =>
    void runAction({ adminRole: role }, role ? `User made ${role}` : 'Admin role removed')

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
