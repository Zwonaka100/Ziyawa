'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function AcceptEventWorkContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const [message, setMessage] = useState('Activating your Crew access...')
  const [error, setError] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setError('This invite link is missing a token.')
      return
    }

    if (loading) return

    if (!user) {
      router.replace(`/auth/signin?next=${encodeURIComponent(`/dashboard/event-work/accept?token=${token}`)}`)
      return
    }

    let isActive = true

    async function acceptInvite() {
      try {
        const response = await fetch('/api/event-work/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to activate crew access')
        }

        if (isActive) {
          setMessage('Access activated. Opening your Crew Dashboard...')
          router.replace('/dashboard/provider')
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Failed to activate crew access')
        }
      }
    }

    acceptInvite()

    return () => {
      isActive = false
    }
  }, [loading, router, searchParams, user])

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Crew Access
          </CardTitle>
          <CardDescription>Activating your invited crew workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <>
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Link href="/dashboard/provider">
                  <Button>Open Crew Dashboard</Button>
                </Link>
                <Link href="/profile">
                  <Button variant="outline">Back to Profile</Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{message}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AcceptEventWorkPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[300px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <AcceptEventWorkContent />
    </Suspense>
  )
}
