import type { SupabaseClient } from '@supabase/supabase-js'

export const WELCOME_PATH = '/welcome'

/**
 * True only when this user has never seen (or skipped) the Groovist welcome.
 *
 * Deliberately fails closed: any error — including the onboarded_at column not
 * existing yet (migration 039) — means "don't show it", so sign-in behaves
 * exactly as before rather than trapping someone on a broken welcome screen.
 */
export async function needsWelcome(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('onboarded_at')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return false
  return data.onboarded_at === null
}
