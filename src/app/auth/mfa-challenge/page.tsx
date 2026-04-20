'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function MfaChallengePage() {
  return (
    <Suspense>
      <MfaChallengePageInner />
    </Suspense>
  )
}

function MfaChallengePageInner() {
  const searchParams = useSearchParams()
  const supabase = createClient()

  const next = searchParams.get('next') ?? '/admin'
  const [code, setCode] = useState('')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    const fetchFactor = async () => {
      const { data } = await supabase.auth.mfa.listFactors()
      const totp = data?.totp?.[0]
      if (totp) setFactorId(totp.id)
      setLoading(false)
    }
    void fetchFactor()
  }, [supabase])

  const handleVerify = async () => {
    if (!factorId || code.length !== 6) return
    setVerifying(true)
    try {
      // Use server-side route so the aal2 session cookie is set by the server
      // before we navigate — client-side mfa.verify() doesn't update the
      // server cookie jar that the middleware reads.
      const res = await fetch('/api/auth/mfa-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId, code }),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Verification failed')
      toast.success('Identity confirmed')
      window.location.replace(next)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid code. Please try again.')
      setCode('')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>Enter the 6-digit code from your authenticator app to access the admin panel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !factorId ? (
            <p className="text-center text-sm text-muted-foreground">
              No 2FA factor found. Please set up 2FA first.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="mfa-code">Authentication code</Label>
                <Input
                  id="mfa-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="font-mono text-center text-xl tracking-widest"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleVerify() }}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleVerify}
                disabled={verifying || code.length !== 6}
              >
                {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verify &amp; continue
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
