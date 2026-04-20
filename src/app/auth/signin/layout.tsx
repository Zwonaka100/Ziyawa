import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to Ziyawa to discover events, book artists, and manage your entertainment experience across South Africa.',
}

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children
}
