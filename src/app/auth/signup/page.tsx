import { AuthForm } from '@/components/auth/auth-form'

export const metadata = {
  title: 'Sign Up | Ziyawa',
  description: 'Create your Ziyawa account and join the movement',
}

export default function SignUpPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <AuthForm defaultMode="signup" />
    </div>
  )
}
