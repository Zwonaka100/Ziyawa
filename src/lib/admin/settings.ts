/**
 * Platform settings rows for admin, shared by the API route and the server page.
 */

import { createAdminServiceClient } from '@/lib/admin-auth'

export async function loadPlatformSettings(): Promise<{ key: string; value: unknown }[]> {
  const supabaseAdmin = createAdminServiceClient()

  const { data, error } = await supabaseAdmin.from('platform_settings').select('key, value')
  if (error) {
    console.error('Error fetching settings:', error)
    throw new Error('Failed to load settings')
  }
  return (data || []) as { key: string; value: unknown }[]
}
