'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PROVINCES, GENRES } from '@/lib/constants'
import { toast } from 'sonner'
import { useAuth } from '@/components/providers/auth-provider'

export default function ArtistSetupPage() {
  const router = useRouter()
  const { profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    stage_name: '',
    bio: '',
    genre: '',
    base_price: '',
    location: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!profile) {
      toast.error('You must be logged in')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Create artist profile
      const { error: artistError } = await supabase
        .from('artists')
        .insert({
          profile_id: profile.id,
          stage_name: formData.stage_name,
          bio: formData.bio || null,
          genre: formData.genre,
          base_price: parseFloat(formData.base_price) || 0,
          location: formData.location,
          is_available: true,
        })

      if (artistError) throw artistError

      // Update profile role to artist
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'artist' })
        .eq('id', profile.id)

      if (profileError) throw profileError

      await refreshProfile()
      toast.success('Artist profile created!')
      router.push('/dashboard/artist')
      
    } catch (error) {
      console.error('Error creating artist profile:', error)
      toast.error('Failed to create artist profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Set Up Your Artist Profile</CardTitle>
          <CardDescription>
            Create your artist profile to start receiving booking requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div>
              <Label htmlFor="genre">Genre *</Label>
              <Select
                value={formData.genre}
                onValueChange={(value) => updateField('genre', value)}
                required
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

            <div>
              <Label htmlFor="location">Location *</Label>
              <Select
                value={formData.location}
                onValueChange={(value) => updateField('location', value)}
                required
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
                  Creating Profile...
                </>
              ) : (
                'Create Artist Profile'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
