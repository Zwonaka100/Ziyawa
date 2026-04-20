'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Loader2,
  Wallet,
  Calendar,
  Music,
  Ticket,
  ArrowRight,
  Wrench,
  Shield,
  Settings,
  CheckCircle,
  Info,
} from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { formatCurrency } from '@/lib/helpers'

// Get all roles as badges
function getRoleBadges(profile: {
  is_admin?: boolean
  admin_role?: string | null
  is_organizer?: boolean
  is_artist?: boolean
  is_provider?: boolean
  is_verified?: boolean
}) {
  const badges = []
  if (profile.is_admin) {
    badges.push({
      label: profile.admin_role === 'super_admin' ? 'Super Admin' : 'Admin',
      variant: 'destructive' as const,
    })
  }
  if (profile.is_organizer) badges.push({ label: 'Organiser', variant: 'default' as const })
  if (profile.is_artist) badges.push({ label: 'Artist', variant: 'secondary' as const })
  if (profile.is_provider) badges.push({ label: 'Crew', variant: 'outline' as const })
  if (badges.length === 0) badges.push({ label: 'Groovist', variant: 'outline' as const })
  return badges
}

type ProfileLike = {
  is_organizer?: boolean
  is_artist?: boolean
  is_provider?: boolean
  is_verified?: boolean
}

function RoleExplainer({ profile }: { profile: ProfileLike }) {
  const isOrganizer = !!profile.is_organizer
  const isArtist = !!profile.is_artist
  const isProvider = !!profile.is_provider
  const isVerified = !!profile.is_verified
  const activeRoles = [isOrganizer, isArtist, isProvider].filter(Boolean).length

  // Lines describing what each active role does
  const activeLines: string[] = []
  if (isOrganizer) activeLines.push('As an Organiser, you can create events, sell tickets, and manage your lineup.')
  if (isArtist) activeLines.push('As an Artist, you can receive booking requests and manage your performance schedule.')
  if (isProvider) activeLines.push('As Crew, you can offer event services and get hired for gigs across the platform.')
  if (activeRoles === 0) activeLines.push('As a Groovist, you can discover events and manage your tickets.')

  // Suggestions for roles not yet active
  const suggestions: { label: string; hint: string }[] = []
  if (!isOrganizer) suggestions.push({ label: 'Organiser', hint: 'host your own events and sell tickets' })
  if (!isArtist) suggestions.push({ label: 'Artist', hint: 'get booked for gigs and performances' })
  if (!isProvider) suggestions.push({ label: 'Crew', hint: 'offer technical or creative services at events' })

  const verificationNote = !isVerified
    ? 'Verify your identity in Settings to unlock withdrawals and get a verified badge on your public profile.'
    : null

  return (
    <Card className="mb-6 bg-muted/40 border-muted">
      <CardContent className="pt-5 pb-5">
        <div className="flex gap-3">
          <div className="mt-0.5 shrink-0">
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-2 text-sm">
            {/* What you can do now */}
            <div className="space-y-1">
              {activeLines.map((line) => (
                <p key={line} className="text-foreground">{line}</p>
              ))}
            </div>

            {/* Upgrade suggestions */}
            {suggestions.length > 0 && (
              <p className="text-muted-foreground">
                Want to do more?{' '}
                {suggestions.map((s, i) => (
                  <span key={s.label}>
                    <span className="font-medium text-foreground">Activate {s.label}</span>
                    {' '}to {s.hint}
                    {i < suggestions.length - 1 ? ', or ' : '.'}
                  </span>
                ))}
                {' '}Head to{' '}
                <Link href="/dashboard/settings?tab=account" className="underline underline-offset-2 text-foreground font-medium">
                  Settings → Account
                </Link>
                {' '}to activate.
              </p>
            )}

            {/* Verification nudge */}
            {verificationNote && (
              <p className="text-muted-foreground">
                {verificationNote}{' '}
                <Link href="/dashboard/settings?tab=verification" className="underline underline-offset-2 text-foreground font-medium">
                  Verify now →
                </Link>
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && (!user || !profile)) {
      router.replace('/auth/signin')
    }
  }, [authLoading, user, profile, router])

  if (authLoading || !user || !profile) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const isProvider = (profile as { is_provider?: boolean }).is_provider

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
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{profile.full_name || 'User'}</h1>
                {profile.is_verified && (
                  <Badge className="bg-amber-500 text-white">
                    <CheckCircle className="h-3 w-3 mr-1" />Verified
                  </Badge>
                )}
              </div>
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

      {/* Admin panel link */}
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
                  <p className="text-sm text-muted-foreground">Manage users, events, reports, and platform settings</p>
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

      {/* Quick dashboard links */}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
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

        {isProvider && (
          <Link href="/dashboard/provider">
            <Card className="hover:border-orange-500 transition-colors cursor-pointer h-full">
              <CardContent className="pt-6 flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Wrench className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">Crew Dashboard</p>
                  <p className="text-sm text-muted-foreground">Manage work and services</p>
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

      {/* Contextual role explainer */}
      <RoleExplainer profile={profile} />

      {/* Settings CTA */}
      <Card className="border-dashed">
        <CardContent className="pt-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Account Settings</p>
              <p className="text-sm text-muted-foreground">
                Edit your profile, upgrade your account, verify your identity, manage security
              </p>
            </div>
          </div>
          <Link href="/dashboard/settings">
            <Button variant="outline">
              Go to Settings
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

