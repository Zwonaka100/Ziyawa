'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { AuthForm } from '@/components/auth/auth-form'

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const handleSuccess = () => {
    // The AuthForm will handle admin redirect internally
    // For non-admins, redirect to the specified page or home
    router.push(redirect)
    router.refresh()
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <AuthForm defaultMode="signin" onSuccess={handleSuccess} />
    </div>
  )
}
