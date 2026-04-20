import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseUrl = rawUrl.startsWith('http') ? rawUrl : 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export async function proxy(request: NextRequest) {
  const response = await updateSession(request)
  const { pathname } = request.nextUrl

  // MFA enforcement for /admin/* routes
  if (pathname.startsWith('/admin') && !pathname.startsWith('/auth/mfa')) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal) {
        const factors = aal.nextLevel === 'aal2' || aal.currentLevel === 'aal2'
        const enrolled = aal.nextLevel === 'aal2'

        // Admin has MFA enrolled but current session is aal1 → challenge
        if (enrolled && aal.currentLevel === 'aal1') {
          const next = encodeURIComponent(pathname)
          return NextResponse.redirect(new URL(`/auth/mfa-challenge?next=${next}`, request.url))
        }

        // Check if admin — if they have no MFA enrolled at all, redirect to setup
        // Only enforce MFA setup if they ARE an admin (checked via profile)
        if (!factors && !enrolled) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single()

          if (profile?.is_admin) {
            return NextResponse.redirect(new URL('/auth/mfa-setup', request.url))
          }
        }
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
