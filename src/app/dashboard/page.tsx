import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/signin')
  }

  // Get profile to determine which dashboard to show
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, is_organizer, is_artist, is_provider')
    .eq('id', user.id)
    .single()

  // Redirect based on user role
  if (profile?.is_admin) {
    redirect('/admin')
  } else if (profile?.is_organizer) {
    redirect('/dashboard/organizer')
  } else if (profile?.is_artist) {
    redirect('/dashboard/artist')
  } else if (profile?.is_provider) {
    redirect('/dashboard/provider')
  } else {
    // Default to profile for regular users
    redirect('/profile')
  }
}
