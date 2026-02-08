'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthForm } from '@/components/auth/auth-form'
import { Loader2 } from 'lucide-react'

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const handleSuccess = () => {
    // The AuthForm will handle admin redirect internally
    // For non-admins, redirect to the specified page or home
    router.push(redirect)
    router.refresh()
  }

  return <AuthForm defaultMode="signin" onSuccess={handleSuccess} />
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
