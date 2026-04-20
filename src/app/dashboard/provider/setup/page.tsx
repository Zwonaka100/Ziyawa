'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Loader2, Users, ArrowRight, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import {
  type ServiceCategory,
  type SaProvince,
  type PriceType,
  type CrewWorkMode,
  SERVICE_CATEGORY_LABELS,
} from '@/types/database'
import { toast } from 'sonner'

// Province labels
const PROVINCE_LABELS: Record<SaProvince, string> = {
  gauteng: 'Gauteng',
  western_cape: 'Western Cape',
  kwazulu_natal: 'KwaZulu-Natal',
  eastern_cape: 'Eastern Cape',
  free_state: 'Free State',
  mpumalanga: 'Mpumalanga',
  limpopo: 'Limpopo',
  north_west: 'North West',
  northern_cape: 'Northern Cape',
}

export default function ProviderSetupPage() {
  const router = useRouter()
  const { profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [checkingExisting, setCheckingExisting] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  
  // Form state
  const [businessName, setBusinessName] = useState('')
  const [description, setDescription] = useState('')
  const [primaryCategory, setPrimaryCategory] = useState<ServiceCategory>('sound_lighting')
  const [location, setLocation] = useState<SaProvince>('gauteng')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [isAvailable, setIsAvailable] = useState(true)
  const [advanceNoticeDays, setAdvanceNoticeDays] = useState(3)
  const [workMode, setWorkMode] = useState<CrewWorkMode>('offering_services')
  const [activeSection, setActiveSection] = useState<'work' | 'services'>('work')
  const [baseRate, setBaseRate] = useState('')
  const [rateType, setRateType] = useState<PriceType>('daily')
  const [availabilityNotes, setAvailabilityNotes] = useState('')
  const [workRoles, setWorkRoles] = useState('')

  useEffect(() => {
    if (!profile) {
      router.push('/auth/signin')
      return
    }

    checkExistingProvider()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, router])

  const checkExistingProvider = async () => {
    if (!profile) return
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('profile_id', profile.id)
        .single()

      if (data && !error) {
        // Pre-fill form with existing data
        setBusinessName(data.business_name)
        setDescription(data.description || '')
        setPrimaryCategory(data.primary_category)
        setLocation(data.location)
        setBusinessPhone(data.business_phone || '')
        setBusinessEmail(data.business_email || '')
        setWebsite(data.website || '')
        setIsAvailable(data.is_available !== false)
        setAdvanceNoticeDays(data.advance_notice_days)
        setWorkMode(data.work_mode || 'offering_services')
        setActiveSection(data.work_mode === 'offering_services' ? 'services' : 'work')
        setBaseRate(data.base_rate ? String(data.base_rate) : '')
        setRateType(data.rate_type || 'daily')
        setAvailabilityNotes(data.availability_notes || '')
        setWorkRoles(Array.isArray(data.work_roles) ? data.work_roles.join(', ') : '')
        setIsEditing(true)
      }
    } catch (error) {
      console.error('Error checking existing provider:', error)
    } finally {
      setCheckingExisting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!businessName.trim()) {
      toast.error('Business name is required')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      
      await supabase
        .from('profiles')
        .update({ is_provider: true })
        .eq('id', profile!.id)

      const legacyProviderData = {
        profile_id: profile!.id,
        business_name: businessName.trim(),
        description: description.trim() || null,
        primary_category: primaryCategory,
        location: location,
        business_phone: businessPhone.trim() || null,
        business_email: businessEmail.trim() || null,
        website: website.trim() || null,
        is_available: isAvailable,
        advance_notice_days: advanceNoticeDays,
      }

      const providerData = {
        ...legacyProviderData,
        work_mode: workMode,
        base_rate: baseRate.trim() ? Number(baseRate) : null,
        rate_type: rateType,
        availability_notes: availabilityNotes.trim() || null,
        work_roles: workRoles.split(',').map((role) => role.trim()).filter(Boolean),
      }

      const saveProvider = async (payload: typeof providerData | typeof legacyProviderData) => {
        if (isEditing) {
          return supabase
            .from('providers')
            .update(payload)
            .eq('profile_id', profile!.id)
        }

        return supabase
          .from('providers')
          .insert(payload)
      }

      let saveResult = await saveProvider(providerData)
      let usedLegacyFallback = false

      if (saveResult.error && String(saveResult.error.message || '').toLowerCase().includes('work_mode')) {
        saveResult = await saveProvider(legacyProviderData)
        usedLegacyFallback = !saveResult.error
      }

      if (saveResult.error) throw saveResult.error

      await refreshProfile()
      toast.success(
        usedLegacyFallback
          ? 'Crew profile saved. Apply the latest Crew migration to unlock rates and availability fields.'
          : isEditing
            ? 'Crew profile updated!'
            : 'Crew profile created! 🎉'
      )
      router.push('/dashboard/provider')
    } catch (error) {
      console.error('Error saving crew profile:', error)
      toast.error('Failed to save crew profile')
    } finally {
      setLoading(false)
    }
  }

  if (checkingExisting || !profile) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {isEditing && (
        <button
          onClick={() => router.push('/dashboard/provider')}
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 text-sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </button>
      )}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-orange-100 rounded-full mb-4">
          <Users className="h-8 w-8 text-orange-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2">
          {isEditing ? 'Edit Crew Profile' : 'Set Up Your Crew Profile'}
        </h1>
        <p className="text-muted-foreground">
          {isEditing
            ? 'Update your crew identity, rates, and availability'
            : 'Choose whether you want My Work, My Services, or both on Ziyawa.'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Crew Profile Information</CardTitle>
          <CardDescription>
            Start with one focus now if you want, and enable the other later from your Crew Dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ── STEP 1: Work Mode (always at top) ── */}
            <div className="rounded-lg border-2 border-orange-200 bg-orange-50/40 p-4 space-y-3">
              <p className="font-semibold text-sm text-foreground">How do you want to work on Ziyawa?</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {([
                  { value: 'looking_for_work', label: 'My Work', desc: 'Get hired for event staff roles' },
                  { value: 'offering_services', label: 'My Services', desc: 'Offer bookable services' },
                  { value: 'both', label: 'Both', desc: 'Work and services' },
                ] as { value: CrewWorkMode; label: string; desc: string }[]).map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setWorkMode(value)
                      if (value === 'looking_for_work') setActiveSection('work')
                      if (value === 'offering_services') setActiveSection('services')
                    }}
                    className={`rounded-lg border-2 p-3 text-left transition-colors ${
                      workMode === value
                        ? 'border-orange-500 bg-white shadow-sm'
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    }`}
                  >
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                This stays synced with My Work and My Services in your Crew Dashboard.
              </p>
            </div>

            {/* ── STEP 2: Section toggle for "Both" mode ── */}
            {workMode === 'both' && (
              <div className="flex rounded-lg border bg-muted/20 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveSection('work')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeSection === 'work'
                      ? 'bg-white shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Work Profile Settings
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('services')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeSection === 'services'
                      ? 'bg-white shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Services Settings
                </button>
              </div>
            )}

            {/* ── COMMON FIELDS (always visible) ── */}
            <div>
              <Label htmlFor="businessName">Display Name or Business Name *</Label>
              <Input
                id="businessName"
                placeholder="e.g., SoundPro SA or Sipho Crew"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">About You or Your Business</Label>
              <Textarea
                id="description"
                placeholder="Tell organisers what you do well, how you work, and what makes your business reliable..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="location">Location *</Label>
              <Select value={location} onValueChange={(v) => setLocation(v as SaProvince)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROVINCE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Business Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+27 XX XXX XXXX"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email">Business Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@business.co.za"
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://www.yourbusiness.co.za"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            {/* ── WORK PROFILE FIELDS ── */}
            {(workMode === 'looking_for_work' || (workMode === 'both' && activeSection === 'work')) && (
              <div className="space-y-4 rounded-lg border border-neutral-200 p-4 bg-muted/20">
                <p className="text-sm font-semibold text-foreground">Work Profile</p>
                <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                  This rate is only used when organizers hire you for event work. Service prices are set per service in My Services.
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="baseRate">Starting rate for event work</Label>
                    <Input
                      id="baseRate"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="500"
                      value={baseRate}
                      onChange={(e) => setBaseRate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rateType">Rate type</Label>
                    <Select value={rateType} onValueChange={(v) => setRateType(v as PriceType)}>
                      <SelectTrigger id="rateType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Per hour</SelectItem>
                        <SelectItem value="daily">Per day</SelectItem>
                        <SelectItem value="fixed">Fixed price</SelectItem>
                        <SelectItem value="negotiable">Negotiable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="workRoles">Skills &amp; Roles</Label>
                  <Input
                    id="workRoles"
                    placeholder="e.g. Door staff, Guest list, Runner, Ops, MC support"
                    value={workRoles}
                    onChange={(e) => setWorkRoles(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Comma-separated list of roles you can fill at events.
                  </p>
                </div>
                <div>
                  <Label htmlFor="availabilityNotes">Availability and work notes</Label>
                  <Textarea
                    id="availabilityNotes"
                    placeholder="Available on weekends, open to Gauteng and nearby travel, own transport, short-notice okay..."
                    value={availabilityNotes}
                    onChange={(e) => setAvailabilityNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* ── SERVICES FIELDS ── */}
            {(workMode === 'offering_services' || (workMode === 'both' && activeSection === 'services')) && (
              <div className="space-y-4 rounded-lg border border-neutral-200 p-4 bg-muted/20">
                <p className="text-sm font-semibold text-foreground">Services Settings</p>
                <div>
                  <Label htmlFor="category">Primary Service Category *</Label>
                  <Select value={primaryCategory} onValueChange={(v) => setPrimaryCategory(v as ServiceCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SERVICE_CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    You can list services in multiple categories. This is your main one.
                  </p>
                </div>
                <div>
                  <Label htmlFor="availability">Booking Availability</Label>
                  <Select value={isAvailable ? 'available' : 'paused'} onValueChange={(value) => setIsAvailable(value === 'available')}>
                    <SelectTrigger id="availability">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available for bookings</SelectItem>
                      <SelectItem value="paused">Pause bookings for now</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Toggle this anytime when your team is fully booked.
                  </p>
                </div>
                <div>
                  <Label htmlFor="notice">Minimum Advance Notice (days)</Label>
                  <Input
                    id="notice"
                    type="number"
                    min={0}
                    max={90}
                    value={advanceNoticeDays}
                    onChange={(e) => setAdvanceNoticeDays(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    How many days notice do you need before a service booking?
                  </p>
                </div>
              </div>
            )}

            {/* Submit */}
            <Button 
              type="submit" 
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              {isEditing ? 'Save Crew Changes' : 'Create Crew Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
