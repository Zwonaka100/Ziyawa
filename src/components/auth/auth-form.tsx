'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Mail, Lock } from 'lucide-react'

type AuthMode = 'signin' | 'signup' | 'forgot-password'

interface AuthFormProps {
  onSuccess?: () => void
  defaultMode?: AuthMode
}

export function AuthForm({ onSuccess, defaultMode = 'signin' }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>(defaultMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const supabase = createClient()

  const getRedirectUrl = () => {
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return `${baseUrl}/auth/callback`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (mode === 'signup') {
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
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError
        onSuccess?.()
        
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
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
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
