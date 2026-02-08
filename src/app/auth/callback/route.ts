import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

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
      
      // Admins go to admin panel, regular users go to Ziwaphi
      if (profile?.is_admin === true) {
        return NextResponse.redirect(`${origin}/admin`)
      }
      
      // Non-admin users go to Ziwaphi page
      return NextResponse.redirect(`${origin}/ziwaphi`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/error`)
}
