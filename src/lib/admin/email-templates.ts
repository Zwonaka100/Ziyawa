/**
 * Email template reads for admin, shared by the templates page, the compose
 * pages and their API route.
 *
 * Read-only. Nothing here sends anything.
 */

import { createAdminServiceClient } from '@/lib/admin-auth'

export async function listEmailTemplates(category = 'all') {
  const supabaseAdmin = createAdminServiceClient()

  let query = supabaseAdmin.from('email_templates').select('*').order('name')
  if (category !== 'all') query = query.eq('category', category)

  const { data, error } = await query
  if (error) {
    console.error('Failed to load email templates:', error)
    return []
  }
  return data || []
}

/** The lighter projection the compose screens need for their template picker. */
export async function listTemplateOptions() {
  const supabaseAdmin = createAdminServiceClient()

  const { data, error } = await supabaseAdmin
    .from('email_templates')
    .select('id, name, subject, body')
    .order('name')

  if (error) {
    console.error('Failed to load email templates:', error)
    return []
  }
  return data || []
}
