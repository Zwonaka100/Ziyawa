'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  User,
  Building2,
  RefreshCw,
  Eye,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

// ── Types ───────────────────────────────────────────────────────────────────

interface VerificationRow {
  id: string
  profile_id: string
  entity_type: 'individual' | 'business'
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  reviewed_at: string | null
  rejection_reason: string | null
  id_type: string | null
  id_number: string | null
  doc_front_url: string | null
  doc_back_url: string | null
  business_name: string | null
  registration_number: string | null
  company_reg_cert_url: string | null
  rep_id_number: string | null
  rep_id_front_url: string | null
  rep_id_back_url: string | null
  profiles: {
    full_name: string | null
    email: string
    avatar_url: string | null
    is_organizer: boolean
    is_artist: boolean
    is_provider: boolean
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'approved') return <Badge className="bg-green-500 text-white"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>
  if (status === 'rejected') return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
  return <Badge variant="outline" className="border-orange-400 text-orange-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminVerificationsPage() {
  const supabase = createClient()

  const [rows, setRows] = useState<VerificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [detailRow, setDetailRow] = useState<VerificationRow | null>(null)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      let q = supabase
        .from('verification_requests')
        .select(`
          id, profile_id, entity_type, status, submitted_at, reviewed_at,
          rejection_reason, id_type, id_number, doc_front_url, doc_back_url,
          business_name, registration_number, company_reg_cert_url,
          rep_id_number, rep_id_front_url, rep_id_back_url,
          profiles!inner (full_name, email, avatar_url, is_organizer, is_artist, is_provider)
        `)
        .order('submitted_at', { ascending: false })

      if (statusFilter !== 'all') {
        q = q.eq('status', statusFilter)
      }

      const { data, error } = await q
      if (error) throw error
      setRows((data ?? []) as unknown as VerificationRow[])
    } catch {
      toast.error('Failed to load verification requests')
    } finally {
      setLoading(false)
    }
  }, [supabase, statusFilter])

  useEffect(() => { void fetchRows() }, [fetchRows])

  const handleAction = async (id: string, action: 'approve' | 'reject', reason?: string) => {
    setProcessing(id)
    try {
      const res = await fetch(`/api/admin/verifications/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejection_reason: reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(action === 'approve' ? 'Verification approved' : 'Verification rejected')
      setRejectDialogId(null)
      setRejectionReason('')
      setDetailRow(null)
      await fetchRows()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setProcessing(null)
    }
  }

  const roleTags = (row: VerificationRow) => {
    const tags = []
    if (row.profiles.is_organizer) tags.push('Organiser')
    if (row.profiles.is_artist) tags.push('Artist')
    if (row.profiles.is_provider) tags.push('Crew')
    return tags
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Identity Verifications</h1>
          <p className="text-muted-foreground">Review and approve user verification requests</p>
        </div>
        <Button variant="outline" onClick={fetchRows} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Show:</span>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        {!loading && <span className="text-sm text-muted-foreground">{rows.length} record{rows.length !== 1 ? 's' : ''}</span>}
      </div>

      {/* Table / Cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No {statusFilter !== 'all' ? statusFilter : ''} verification requests
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback>
                      {row.profiles.full_name?.charAt(0) || row.profiles.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{row.profiles.full_name || row.profiles.email}</p>
                      <StatusBadge status={row.status} />
                      <Badge variant="outline" className="text-xs">
                        {row.entity_type === 'individual' ? <><User className="h-3 w-3 mr-1" />Individual</> : <><Building2 className="h-3 w-3 mr-1" />Business</>}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{row.profiles.email}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {roleTags(row).map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                      <span className="text-xs text-muted-foreground">
                        {row.entity_type === 'individual'
                          ? `ID: ${row.id_type === 'sa_id' ? 'SA ID' : 'Passport'} · ${row.id_number ?? ''}`
                          : `${row.business_name ?? ''} · Reg: ${row.registration_number ?? ''}`
                        }
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Submitted {formatDistanceToNow(new Date(row.submitted_at), { addSuffix: true })}
                      {row.reviewed_at && ` · Reviewed ${formatDistanceToNow(new Date(row.reviewed_at), { addSuffix: true })}`}
                    </p>
                    {row.rejection_reason && (
                      <p className="text-xs text-red-600 mt-1">Rejection reason: {row.rejection_reason}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDetailRow(row)}
                      title="View documents"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {row.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={processing === row.id}
                          onClick={() => handleAction(row.id, 'approve')}
                        >
                          {processing === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={processing === row.id}
                          onClick={() => { setRejectDialogId(row.id); setRejectionReason('') }}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejectDialogId} onOpenChange={(o) => { if (!o) { setRejectDialogId(null); setRejectionReason('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject verification</DialogTitle>
            <DialogDescription>
              Provide a reason — the user will see this message so they can fix the issue and resubmit.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Document image is blurry. Please re-upload a clear photo of both sides."
            rows={4}
            maxLength={500}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialogId(null); setRejectionReason('') }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!rejectionReason.trim() || processing === rejectDialogId}
              onClick={() => rejectDialogId && handleAction(rejectDialogId, 'reject', rejectionReason.trim())}
            >
              {processing === rejectDialogId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail / documents dialog */}
      <Dialog open={!!detailRow} onOpenChange={(o) => { if (!o) setDetailRow(null) }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verification documents</DialogTitle>
            <DialogDescription>
              {detailRow?.profiles.full_name || detailRow?.profiles.email} · {detailRow?.entity_type === 'individual' ? 'Individual' : 'Business'}
            </DialogDescription>
          </DialogHeader>
          {detailRow && (
            <div className="space-y-4 text-sm">
              {detailRow.entity_type === 'individual' ? (
                <>
                  <Detail label="ID type" value={detailRow.id_type === 'sa_id' ? 'South African ID' : 'Passport'} />
                  <Detail label="ID number" value={detailRow.id_number} />
                  <DocField label="Front of ID" path={detailRow.doc_front_url} />
                  <DocField label="Back of ID" path={detailRow.doc_back_url} />
                </>
              ) : (
                <>
                  <Detail label="Business name" value={detailRow.business_name} />
                  <Detail label="Registration number" value={detailRow.registration_number} />
                  <DocField label="CIPC certificate" path={detailRow.company_reg_cert_url} />
                  <Detail label="Rep ID number" value={detailRow.rep_id_number} />
                  <DocField label="Rep — front of ID" path={detailRow.rep_id_front_url} />
                  <DocField label="Rep — back of ID" path={detailRow.rep_id_back_url} />
                </>
              )}
            </div>
          )}
          <DialogFooter>
            {detailRow?.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-300"
                  onClick={() => { setRejectDialogId(detailRow.id); setDetailRow(null) }}
                >
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={processing === detailRow.id}
                  onClick={() => handleAction(detailRow.id, 'approve')}
                >
                  {processing === detailRow.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Detail helpers ───────────────────────────────────────────────────────────

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || '—'}</p>
    </div>
  )
}

function DocField({ label, path }: { label: string; path?: string | null }) {
  // paths are storage paths — we create a signed URL link placeholder
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      {path ? (
        <p className="font-mono text-xs break-all text-blue-600">{path}</p>
      ) : (
        <p className="text-muted-foreground">Not provided</p>
      )}
    </div>
  )
}
