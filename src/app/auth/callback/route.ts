import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { needsWelcome, WELCOME_PATH } from '@/lib/onboarding'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Where the user was headed before auth (e.g. back to an event, or the
  // password-reset form). Same-site paths only.
  const nextParam = searchParams.get('next')
  const next = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : null

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', data.user.id)
        .single()
      
      // Admins go to admin panel, regular users go to profile
      if (profile?.is_admin === true) {
        return NextResponse.redirect(`${origin}/admin`)
      }
      
      // Regular users go where they were headed (never interrupt a purchase
      // with the welcome), otherwise first-timers get the Groovist welcome.
      if (next) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      if (await needsWelcome(supabase, data.user.id)) {
        return NextResponse.redirect(`${origin}${WELCOME_PATH}`)
      }
      return NextResponse.redirect(`${origin}/profile`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/error`)
}
