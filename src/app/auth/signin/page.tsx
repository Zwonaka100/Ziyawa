import { AuthForm } from '@/components/auth/auth-form'

export const metadata = {
  title: 'Sign In | Ziyawa',
  description: 'Sign in to your Ziyawa account',
}

export default function SignInPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <AuthForm defaultMode="signin" />
    </div>
  )
}
