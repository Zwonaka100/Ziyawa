/**
 * ADMIN VERIFICATION DOCUMENT ACCESS API
 * POST /api/admin/verifications/document
 *
 * Mints a short-lived signed URL for a verification document so an admin can
 * actually view it during review. The `verification-documents` bucket is
 * private, so a public URL will not resolve — a signed URL is the only way in.
 * Requires admin or super_admin role. Uses the service role client so access
 * does not depend on storage RLS.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'verification-documents'
const SIGNED_URL_TTL_SECONDS = 300

/**
 * Stored values have historically been either a bare storage path
 * ("verification/<uid>/id-front-123.pdf") or a full public URL from an older
 * getPublicUrl() call. Reduce both to the bare object path.
 */
function normalizeStoragePath(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null

  let path = value
  const publicMarker = `/storage/v1/object/public/${BUCKET}/`
  const signMarker = `/storage/v1/object/sign/${BUCKET}/`

  for (const marker of [publicMarker, signMarker]) {
    const index = path.indexOf(marker)
    if (index !== -1) {
      path = path.slice(index + marker.length)
      break
    }
  }

  // Drop any query string left over from a previous signed/public URL.
  path = path.split('?')[0]

  try {
    path = decodeURIComponent(path)
  } catch {
    // Leave the raw value if it isn't valid percent-encoding.
  }

  path = path.replace(/^\/+/, '')

  // Everything lives under verification/<profile_id>/... — refuse anything else
  // so this endpoint can't be used to read unrelated objects.
  if (!path.startsWith('verification/') || path.includes('..')) return null

  return path
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, is_admin, admin_role')
      .eq('id', user.id)
      .single()

    if (!adminProfile?.is_admin && !['admin', 'super_admin'].includes(adminProfile?.admin_role ?? '')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({})) as { path?: string }
    const path = typeof body.path === 'string' ? normalizeStoragePath(body.path) : null

    if (!path) {
      return NextResponse.json({ error: 'A valid verification document path is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

    if (error || !data?.signedUrl) {
      console.error('Verification document signing error:', error)
      return NextResponse.json({ error: 'Could not open this document' }, { status: 404 })
    }

    return NextResponse.json({ url: data.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS })
  } catch (error) {
    console.error('Verification document access error:', error)
    return NextResponse.json({ error: 'Could not open this document' }, { status: 500 })
  }
}
