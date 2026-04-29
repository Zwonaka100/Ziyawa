import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Email OTP enforcement for /admin/* routes (skip the OTP page itself)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/auth/admin-otp')) {
    // Not logged in → sign in
    if (!user) {
      const signinUrl = new URL('/auth/signin', request.url)
      signinUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(signinUrl)
    }

    // OTP not yet verified for this session → challenge
    const otpVerified = request.cookies.get('_admin_ov')
    if (!otpVerified) {
      const otpUrl = new URL('/auth/admin-otp', request.url)
      otpUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(otpUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
