/**
 * The single definition of "is this caller an admin".
 *
 * This existed in sixteen hand-rolled copies across the admin API routes, and
 * they had already drifted: fifteen accepted `is_admin` OR an `admin_role` of
 * admin/super_admin, while /api/admin/send-email checked `is_admin` alone. An
 * admin_role-only admin could approve payouts and review verifications but not
 * send an email. Sixteen copies is also how a seventeenth route eventually
 * ships with no check at all.
 *
 * Two entry points over one core:
 *   requireAdminApi()  — for route handlers; returns a 401/403 response to send
 *   requireAdminPage() — for server components; redirects and never returns
 */

import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/** admin_role values that carry full admin rights, alongside the is_admin flag. */
const ADMIN_ROLES = ['admin', 'super_admin']

export interface AdminContext {
  userId: string
  email: string | null
  fullName: string | null
  adminRole: string | null
}

type AdminOutcome =
  | { status: 'ok'; admin: AdminContext }
  | { status: 'signed-out' }
  | { status: 'not-admin' }

/**
 * Service-role client for admin reads that legitimately cross user boundaries.
 * Never hand this to anything that runs in a browser.
 */
export function createAdminServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function resolveAdmin(): Promise<AdminOutcome> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) return { status: 'signed-out' }

  // Read through the service client so this check does not depend on the
  // caller's own RLS access to profiles — that access is being narrowed.
  const { data: profile, error } = await createAdminServiceClient()
    .from('profiles')
    .select('id, is_admin, admin_role, email, full_name')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    if (error) console.error('Admin check could not read the profile:', error)
    return { status: 'not-admin' }
  }

  const isAdmin =
    profile.is_admin === true || ADMIN_ROLES.includes(profile.admin_role ?? '')

  if (!isAdmin) return { status: 'not-admin' }

  return {
    status: 'ok',
    admin: {
      userId: profile.id,
      email: profile.email ?? null,
      fullName: profile.full_name ?? null,
      adminRole: profile.admin_role ?? null,
    },
  }
}

/**
 * For API route handlers. Returns either the admin context, or the response to
 * return to the caller — 401 when signed out, 403 when signed in without rights.
 *
 *   const gate = await requireAdminApi()
 *   if ('response' in gate) return gate.response
 *   // gate.admin is available from here
 */
export async function requireAdminApi(): Promise<
  { admin: AdminContext } | { response: NextResponse }
> {
  const outcome = await resolveAdmin()

  if (outcome.status === 'signed-out') {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (outcome.status === 'not-admin') {
    return { response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  }
  return { admin: outcome.admin }
}

/**
 * For server components. Redirects instead of returning, so a non-admin never
 * receives admin markup at all — unlike a client-side check, which sends the
 * page first and navigates away afterwards.
 */
export async function requireAdminPage(redirectTo = '/admin'): Promise<AdminContext> {
  const outcome = await resolveAdmin()

  if (outcome.status === 'signed-out') {
    redirect(`/auth/signin?redirect=${encodeURIComponent(redirectTo)}`)
  }
  if (outcome.status === 'not-admin') {
    redirect('/')
  }
  return outcome.admin
}

/**
 * Admin check for the proxy/middleware, where next/headers and next/navigation
 * are unavailable and the bundle needs to stay small - hence a plain REST call
 * rather than the Supabase client.
 *
 * This exists because gating in the layout is not sufficient on its own. Next
 * renders a layout and the page beneath it CONCURRENTLY; it does not wait for
 * the layout to resolve before rendering the page. So a redirect from the
 * layout still leaves a server-rendered admin page free to run its queries and
 * stream its output into the same response. Measured, not assumed: a signed-in
 * non-admin requesting /admin received a body containing the dashboard's own
 * RSC payload alongside the redirect instruction.
 *
 * The middleware runs before any of that, so it is the only place a gate can
 * stop the page from rendering at all.
 */
export async function isAdminUserId(userId: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    // Fail closed: without the means to check, nobody is an admin.
    console.error('Admin check cannot run - Supabase env vars are missing')
    return false
  }

  try {
    const response = await fetch(
      `${url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=is_admin,admin_role`,
      {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        cache: 'no-store',
      }
    )
    if (!response.ok) return false

    const rows = (await response.json()) as Array<{ is_admin: boolean | null; admin_role: string | null }>
    const profile = rows?.[0]
    if (!profile) return false

    return profile.is_admin === true || ADMIN_ROLES.includes(profile.admin_role ?? '')
  } catch (error) {
    console.error('Admin check failed:', error)
    return false
  }
}
