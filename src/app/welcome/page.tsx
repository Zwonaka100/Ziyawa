import type { Metadata } from 'next'
import WelcomeClient from './welcome-client'

export const metadata: Metadata = {
  title: 'Welcome',
  robots: { index: false, follow: false },
}

export default function WelcomePage() {
  return <WelcomeClient />
}
