'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Loader2, 
  Wallet, 
  Calendar, 
  Music, 
  Ticket, 
  ArrowRight, 
  CheckCircle,
  Sparkles,
  Users,
  Wrench,
  Shield
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { formatCurrency } from '@/lib/helpers'
import { toast } from 'sonner'

// Get all roles as badges
function getRoleBadges(profile: { is_admin?: boolean; admin_role?: string | null; is_organizer?: boolean; is_artist?: boolean; is_provider?: boolean }) {
  const badges = []
  if (profile.is_admin) {
    badges.push({ 
      label: profile.admin_role === 'super_admin' ? 'Super Admin' : 'Admin', 
      variant: 'destructive' as const 
    })
  }
  if (profile.is_organizer) badges.push({ label: 'Organiser', variant: 'default' as const })
  if (profile.is_artist) badges.push({ label: 'Artist', variant: 'secondary' as const })
  if (profile.is_provider) badges.push({ label: 'Provider', variant: 'outline' as const, className: 'border-orange-500 text-orange-600' })
  if (badges.length === 0) badges.push({ label: 'Groovist', variant: 'outline' as const })
  return badges
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')

  if (!user || !profile) {
    router.push('/auth/signin')
    return null
  }

  const handleUpgrade = async (role: 'organizer' | 'artist' | 'provider') => {
    setUpgrading(role)
    try {
      const supabase = createClient()
      const updateData = role === 'organizer' 
        ? { is_organizer: true }
        : role === 'artist'
        ? { is_artist: true }
        : { is_provider: true }
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id)

      if (error) throw error

      await refreshProfile()
      toast.success(
        role === 'organizer' 
          ? 'You are now an Event Organiser! 🎉' 
          : role === 'artist'
          ? 'You are now an Artist! 🎤'
          : 'You are now a Provider! 🔧'
      )
      
      // Redirect to provider setup if becoming a provider
      if (role === 'provider') {
        router.push('/dashboard/provider/setup')
      }
    } catch (error) {
      console.error('Error upgrading profile:', error)
      toast.error('Failed to upgrade. Please try again.')
    } finally {
      setUpgrading(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
        })
        .eq('id', profile.id)

      if (error) throw error

      await refreshProfile()
      toast.success('Profile updated!')
      
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">
                {profile.full_name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{profile.full_name || 'User'}</h1>
              <p className="text-muted-foreground">{profile.email}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {getRoleBadges(profile).map((badge) => (
                  <Badge key={badge.label} variant={badge.variant}>{badge.label}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Dashboard Link - Only for admins */}
      {profile.is_admin && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Admin Dashboard</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage users, events, reports, and platform settings
                  </p>
                </div>
              </div>
              <Link href="/admin">
                <Button variant="destructive">
                  Go to Admin Panel
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions based on roles */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Link href="/dashboard/tickets">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardContent className="pt-6 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Ticket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">My Tickets</p>
                <p className="text-sm text-muted-foreground">View purchased tickets</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        {profile.is_organizer && (
          <Link href="/dashboard/organizer">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardContent className="pt-6 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">My Events</p>
                  <p className="text-sm text-muted-foreground">Manage your events</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {profile.is_artist && (
          <Link href="/dashboard/artist">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardContent className="pt-6 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Music className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Artist Dashboard</p>
                  <p className="text-sm text-muted-foreground">Manage bookings</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {profile.is_provider && (
          <Link href="/dashboard/provider">
            <Card className="hover:border-orange-500 transition-colors cursor-pointer h-full">
              <CardContent className="pt-6 flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Wrench className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">Provider Dashboard</p>
                  <p className="text-sm text-muted-foreground">Manage services</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        <Link href="/wallet">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardContent className="pt-6 flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Wallet className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Wallet</p>
                <p className="text-sm text-green-600 font-semibold">{formatCurrency(profile.wallet_balance)}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Role Upgrade Cards - HIDDEN FOR ADMINS */}
      {profile.is_admin !== true && (!profile.is_organizer || !profile.is_artist || !profile.is_provider) && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Upgrade Your Profile
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Become an Organiser */}
            {!profile.is_organizer && (
              <Card className="border-2 border-dashed hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Become an Organiser</CardTitle>
                      <CardDescription>Host events on Ziyawa</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Create and manage events
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Book artists for your events
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Sell tickets and earn revenue
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Track earnings & request payouts
                    </li>
                  </ul>
                  <Button 
                    className="w-full" 
                    onClick={() => handleUpgrade('organizer')}
                    disabled={upgrading === 'organizer'}
                  >
                    {upgrading === 'organizer' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ArrowRight className="h-4 w-4 mr-2" />
                    )}
                    Become an Organiser
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Become an Artist */}
            {!profile.is_artist && (
              <Card className="border-2 border-dashed hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-secondary/50 rounded-xl">
                      <Music className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Become an Artist</CardTitle>
                      <CardDescription>Get booked for events</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Create your artist profile
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Get discovered by organisers
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Accept or decline bookings
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Earn from performances
                    </li>
                  </ul>
                  <Button 
                    variant="secondary"
                    className="w-full" 
                    onClick={() => handleUpgrade('artist')}
                    disabled={upgrading === 'artist'}
                  >
                    {upgrading === 'artist' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ArrowRight className="h-4 w-4 mr-2" />
                    )}
                    Become an Artist
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Become a Provider */}
            {!profile.is_provider && (
              <Card className="border-2 border-dashed hover:border-orange-500 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-500/10 rounded-xl">
                      <Wrench className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Become a Provider</CardTitle>
                      <CardDescription>Join the crew</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Offer your services
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Get hired by organisers
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Grow your business
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Earn from events
                    </li>
                  </ul>
                  <Button 
                    variant="outline"
                    className="w-full border-orange-500 text-orange-600 hover:bg-orange-50" 
                    onClick={() => handleUpgrade('provider')}
                    disabled={upgrading === 'provider'}
                  >
                    {upgrading === 'provider' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ArrowRight className="h-4 w-4 mr-2" />
                    )}
                    Become a Provider
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Already unlocked roles status - HIDDEN FOR ADMINS */}
      {profile.is_admin !== true && (profile.is_organizer || profile.is_artist || profile.is_provider) && (
        <Card className="mb-6 bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                You&apos;re a {[
                  profile.is_organizer && 'Organiser',
                  profile.is_artist && 'Artist',
                  profile.is_provider && 'Provider'
                ].filter(Boolean).join(', ')} — 
                {!profile.is_organizer && !profile.is_artist && !profile.is_provider && ' unlock more roles above!'}
                {profile.is_organizer && profile.is_artist && profile.is_provider && ' you have access to all features!'}
                {!(profile.is_organizer && profile.is_artist && profile.is_provider) && (
                  <>
                    {!profile.is_organizer && ' upgrade to Organiser to create events.'}
                    {!profile.is_artist && ' upgrade to Artist to get booked.'}
                    {!profile.is_provider && ' upgrade to Provider to offer services.'}
                  </>
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>
            Update your personal information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={profile.email}
                disabled
                autoComplete="email"
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed
              </p>
            </div>

            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+27 XX XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>

            <Separator />

            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
