'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PROVINCES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { SaProvince } from '@/types/database'

const PROVINCE_OPTIONS = Object.entries(PROVINCES) as [SaProvince, string][]

export default function WelcomeClient() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [province, setProvince] = useState<SaProvince | null>(null)
  const [saving, setSaving] = useState<'finish' | 'skip' | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/signin')
    }
  }, [authLoading, user, router])

  // Pre-select a province they've already set, and send anyone who has
  // already been welcomed on to Ziwaphi rather than showing it twice.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase
      .from('profiles')
      .select('location, onboarded_at')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return
        if (data.onboarded_at) {
          router.replace('/ziwaphi')
          return
        }
        if (data.location) setProvince(data.location as SaProvince)
      })
    return () => { cancelled = true }
  }, [user, supabase, router])

  const complete = async (mode: 'finish' | 'skip') => {
    if (!user) return
    setSaving(mode)
    const chosen = mode === 'finish' ? province : null
    const { error } = await supabase
      .from('profiles')
      .update({
        onboarded_at: new Date().toISOString(),
        ...(chosen ? { location: chosen } : {}),
      })
      .eq('id', user.id)

    // Never hold a Groovist hostage to a failed save — the worst case is they
    // see the welcome once more next time.
    if (error) console.error('Error saving welcome:', error)

    router.push(chosen ? `/ziwaphi?location=${chosen}` : '/ziwaphi')
  }

  if (authLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const fullName = profile?.full_name || (user.user_metadata?.full_name as string | undefined) || ''
  const firstName = fullName.trim().split(' ')[0]

  return (
    <div className="container mx-auto px-4 py-12 md:py-20 max-w-xl">
      <div className="text-center mb-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          For The Groovist
        </p>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">
          Welcome to Ziyawa{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="text-muted-foreground">
          Tickets on your phone, the whole crew sorted in one go, and nothing you were waiting for slipping past you.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <MapPin className="h-5 w-5 text-neutral-700" />
            </div>
            <div>
              <h2 className="font-semibold">Where do you usually groove?</h2>
              <p className="text-sm text-muted-foreground">
                We&apos;ll show you what&apos;s on nearby first. You can change it anytime.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Province">
            {PROVINCE_OPTIONS.map(([value, label]) => {
              const selected = province === value
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setProvince(selected ? null : value)}
                  className={cn(
                    'min-h-11 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                    selected
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-input bg-background hover:bg-neutral-50'
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-col gap-2">
        <Button size="lg" className="w-full" disabled={saving !== null} onClick={() => complete('finish')}>
          {saving === 'finish' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Find my next vibe
        </Button>
        <Button
          size="lg"
          variant="ghost"
          className="w-full text-muted-foreground"
          disabled={saving !== null}
          onClick={() => complete('skip')}
        >
          {saving === 'skip' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Skip for now
        </Button>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Perform, organise or offer services? You can switch that on anytime in{' '}
        <Link href="/dashboard/settings?tab=account" className="underline underline-offset-2 text-foreground font-medium">
          Settings
        </Link>
        .
      </p>
    </div>
  )
}
