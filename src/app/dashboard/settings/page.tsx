'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  User,
  Shield,
  ShieldCheck,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Upload,
  ArrowRight,
  Calendar,
  Music,
  Wrench,
  Smartphone,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { toast } from 'sonner'

// ── Types ──────────────────────────────────────────────────────────────────────

interface VerificationRequest {
  id: string
  entity_type: 'individual' | 'business'
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  reviewed_at: string | null
  rejection_reason: string | null
  id_type?: string
  business_name?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function VerificationStatusBadge({ status }: { status: string }) {
  if (status === 'approved') return <Badge className="bg-green-500 text-white"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
  if (status === 'pending') return <Badge variant="outline" className="border-orange-400 text-orange-600"><Clock className="h-3 w-3 mr-1" />Pending review</Badge>
  return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsPageInner />
    </Suspense>
  )
}

function SettingsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, refreshProfile, loading: authLoading } = useAuth()
  const supabase = createClient()

  const defaultTab = searchParams.get('tab') ?? 'profile'

  // Profile tab state
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Account tab state
  const [upgrading, setUpgrading] = useState<string | null>(null)

  // Verification tab state
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([])
  const [loadingVerification, setLoadingVerification] = useState(true)
  const [entityType, setEntityType] = useState<'individual' | 'business'>('individual')
  const [idType, setIdType] = useState<'sa_id' | 'passport'>('sa_id')
  const [idNumber, setIdNumber] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [regNumber, setRegNumber] = useState('')
  const [repIdNumber, setRepIdNumber] = useState('')
  const [docFrontUrl, setDocFrontUrl] = useState('')
  const [docBackUrl, setDocBackUrl] = useState('')
  const [regCertUrl, setRegCertUrl] = useState('')
  const [repFrontUrl, setRepFrontUrl] = useState('')
  const [repBackUrl, setRepBackUrl] = useState('')
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null)
  const [submittingVerification, setSubmittingVerification] = useState(false)

  // Security tab state
  const [mfaFactors, setMfaFactors] = useState<{ id: string; factor_type: string }[]>([])
  const [loadingMfa, setLoadingMfa] = useState(true)
  const [enrollingMfa, setEnrollingMfa] = useState(false)
  const [unenrollingMfa, setUnenrollingMfa] = useState(false)
  const [mfaQr, setMfaQr] = useState<string | null>(null)
  const [mfaSecret, setMfaSecret] = useState<string | null>(null)
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [verifyingMfa, setVerifyingMfa] = useState(false)
  const [_unenrollCode, setUnenrollCode] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/signin')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setPhone((profile as { phone?: string }).phone || '')
    }
  }, [profile])

  const fetchVerificationStatus = useCallback(async () => {
    setLoadingVerification(true)
    try {
      const res = await fetch('/api/verification/submit')
      if (res.ok) {
        const data = await res.json()
        setVerificationRequests(data.requests ?? [])
      }
    } catch {
      // silent
    } finally {
      setLoadingVerification(false)
    }
  }, [])

  const fetchMfaFactors = useCallback(async () => {
    setLoadingMfa(true)
    try {
      const { data } = await supabase.auth.mfa.listFactors()
      setMfaFactors(data?.totp ?? [])
    } catch {
      // silent
    } finally {
      setLoadingMfa(false)
    }
  }, [supabase])

  useEffect(() => {
    if (user) {
      void fetchVerificationStatus()
      void fetchMfaFactors()
    }
  }, [user, fetchVerificationStatus, fetchMfaFactors])

  if (authLoading || !user || !profile) return null

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone: phone || null })
        .eq('id', profile.id)
      if (error) throw error
      await refreshProfile()
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB')
      return
    }
    setAvatarUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `avatars/${user.id}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(path)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', profile.id)
      if (updateError) throw updateError
      await refreshProfile()
      toast.success('Avatar updated')
    } catch {
      toast.error('Failed to upload avatar')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleUpgrade = async (role: 'organizer' | 'artist' | 'provider') => {
    setUpgrading(role)
    try {
      if (role === 'provider') {
        router.push('/dashboard/provider/setup?intent=join-crew')
        return
      }
      const { error } = await supabase
        .from('profiles')
        .update(role === 'organizer' ? { is_organizer: true } : { is_artist: true })
        .eq('id', profile.id)
      if (error) throw error
      await refreshProfile()
      toast.success(role === 'organizer' ? 'You are now an Event Organiser! 🎉' : 'You are now an Artist! 🎤')
    } catch {
      toast.error('Failed to upgrade. Please try again.')
    } finally {
      setUpgrading(null)
    }
  }

  const uploadDocumentFile = async (
    file: File,
    docKey: string,
    setter: (url: string) => void
  ) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB')
      return
    }
    setUploadingDoc(docKey)
    try {
      const ext = file.name.split('.').pop()
      const path = `verification/${user.id}/${docKey}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      setter(path)
      toast.success('Document uploaded')
    } catch {
      toast.error('Failed to upload document')
    } finally {
      setUploadingDoc(null)
    }
  }

  const handleSubmitVerification = async () => {
    setSubmittingVerification(true)
    try {
      const body: Record<string, unknown> = { entity_type: entityType }
      if (entityType === 'individual') {
        Object.assign(body, { id_type: idType, id_number: idNumber, doc_front_url: docFrontUrl, doc_back_url: docBackUrl })
      } else {
        Object.assign(body, {
          business_name: businessName,
          registration_number: regNumber,
          company_reg_cert_url: regCertUrl,
          rep_id_number: repIdNumber,
          rep_id_front_url: repFrontUrl,
          rep_id_back_url: repBackUrl,
        })
      }
      const res = await fetch('/api/verification/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(data.message)
      await fetchVerificationStatus()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Submission failed')
    } finally {
      setSubmittingVerification(false)
    }
  }

  const handleEnrollMfa = async () => {
    setEnrollingMfa(true)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator app' })
      if (error) throw error
      setMfaFactorId(data.id)
      setMfaQr(data.totp.qr_code)
      setMfaSecret(data.totp.secret)
    } catch {
      toast.error('Failed to start 2FA setup')
    } finally {
      setEnrollingMfa(false)
    }
  }

  const handleVerifyMfa = async () => {
    if (!mfaFactorId || !mfaCode) return
    setVerifyingMfa(true)
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
      if (challengeError) throw challengeError
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: mfaCode,
      })
      if (verifyError) throw verifyError
      toast.success('2FA enabled successfully!')
      setMfaQr(null)
      setMfaSecret(null)
      setMfaFactorId(null)
      setMfaCode('')
      await fetchMfaFactors()
    } catch {
      toast.error('Invalid code. Please try again.')
    } finally {
      setVerifyingMfa(false)
    }
  }

  const handleUnenrollMfa = async () => {
    const factor = mfaFactors[0]
    if (!factor) return
    setUnenrollingMfa(true)
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
      if (error) throw error
      toast.success('2FA disabled')
      setUnenrollCode('')
      await fetchMfaFactors()
    } catch {
      toast.error('Failed to disable 2FA')
    } finally {
      setUnenrollingMfa(false)
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const latestRequest = verificationRequests[0] ?? null
  const hasPending = latestRequest?.status === 'pending'
  const isVerified = profile.is_verified
  const mfaEnabled = mfaFactors.length > 0

  const needsVerification = profile.is_artist || profile.is_organizer || (profile as { is_provider?: boolean }).is_provider
  const canSubmitVerification = !isVerified && !hasPending

  const verificationComplete = entityType === 'individual'
    ? !!idNumber && !!docFrontUrl
    : !!businessName && !!regNumber && !!regCertUrl && !!repIdNumber && !!repFrontUrl

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground">Manage your profile, roles, verification, and security</p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="flex items-center gap-1.5">
            <User className="h-4 w-4" />Profile
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-1.5">
            <ArrowRight className="h-4 w-4" />Account
          </TabsTrigger>
          <TabsTrigger value="verification" className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" />Verification
            {hasPending && <span className="ml-1 h-2 w-2 rounded-full bg-orange-500 inline-block" />}
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1.5">
            <Shield className="h-4 w-4" />Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1.5">
            <Bell className="h-4 w-4" />Notifications
          </TabsTrigger>
        </TabsList>

        {/* ── PROFILE TAB ───────────────────────────────────────────────────── */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>How you appear on Ziyawa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {profile.full_name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={avatarUploading}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                    Change photo
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG or WebP · max 2MB</p>
                </div>
              </div>

              <Separator />

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full name</Label>
                  <Input
                    id="full-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={profile.email} disabled className="bg-muted/40" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+27 81 234 5678"
                    type="tel"
                    maxLength={20}
                  />
                </div>
                <Button type="submit" disabled={savingProfile}>
                  {savingProfile && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Save changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ACCOUNT TAB ───────────────────────────────────────────────────── */}
        <TabsContent value="account">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Roles</CardTitle>
                <CardDescription>You can hold multiple roles at once</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { active: profile.is_organizer, label: 'Event Organiser', desc: 'Create events, book artists, sell tickets', icon: Calendar },
                  { active: profile.is_artist, label: 'Artist', desc: 'Get discovered and booked for events', icon: Music },
                  { active: (profile as { is_provider?: boolean }).is_provider, label: 'Crew', desc: 'Offer services or work events as crew', icon: Wrench },
                ].map(({ active, label, desc, icon: Icon }) => (
                  <div key={label} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                    {active
                      ? <Badge className="bg-green-500 text-white"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>
                      : null
                    }
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Role upgrades — only show roles not yet active */}
            {profile.is_admin !== true && (!profile.is_organizer || !profile.is_artist || !(profile as { is_provider?: boolean }).is_provider) && (
              <Card>
                <CardHeader>
                  <CardTitle>Expand your account</CardTitle>
                  <CardDescription>Add a role to unlock more of the platform</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!profile.is_organizer && (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-dashed hover:border-primary transition-colors">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium text-sm">Become an Organiser</p>
                          <p className="text-xs text-muted-foreground">Host events, book artists, sell tickets</p>
                        </div>
                      </div>
                      <Button size="sm" disabled={upgrading === 'organizer'} onClick={() => handleUpgrade('organizer')}>
                        {upgrading === 'organizer' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enable'}
                      </Button>
                    </div>
                  )}
                  {!profile.is_artist && (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-dashed hover:border-primary transition-colors">
                      <div className="flex items-center gap-3">
                        <Music className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium text-sm">Become an Artist</p>
                          <p className="text-xs text-muted-foreground">Create a profile, get booked, earn money</p>
                        </div>
                      </div>
                      <Button size="sm" variant="secondary" disabled={upgrading === 'artist'} onClick={() => handleUpgrade('artist')}>
                        {upgrading === 'artist' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enable'}
                      </Button>
                    </div>
                  )}
                  {!(profile as { is_provider?: boolean }).is_provider && (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-dashed hover:border-orange-500 transition-colors">
                      <div className="flex items-center gap-3">
                        <Wrench className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="font-medium text-sm">Join Crew</p>
                          <p className="text-xs text-muted-foreground">Work events or offer services to organisers</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="border-orange-500 text-orange-600" disabled={upgrading === 'provider'} onClick={() => handleUpgrade('provider')}>
                        {upgrading === 'provider' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enable'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── VERIFICATION TAB ──────────────────────────────────────────────── */}
        <TabsContent value="verification">
          <div className="space-y-4">
            {/* Status card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">Verification status</CardTitle>
                <Button variant="ghost" size="sm" onClick={fetchVerificationStatus}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {loadingVerification ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />Checking status...
                  </div>
                ) : isVerified ? (
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="font-semibold text-green-700">Identity verified</p>
                      <p className="text-sm text-muted-foreground">You can withdraw funds from your wallet at any time</p>
                    </div>
                  </div>
                ) : latestRequest ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <VerificationStatusBadge status={latestRequest.status} />
                      <span className="text-sm text-muted-foreground">
                        Submitted {new Date(latestRequest.submitted_at).toLocaleDateString('en-ZA')}
                      </span>
                    </div>
                    {latestRequest.status === 'pending' && (
                      <p className="text-sm text-muted-foreground">Our team reviews within 1–2 business days. We&apos;ll notify you by email.</p>
                    )}
                    {latestRequest.status === 'rejected' && latestRequest.rejection_reason && (
                      <div className="mt-2 p-3 rounded-lg bg-red-50 border border-red-200">
                        <p className="text-sm text-red-700 font-medium">Reason: {latestRequest.rejection_reason}</p>
                        <p className="text-xs text-red-600 mt-1">Please fix the issue and resubmit below</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6 text-orange-500" />
                    <div>
                      <p className="font-medium">Not yet verified</p>
                      {needsVerification
                        ? <p className="text-sm text-muted-foreground">Verification is required before you can withdraw funds</p>
                        : <p className="text-sm text-muted-foreground">Optional — add a verified badge to your profile</p>
                      }
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submission form */}
            {canSubmitVerification && (
              <Card>
                <CardHeader>
                  <CardTitle>Submit verification</CardTitle>
                  <CardDescription>
                    Choose your verification type and upload the required documents. All documents are stored securely and only reviewed by Ziyawa staff.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Entity type */}
                  <div className="space-y-2">
                    <Label>I am verifying as</Label>
                    <div className="flex gap-3">
                      {(['individual', 'business'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setEntityType(t)}
                          className={`flex-1 rounded-lg border-2 p-3 text-sm font-medium transition-colors ${entityType === t ? 'border-primary bg-primary/5 text-primary' : 'border-muted hover:border-muted-foreground'}`}
                        >
                          {t === 'individual' ? '👤 Individual' : '🏢 Business / Company'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {entityType === 'individual' ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>ID type</Label>
                        <Select value={idType} onValueChange={(v) => setIdType(v as 'sa_id' | 'passport')}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sa_id">South African ID</SelectItem>
                            <SelectItem value="passport">Passport</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{idType === 'sa_id' ? 'SA ID number (13 digits)' : 'Passport number'}</Label>
                        <Input
                          value={idNumber}
                          onChange={(e) => setIdNumber(e.target.value)}
                          placeholder={idType === 'sa_id' ? '0001010000000' : 'A12345678'}
                          maxLength={idType === 'sa_id' ? 13 : 20}
                        />
                      </div>
                      <DocUpload
                        label="Front of ID / Photo page"
                        docKey="id-front"
                        value={docFrontUrl}
                        uploading={uploadingDoc === 'id-front'}
                        onFile={(f) => uploadDocumentFile(f, 'id-front', setDocFrontUrl)}
                      />
                      <DocUpload
                        label="Back of ID (optional for passport)"
                        docKey="id-back"
                        value={docBackUrl}
                        uploading={uploadingDoc === 'id-back'}
                        onFile={(f) => uploadDocumentFile(f, 'id-back', setDocBackUrl)}
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Registered business name</Label>
                        <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Acme Events (Pty) Ltd" />
                      </div>
                      <div className="space-y-2">
                        <Label>CIPC registration number</Label>
                        <Input value={regNumber} onChange={(e) => setRegNumber(e.target.value)} placeholder="2024/123456/07" />
                      </div>
                      <DocUpload
                        label="CIPC registration certificate"
                        docKey="reg-cert"
                        value={regCertUrl}
                        uploading={uploadingDoc === 'reg-cert'}
                        onFile={(f) => uploadDocumentFile(f, 'reg-cert', setRegCertUrl)}
                      />
                      <Separator />
                      <p className="text-sm font-medium text-muted-foreground">Representative&apos;s ID (director / member / sole proprietor)</p>
                      <div className="space-y-2">
                        <Label>Representative SA ID number</Label>
                        <Input value={repIdNumber} onChange={(e) => setRepIdNumber(e.target.value)} placeholder="0001010000000" maxLength={13} />
                      </div>
                      <DocUpload
                        label="Representative — front of ID"
                        docKey="rep-front"
                        value={repFrontUrl}
                        uploading={uploadingDoc === 'rep-front'}
                        onFile={(f) => uploadDocumentFile(f, 'rep-front', setRepFrontUrl)}
                      />
                      <DocUpload
                        label="Representative — back of ID"
                        docKey="rep-back"
                        value={repBackUrl}
                        uploading={uploadingDoc === 'rep-back'}
                        onFile={(f) => uploadDocumentFile(f, 'rep-back', setRepBackUrl)}
                      />
                    </div>
                  )}

                  <Button
                    className="w-full"
                    disabled={submittingVerification || !verificationComplete || !!uploadingDoc}
                    onClick={handleSubmitVerification}
                  >
                    {submittingVerification ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                    Submit for review
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Documents are stored securely. Our team will review within 1–2 business days.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── SECURITY TAB ──────────────────────────────────────────────────── */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Two-factor authentication (2FA)</CardTitle>
              <CardDescription>
                Add an extra layer of security using an authenticator app (Google Authenticator, Microsoft Authenticator, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {loadingMfa ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />Checking 2FA status...
                </div>
              ) : mfaEnabled ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                    <ShieldCheck className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-700">2FA is enabled</p>
                      <p className="text-sm text-muted-foreground">Your account is protected with an authenticator app</p>
                    </div>
                  </div>
                  <Separator />
                  <p className="text-sm font-medium">Disable 2FA</p>
                  <p className="text-xs text-muted-foreground">This will remove 2FA protection from your account. Not recommended.</p>
                  <Button
                    variant="destructive"
                    onClick={handleUnenrollMfa}
                    disabled={unenrollingMfa}
                    size="sm"
                  >
                    {unenrollingMfa ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Disable 2FA
                  </Button>
                </div>
              ) : mfaQr ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium">Step 1 — Scan this QR code with your authenticator app</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mfaQr} alt="2FA QR code" className="w-48 h-48 border rounded-lg" />
                  {mfaSecret && (
                    <p className="text-xs text-muted-foreground break-all">
                      Or enter this key manually: <span className="font-mono font-semibold">{mfaSecret}</span>
                    </p>
                  )}
                  <Separator />
                  <p className="text-sm font-medium">Step 2 — Enter the 6-digit code from your app</p>
                  <Input
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="font-mono text-center text-lg tracking-widest w-36"
                    maxLength={6}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleVerifyMfa} disabled={verifyingMfa || mfaCode.length !== 6}>
                      {verifyingMfa ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                      Activate 2FA
                    </Button>
                    <Button variant="outline" onClick={() => { setMfaQr(null); setMfaSecret(null); setMfaFactorId(null); setMfaCode('') }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
                    <Smartphone className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <p className="font-medium">2FA is not enabled</p>
                      <p className="text-sm text-muted-foreground">Enable to protect your account with a second factor</p>
                    </div>
                    <Switch checked={false} onCheckedChange={() => handleEnrollMfa()} className="ml-auto" />
                  </div>
                  <Button onClick={handleEnrollMfa} disabled={enrollingMfa} variant="outline">
                    {enrollingMfa ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                    Set up 2FA
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── NOTIFICATIONS TAB ─────────────────────────────────────────────── */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification preferences</CardTitle>
              <CardDescription>Control what emails and in-app alerts you receive</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/settings/notifications">
                <Button variant="outline" className="w-full">
                  Manage notification preferences
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Document upload sub-component ─────────────────────────────────────────────

function DocUpload({
  label,
  docKey: _docKey,
  value,
  uploading,
  onFile,
}: {
  label: string
  docKey: string
  value: string
  uploading: boolean
  onFile: (f: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div
        className={`flex items-center gap-3 rounded-lg border-2 border-dashed p-3 cursor-pointer transition-colors ${value ? 'border-green-400 bg-green-50/40' : 'hover:border-muted-foreground'}`}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
        />
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : value ? (
          <CheckCircle className="h-5 w-5 text-green-600" />
        ) : (
          <Upload className="h-5 w-5 text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">
          {uploading ? 'Uploading...' : value ? 'Uploaded ✓ (click to replace)' : 'Click to upload (JPG, PNG or PDF, max 10MB)'}
        </p>
      </div>
    </div>
  )
}
