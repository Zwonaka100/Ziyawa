'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const COOKIE_CONSENT_KEY = 'ziyawa-cookie-consent'

// Consent lives in localStorage, which the server can't see. Reading it in
// useState's initialiser made the client's first render differ from the
// server's and threw a hydration error on every page. useSyncExternalStore
// renders the server snapshot (hidden) during hydration, then the real value.
const listeners = new Set<() => void>()

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  window.addEventListener('storage', onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onChange)
  }
}

// Covers "Got it" when storage is blocked, so the banner still closes.
let dismissedThisSession = false

function needsConsent() {
  if (dismissedThisSession) return false
  try {
    return !localStorage.getItem(COOKIE_CONSENT_KEY)
  } catch {
    // Storage blocked (private mode, strict settings) — show the notice.
    return true
  }
}

export function CookieConsent() {
  const visible = useSyncExternalStore(subscribe, needsConsent, () => false)

  const handleAccept = () => {
    dismissedThisSession = true
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted')
    } catch {}
    listeners.forEach((notify) => notify())
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
