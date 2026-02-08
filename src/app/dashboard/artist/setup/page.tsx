'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Loader2, Music } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PROVINCES, GENRES } from '@/lib/constants'
import { toast } from 'sonner'
import { useAuth } from '@/components/providers/auth-provider'

export default function ArtistSetupPage() {
  const router = useRouter()
  const { profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [checkingExisting, setCheckingExisting] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [artistId, setArtistId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    stage_name: '',
    bio: '',
    genre: '',
    base_price: '',
    location: '',
    advance_notice_days: '3',
    years_active: '',
    record_label: '',
    management_contact: '',
  })

  useEffect(() => {
    if (!profile) {
      router.push('/auth/signin')
      return
    }

    if (!profile.is_artist) {
      router.push('/profile')
      toast.error('You need to become an artist first')
      return
    }

    checkExistingArtist()
  }, [profile, router])

  const checkExistingArtist = async () => {
    if (!profile) return
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('profile_id', profile.id)
        .single()

      if (data && !error) {
        // Pre-fill form with existing data
        setArtistId(data.id)
        setFormData({
          stage_name: data.stage_name || '',
          bio: data.bio || '',
          genre: data.genre || '',
          base_price: data.base_price?.toString() || '',
          location: data.location || '',
          advance_notice_days: data.advance_notice_days?.toString() || '3',
          years_active: data.years_active?.toString() || '',
          record_label: data.record_label || '',
          management_contact: data.management_contact || '',
        })
        setIsEditing(true)
      }
    } catch (error) {
      console.error('Error checking existing artist:', error)
    } finally {
      setCheckingExisting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!profile) {
      toast.error('You must be logged in')
      return
    }

    if (!formData.stage_name.trim()) {
      toast.error('Stage name is required')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const artistData = {
        profile_id: profile.id,
        stage_name: formData.stage_name.trim(),
        bio: formData.bio.trim() || null,
        genre: formData.genre,
        base_price: parseFloat(formData.base_price) || 0,
        location: formData.location,
        advance_notice_days: parseInt(formData.advance_notice_days) || 3,
        years_active: formData.years_active ? parseInt(formData.years_active) : null,
        record_label: formData.record_label.trim() || null,
        management_contact: formData.management_contact.trim() || null,
        is_available: true,
      }

      if (isEditing && artistId) {
        // Update existing artist profile
        const { error } = await supabase
          .from('artists')
          .update(artistData)
          .eq('id', artistId)

        if (error) throw error
        toast.success('Artist profile updated!')
      } else {
        // Check if artist already exists (double-check)
        const { data: existing } = await supabase
          .from('artists')
          .select('id')
          .eq('profile_id', profile.id)
          .single()

        if (existing) {
          toast.error('You already have an artist profile. Refreshing...')
          await checkExistingArtist()
          setLoading(false)
          return
        }

        // Create new artist profile
        const { error: artistError } = await supabase
          .from('artists')
          .insert(artistData)

        if (artistError) throw artistError

        // Update profile role
        await supabase
          .from('profiles')
          .update({ role: 'artist' })
          .eq('id', profile.id)

        await refreshProfile()
        toast.success('Artist profile created! 🎤')
      }

      router.push('/dashboard/artist')
      
    } catch (error) {
      console.error('Error saving artist profile:', error)
      toast.error('Failed to save artist profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (checkingExisting || !profile) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {isEditing && (
        <Link href="/dashboard/artist" className="inline-flex items-center text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      )}

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
          <Music className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">
          {isEditing ? 'Edit Artist Profile' : 'Set Up Your Artist Profile'}
        </h1>
        <p className="text-muted-foreground">
          {isEditing 
            ? 'Update your artist information' 
            : 'Create your artist profile to start receiving booking requests'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Artist Information</CardTitle>
          <CardDescription>
            This information will be displayed on your public profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Stage Name */}
            <div>
              <Label htmlFor="stage_name">Stage Name *</Label>
              <Input
                id="stage_name"
                placeholder="Your artist/DJ name"
                value={formData.stage_name}
                onChange={(e) => updateField('stage_name', e.target.value)}
                required
              />
            </div>

            {/* Genre */}
            <div>
              <Label htmlFor="genre">Genre *</Label>
              <Select
                value={formData.genre}
                onValueChange={(value) => updateField('genre', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your primary genre" />
                </SelectTrigger>
                <SelectContent>
                  {GENRES.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div>
              <Label htmlFor="location">Location *</Label>
              <Select
                value={formData.location}
                onValueChange={(value) => updateField('location', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your province" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROVINCES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Base Price */}
            <div>
              <Label htmlFor="base_price">Base Price (ZAR) *</Label>
              <Input
                id="base_price"
                type="number"
                min="0"
                step="0.01"
                placeholder="Your starting price for bookings"
                value={formData.base_price}
                onChange={(e) => updateField('base_price', e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                This is your minimum rate. Organizers can offer more.
              </p>
            </div>

            {/* Advance Notice */}
            <div>
              <Label htmlFor="advance_notice_days">Advance Notice (Days)</Label>
              <Input
                id="advance_notice_days"
                type="number"
                min="0"
                placeholder="Minimum days notice for bookings"
                value={formData.advance_notice_days}
                onChange={(e) => updateField('advance_notice_days', e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                How many days in advance do you need to be booked?
              </p>
            </div>

            {/* Years Active */}
            <div>
              <Label htmlFor="years_active">Years Active</Label>
              <Input
                id="years_active"
                type="number"
                min="0"
                placeholder="How many years have you been performing?"
                value={formData.years_active}
                onChange={(e) => updateField('years_active', e.target.value)}
              />
            </div>

            {/* Record Label */}
            <div>
              <Label htmlFor="record_label">Record Label (if any)</Label>
              <Input
                id="record_label"
                placeholder="Your record label"
                value={formData.record_label}
                onChange={(e) => updateField('record_label', e.target.value)}
              />
            </div>

            {/* Management Contact */}
            <div>
              <Label htmlFor="management_contact">Management Contact</Label>
              <Input
                id="management_contact"
                placeholder="Manager's email or phone"
                value={formData.management_contact}
                onChange={(e) => updateField('management_contact', e.target.value)}
              />
            </div>

            {/* Bio */}
            <div>
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Tell organizers about yourself, your experience, and your music..."
                value={formData.bio}
                onChange={(e) => updateField('bio', e.target.value)}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Saving Changes...' : 'Creating Profile...'}
                </>
              ) : (
                isEditing ? 'Save Changes' : 'Create Artist Profile'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
