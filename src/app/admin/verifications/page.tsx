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
  FileText,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { reasonsForEntityType } from '@/lib/verification-rejection-reasons'
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
  bank_code: string | null
  bank_name: string | null
  account_number: string | null
  account_holder: string | null
  legal_name: string | null
  bank_document_url: string | null
  profiles: {
    id: string
    full_name: string | null
    email: string
    avatar_url: string | null
    is_organizer: boolean
    is_artist: boolean
    is_provider: boolean
    is_verified: boolean
    verified_at: string | null
    verified_entity_type: string | null
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Do the ID/registered name and the bank account holder plausibly refer to the
 * same party?
 *
 * This is a hint for the admin, never a decision — Paystack cannot confirm South
 * African account names, so a human still checks the ID document. It is
 * deliberately tolerant, because banks routinely shorten names ("T M Nkosi") or
 * drop middle names; a warning that fires on every legitimate account would be
 * ignored, which is worse than no warning. For people it compares surname plus
 * first initial; for businesses, whether either registered name contains the
 * other once punctuation is stripped.
 */
function namesLookConsistent(
  legalName: string | null,
  accountHolder: string | null,
  isBusiness: boolean
): boolean {
  const clean = (value: string | null) =>
    (value || '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()

  const legal = clean(legalName)
  const holder = clean(accountHolder)

  if (!legal || !holder) return false
  if (legal === holder) return true

  if (isBusiness) {
    const a = legal.replace(/ /g, '')
    const b = holder.replace(/ /g, '')
    return a.includes(b) || b.includes(a)
  }

  const legalParts = legal.split(' ')
  const holderParts = holder.split(' ')
  const sameSurname = legalParts[legalParts.length - 1] === holderParts[holderParts.length - 1]
  const sameFirstInitial = legalParts[0][0] === holderParts[0][0]
  return sameSurname && sameFirstInitial
}

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
  const [rejectionCodes, setRejectionCodes] = useState<string[]>([])
  // Which reason list to show — business submissions have their own failure modes.
  const [rejectEntityType, setRejectEntityType] = useState<'individual' | 'business'>('individual')
  const [processing, setProcessing] = useState<string | null>(null)
  const [detailRow, setDetailRow] = useState<VerificationRow | null>(null)

  const openRejectDialog = (row: VerificationRow) => {
    setRejectEntityType(row.entity_type)
    setRejectionCodes([])
    setRejectionReason('')
    setRejectDialogId(row.id)
  }

  const closeRejectDialog = () => {
    setRejectDialogId(null)
    setRejectionReason('')
    setRejectionCodes([])
  }

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
          bank_code, bank_name, account_number, account_holder, legal_name, bank_document_url,
          profiles!verification_requests_profile_id_fkey!inner (id, full_name, email, avatar_url, is_organizer, is_artist, is_provider, is_verified, verified_at, verified_entity_type)
        `)
        .order('submitted_at', { ascending: false })

      if (statusFilter !== 'all') {
        q = q.eq('status', statusFilter)
      }

      const { data, error } = await q
      if (error) throw error
      setRows((data ?? []) as unknown as VerificationRow[])
    } catch (error) {
      // Surface the cause — a bare catch here hid a PostgREST relationship
      // error for a long time and made this look like a generic outage.
      console.error('Failed to load verification requests:', error)
      const message = error instanceof Error ? error.message : ''
      toast.error(message ? `Failed to load verifications: ${message}` : 'Failed to load verification requests')
    } finally {
      setLoading(false)
    }
  }, [supabase, statusFilter])

  useEffect(() => { void fetchRows() }, [fetchRows])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setProcessing(id)
    try {
      const res = await fetch(`/api/admin/verifications/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          rejection_codes: action === 'reject' ? rejectionCodes : undefined,
          rejection_reason: action === 'reject' ? rejectionReason.trim() : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Approval reports whether the payout account was actually set up, since
      // identity can be approved while the Paystack recipient fails.
      toast.success(action === 'approve' ? (data.message || 'Verification approved') : 'Verification rejected')
      closeRejectDialog()
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
                          onClick={() => openRejectDialog(row)}
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
      <Dialog open={!!rejectDialogId} onOpenChange={(o) => { if (!o) closeRejectDialog() }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reject verification</DialogTitle>
            <DialogDescription>
              Tick everything that needs fixing. The user is emailed exactly these points, so they know what to correct
              before submitting again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {reasonsForEntityType(rejectEntityType).map((reason) => {
              const checked = rejectionCodes.includes(reason.code)
              return (
                <label
                  key={reason.code}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    checked ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => {
                      setRejectionCodes((current) =>
                        value === true
                          ? [...current, reason.code]
                          : current.filter((code) => code !== reason.code)
                      )
                    }}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">{reason.adminLabel}</p>
                    <p className="text-xs text-muted-foreground">{reason.userMessage}</p>
                  </div>
                </label>
              )
            })}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Anything else? (optional)</p>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Added to the end of the message the user receives."
              rows={3}
              maxLength={500}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeRejectDialog}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={(rejectionCodes.length === 0 && !rejectionReason.trim()) || processing === rejectDialogId}
              onClick={() => rejectDialogId && handleAction(rejectDialogId, 'reject')}
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

              {/* Payout destination — approving creates a Paystack recipient
                  for this account, so it is part of the review decision. */}
              <div className="pt-2 border-t space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payout account</p>
                {detailRow.account_number ? (
                  <>
                    <Detail label="Bank" value={detailRow.bank_name} />
                    <Detail label="Account number" value={detailRow.account_number} />
                    <DocField label="Bank letter / statement" path={detailRow.bank_document_url} />
                    {/* Show both names together — comparing them is the check. */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {detailRow.entity_type === 'business' ? 'Registered name' : 'Name on ID'}
                        </p>
                        <p className="font-medium">{detailRow.legal_name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Bank account holder</p>
                        <p className="font-medium">{detailRow.account_holder || '—'}</p>
                      </div>
                    </div>

                    {(() => {
                      const looksConsistent = namesLookConsistent(
                        detailRow.legal_name,
                        detailRow.account_holder,
                        detailRow.entity_type === 'business'
                      )

                      if (looksConsistent) {
                        return (
                          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                            <p className="text-xs text-green-800">
                              Names look consistent. Still confirm against the ID document above before approving.
                            </p>
                          </div>
                        )
                      }
                      return (
                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                          <p className="text-xs text-amber-800">
                            <strong>These names don&apos;t obviously match — check the ID document carefully.</strong>{' '}
                            Paystack cannot confirm South African account names, so this comparison is the only
                            safeguard against paying the wrong person.
                          </p>
                        </div>
                      )
                    })()}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No bank details submitted — this request predates payout capture. Approving will verify identity only.
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            {detailRow?.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-300"
                  onClick={() => { openRejectDialog(detailRow); setDetailRow(null) }}
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Documents live in a private bucket, so they can only be opened through a
  // short-lived signed URL minted by the admin-only endpoint.
  const handleOpen = async () => {
    if (!path) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/verifications/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      const data = await response.json()
      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Could not open this document')
      }
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open this document')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      {path ? (
        <>
          <Button variant="outline" size="sm" onClick={handleOpen} disabled={loading} className="mt-1">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
            View document
          </Button>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </>
      ) : (
        <p className="text-muted-foreground">Not provided</p>
      )}
    </div>
  )
}
