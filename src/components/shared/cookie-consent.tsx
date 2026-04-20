'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const COOKIE_CONSENT_KEY = 'ziyawa-cookie-consent'

export function CookieConsent() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    return !localStorage.getItem(COOKIE_CONSENT_KEY)
  })

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-4 shadow-lg">
      <div className="container mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 max-w-4xl">
        <p className="text-sm text-muted-foreground">
          This site uses essential cookies for authentication and security.
          No advertising or tracking cookies are used.
          By continuing, you accept our cookie use as outlined in our{' '}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-primary">
            Privacy Policy
          </Link>.
        </p>
        <Button onClick={handleAccept} size="sm" className="shrink-0">
          Got it
        </Button>
      </div>
    </div>
  )
}
