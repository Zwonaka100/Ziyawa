'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminOtpPage() {
  return (
    <Suspense>
      <AdminOtpPageInner />
    </Suspense>
  )
}

function AdminOtpPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const next = searchParams.get('next') ?? '/admin'

  const [email, setEmail] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-send OTP on mount (ref guard prevents double-fire from React StrictMode)
  const hasSentRef = useRef(false)
  useEffect(() => {
    if (hasSentRef.current) return
    hasSentRef.current = true
    void sendOtp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startCooldown = () => {
    setCooldown(30)
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const sendOtp = async () => {
    setSending(true)
    try {
      const res = await fetch('/api/auth/admin-otp-send', { method: 'POST' })
      const json = await res.json() as { sent?: boolean; email?: string; error?: string }

      if (!res.ok) {
        // If not an admin, redirect home
        if (res.status === 403) {
          toast.error('Admin access only.')
          router.replace('/')
          return
        }
        // If not logged in, redirect to sign in
        if (res.status === 401) {
          router.replace(`/auth/signin?redirect=${encodeURIComponent(next)}`)
          return
        }
        toast.error(json.error ?? 'Failed to send code.')
        return
      }

      setEmail(json.email ?? null)
      setSent(true)
      startCooldown()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleResend = async () => {
    setSent(false)
    setCode('')
    await sendOtp()
  }

  const handleVerify = async () => {
    if (code.length !== 6) return
    setVerifying(true)
    try {
      const res = await fetch('/api/auth/admin-otp-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const json = await res.json() as { success?: boolean; error?: string }

      if (!res.ok) {
        toast.error(json.error ?? 'Verification failed.')
        setCode('')
        return
      }

      toast.success('Identity confirmed')
      // Hard navigation ensures the new cookie is sent with the next request
      window.location.replace(next)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {sent ? (
              <Mail className="h-6 w-6 text-primary" />
            ) : (
              <ShieldCheck className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle>Admin verification</CardTitle>
          <CardDescription>
            {sent && email
              ? `We sent a 6-digit code to ${email}`
              : 'Sending a verification code to your email…'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {sending && !sent ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sent ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="otp-code">Verification code</Label>
                <Input
                  id="otp-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="font-mono text-center text-xl tracking-widest"
                  maxLength={6}
                  inputMode="numeric"
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

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || sending}
                  className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {cooldown > 0
                    ? `Resend code in ${cooldown}s`
                    : sending
                    ? 'Sending…'
                    : "Didn't receive it? Resend"}
                </button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
