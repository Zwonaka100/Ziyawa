'use client'

import { Suspense } from 'react'
import { AuthForm } from '@/components/auth/auth-form'
import { Loader2 } from 'lucide-react'

function SignInContent() {
  // AuthForm handles all redirects internally:
  // - Admins go to /admin
  // - Regular users go to /ziwaphi
  return <AuthForm defaultMode="signin" />
}

export default function SignInPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <Suspense fallback={
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <SignInContent />
      </Suspense>
    </div>
  )
}
