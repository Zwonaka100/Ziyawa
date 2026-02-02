/**
 * Supabase Server Client
 * Use this for server-side operations in Server Components and Route Handlers
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Validate URL or use dummy for build time
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseUrl = rawUrl.startsWith('http') ? rawUrl : 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Using any type for demo purposes - in production, use proper Database types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<any>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
}
