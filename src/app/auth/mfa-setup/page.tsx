'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function MfaSetupPage() {
  const supabase = createClient()

  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const handleStart = async () => {
    setEnrolling(true)
    try {
      // Clean up any stale unverified factors before enrolling.
      // Without this, a previously abandoned setup attempt blocks new enrollment.
      const { data: existing } = await supabase.auth.mfa.listFactors()
      const stale = existing?.totp?.filter((f) => f.status === 'unverified') ?? []
      for (const f of stale) {
        await supabase.auth.mfa.unenroll({ factorId: f.id })
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Admin authenticator',
      })
      if (error) throw error
      setFactorId(data.id)
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
    } catch {
      toast.error('Something went wrong. Please try again or contact support.')
    } finally {
      setEnrolling(false)
    }
  }

  const handleVerify = async () => {
    if (!factorId || code.length !== 6) return
    setVerifying(true)
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId })
      if (cErr) throw cErr
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      })
      if (vErr) throw vErr
      toast.success('2FA enabled — admin access granted')
      // Hard navigation ensures the updated aal2 session cookie is sent with the next request
      window.location.replace('/admin')
    } catch {
      toast.error('That code didn\'t work. Wait for the next 6-digit code and try again.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle>Admin 2FA required</CardTitle>
          <CardDescription>
            Admin access requires two-factor authentication to protect the platform. Set up an authenticator app to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!qrCode ? (
            <Button className="w-full" onClick={handleStart} disabled={enrolling}>
              {enrolling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              {enrolling ? 'Preparing setup…' : 'Set up 2FA now'}
            </Button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-medium">Step 1 — Scan this QR code with Google Authenticator or similar</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="2FA QR code" className="mx-auto w-48 h-48 border rounded-lg" />
              {secret && (
                <p className="text-xs text-muted-foreground break-all text-center">
                  Manual key: <span className="font-mono font-semibold">{secret}</span>
                </p>
              )}
              <div className="space-y-2">
                <Label>Step 2 — Enter the 6-digit code from your app</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="font-mono text-center text-lg tracking-widest"
                  maxLength={6}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                />
                <p className="text-xs text-muted-foreground">
                  If the code is rejected, wait for a new code to appear in the app and try again. Make sure your phone&apos;s date &amp; time is set to <span className="font-medium">automatic</span> in Settings.
                </p>
              </div>
              <Button
                className="w-full"
                onClick={handleVerify}
                disabled={verifying || code.length !== 6}
              >
                {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Activate 2FA &amp; enter admin panel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
