'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Mail, Lock } from 'lucide-react'

type AuthMode = 'signin' | 'signup' | 'forgot-password'

interface AuthFormProps {
  onSuccess?: () => void
  defaultMode?: AuthMode
}

export function AuthForm({ onSuccess: _onSuccess, defaultMode = 'signin' }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>(defaultMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
  const nextPath = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('next')
    : null

  const supabase = createClient()

  const getRedirectUrl = () => {
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return `${baseUrl}/auth/callback`
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getRedirectUrl(),
        },
      })
      if (oauthError) throw oauthError
      // Browser will redirect to Google — no further action needed
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
      setGoogleLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (mode === 'signup') {
        if (!acceptedTerms) {
          setError('You must accept the Terms of Service and Privacy Policy to create an account.')
          setLoading(false)
          return
        }
        // Sign up new user
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getRedirectUrl(),
            data: {
              full_name: fullName,
            },
          },
        })

        if (signUpError) throw signUpError
        setMessage('Check your email to confirm your account!')
        
      } else if (mode === 'signin') {
        // Sign in with password
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError
        
        // Check if user is admin and redirect accordingly
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', data.user.id)
            .single()
          
          if (profile?.is_admin === true) {
            // Admin users go to admin panel
            router.push('/admin')
            router.refresh()
            return
          }
        }
        
        // Regular users go to their intended destination if provided
        router.push(nextPath || '/profile')
        router.refresh()
        
      } else if (mode === 'forgot-password') {
        // Send password reset email
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${getRedirectUrl()}?next=/auth/reset-password`,
        })

        if (resetError) throw resetError
        setMessage('Check your email for password reset instructions!')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    switch (mode) {
      case 'signup': return 'Create account'
      case 'forgot-password': return 'Reset Password'
      default: return 'Welcome back'
    }
  }

  const getDescription = () => {
    switch (mode) {
      case 'signup': return 'Join Ziyawa and start grooving'
      case 'forgot-password': return 'We\'ll send you a reset link'
      default: return 'Sign in to your Ziyawa account'
    }
  }

  const getButtonText = () => {
    if (loading) return 'Loading...'
    switch (mode) {
      case 'signup': return 'Create Account'
      case 'forgot-password': return 'Send Reset Link'
      default: return 'Sign In'
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{getTitle()}</CardTitle>
        <CardDescription>{getDescription()}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          {(mode === 'signin' || mode === 'signup') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-primary"
                    onClick={() => setMode('forgot-password')}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                minLength={6}
              />
            </div>
          )}

          {mode === 'signup' && (
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
              />
              <label htmlFor="terms" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                I agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-primary">Terms of Service</a>{' '}
                and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-primary">Privacy Policy</a>.
              </label>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>
          )}

          {message && (
            <p className="text-sm text-green-600 bg-green-50 p-3 rounded-md">{message}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {mode === 'forgot-password' && <Mail className="mr-2 h-4 w-4" />}
            {(mode === 'signin' || mode === 'signup') && <Lock className="mr-2 h-4 w-4" />}
            {getButtonText()}
          </Button>
        </form>

        {(mode === 'signin' || mode === 'signup') && (
          <>
            <div className="relative my-5">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                or
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              )}
              Continue with Google
            </Button>
          </>
        )}

        {/* Navigation Links */}
        <div className="mt-4 text-center text-sm space-y-2">
          {mode === 'signin' && (
            <p>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={() => setMode('signup')}
              >
                Sign up
              </button>
            </p>
          )}
          
          {mode === 'signup' && (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={() => setMode('signin')}
              >
                Sign in
              </button>
            </p>
          )}
          
          {mode === 'forgot-password' && (
            <p>
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={() => setMode('signin')}
              >
                ← Back to sign in
              </button>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
