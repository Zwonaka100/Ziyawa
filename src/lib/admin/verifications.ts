/**
 * Verification queue for admin, shared by the API route and the server page.
 *
 * Note on what this carries: verification_requests holds ID numbers, bank
 * account numbers and document URLs. The table currently loads every field for
 * every row up front because the detail dialog reads from the already-fetched
 * row. That is more than a list view needs — the summary columns would do, with
 * the documents fetched when a row is actually opened. Left as-is here to keep
 * this a rendering change rather than a behaviour change; flagged for the
 * admin action audit.
 */

import { createAdminServiceClient } from '@/lib/admin-auth'

export const VERIFICATION_COLUMNS = `
  id, profile_id, entity_type, status, submitted_at, reviewed_at,
  rejection_reason, id_type, id_number, doc_front_url, doc_back_url,
  business_name, registration_number, company_reg_cert_url,
  rep_id_number, rep_id_front_url, rep_id_back_url,
  bank_code, bank_name, account_number, account_holder, legal_name, bank_document_url,
  profiles!verification_requests_profile_id_fkey!inner (id, full_name, email, avatar_url, is_organizer, is_artist, is_provider, is_verified, verified_at, verified_entity_type)
`

export type VerificationStatus = 'all' | 'pending' | 'approved' | 'rejected'

export async function listVerificationRequests(
  status: VerificationStatus = 'pending'
): Promise<Record<string, unknown>[]> {
  const supabaseAdmin = createAdminServiceClient()

  let query = supabaseAdmin
    .from('verification_requests')
    .select(VERIFICATION_COLUMNS)
    .order('submitted_at', { ascending: false })

  if (status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) {
    // Surface the cause — a bare catch here hid a PostgREST relationship error
    // for a long time and made this look like a generic outage.
    console.error('Failed to load verification requests:', error)
    throw new Error(error.message || 'Failed to load verification requests')
  }

  return (data ?? []) as unknown as Record<string, unknown>[]
}
