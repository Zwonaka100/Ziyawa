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
import { Loader2, Wrench, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { 
  type ServiceCategory, 
  type SaProvince,
  SERVICE_CATEGORY_LABELS 
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
  const [advanceNoticeDays, setAdvanceNoticeDays] = useState(3)

  useEffect(() => {
    if (!profile) {
      router.push('/auth/signin')
      return
    }

    if (!profile.is_provider) {
      router.push('/profile')
      toast.error('You need to become a provider first')
      return
    }

    checkExistingProvider()
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
        setAdvanceNoticeDays(data.advance_notice_days)
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
      
      const providerData = {
        profile_id: profile!.id,
        business_name: businessName.trim(),
        description: description.trim() || null,
        primary_category: primaryCategory,
        location: location,
        business_phone: businessPhone.trim() || null,
        business_email: businessEmail.trim() || null,
        website: website.trim() || null,
        advance_notice_days: advanceNoticeDays,
      }

      if (isEditing) {
        // Update existing
        const { error } = await supabase
          .from('providers')
          .update(providerData)
          .eq('profile_id', profile!.id)

        if (error) throw error
        toast.success('Provider profile updated!')
      } else {
        // Create new
        const { error } = await supabase
          .from('providers')
          .insert(providerData)

        if (error) throw error
        toast.success('Provider profile created! 🎉')
      }

      router.push('/dashboard/provider')
    } catch (error) {
      console.error('Error saving provider:', error)
      toast.error('Failed to save provider profile')
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
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-orange-100 rounded-full mb-4">
          <Wrench className="h-8 w-8 text-orange-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2">
          {isEditing ? 'Edit Provider Profile' : 'Set Up Your Provider Profile'}
        </h1>
        <p className="text-muted-foreground">
          {isEditing 
            ? 'Update your business information' 
            : 'Tell organisers about your services'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>
            This information will be displayed on your public profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business Name */}
            <div>
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                placeholder="e.g., SoundPro SA"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">About Your Business</Label>
              <Textarea
                id="description"
                placeholder="Tell organisers what makes your services special..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            {/* Primary Category */}
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
                You can offer services in multiple categories
              </p>
            </div>

            {/* Location */}
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

            {/* Contact Information */}
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

            {/* Website */}
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

            {/* Advance Notice */}
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
                How many days notice do you need before a booking?
              </p>
            </div>

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
              {isEditing ? 'Save Changes' : 'Create Provider Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
