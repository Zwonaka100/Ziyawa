/**
 * Supabase Browser Client
 * Use this for client-side operations in React components
 */
import { createBrowserClient } from '@supabase/ssr'

// Validate URL or use dummy for build time
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseUrl = rawUrl.startsWith('http') ? rawUrl : 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Using any type for demo purposes - in production, use proper Database types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createClient() {
  return createBrowserClient<any>(
    supabaseUrl,
    supabaseAnonKey
  )
}
