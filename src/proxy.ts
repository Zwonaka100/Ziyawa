import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { isAdminUserId } from '@/lib/admin-auth'

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

    // Signed in, OTP done — but are they actually an admin? This has to happen
    // here rather than only in admin/layout.tsx, because Next renders a layout
    // and the page beneath it concurrently. A redirect from the layout does not
    // stop a server-rendered admin page from running its queries and streaming
    // its output into the same response: a signed-in non-admin requesting
    // /admin was measured receiving the dashboard's RSC payload alongside the
    // redirect. The middleware is the only gate that runs before rendering.
    if (!(await isAdminUserId(user.id))) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
