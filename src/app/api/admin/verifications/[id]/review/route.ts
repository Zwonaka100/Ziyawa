/**
 * ADMIN VERIFICATION REVIEW API
 * POST /api/admin/verifications/[id]/review
 *
 * Approves or rejects a verification request.
 * Requires admin or super_admin role.
 * Uses service role client to bypass RLS.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createNotification } from '@/lib/notifications'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params

    // Auth check
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

    const body = await request.json()
    const { action, rejection_reason } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
    }
    if (action === 'reject' && !rejection_reason?.trim()) {
      return NextResponse.json({ error: 'rejection_reason is required when rejecting' }, { status: 400 })
    }

    // Fetch the request
    const { data: verificationRequest, error: fetchError } = await supabaseAdmin
      .from('verification_requests')
      .select('id, profile_id, entity_type, status')
      .eq('id', requestId)
      .single()

    if (fetchError || !verificationRequest) {
      return NextResponse.json({ error: 'Verification request not found' }, { status: 404 })
    }

    if (verificationRequest.status !== 'pending') {
      return NextResponse.json({
        error: `This request is already ${verificationRequest.status}`,
      }, { status: 400 })
    }

    const now = new Date().toISOString()

    if (action === 'approve') {
      // Update the request
      await supabaseAdmin
        .from('verification_requests')
        .update({
          status: 'approved',
          reviewed_at: now,
          reviewed_by: user.id,
        })
        .eq('id', requestId)

      // Mark the profile as verified
      await supabaseAdmin
        .from('profiles')
        .update({
          is_verified: true,
          verified_at: now,
          verified_entity_type: verificationRequest.entity_type,
        })
        .eq('id', verificationRequest.profile_id)

      // Notify the user
      await createNotification({
        userId: verificationRequest.profile_id,
        type: 'profile_verified',
        title: 'Identity verified ✓',
        message: 'Congratulations! Your identity has been verified. You can now withdraw funds from your wallet.',
        link: '/dashboard/settings?tab=verification',
        sendEmail: true,
      })

      return NextResponse.json({
        success: true,
        message: 'Verification approved. User has been notified.',
      })
    }

    // Reject
    await supabaseAdmin
      .from('verification_requests')
      .update({
        status: 'rejected',
        reviewed_at: now,
        reviewed_by: user.id,
        rejection_reason: rejection_reason.trim(),
      })
      .eq('id', requestId)

    // Notify the user
    await createNotification({
      userId: verificationRequest.profile_id,
      type: 'profile_verified',
      title: 'Verification unsuccessful',
      message: `Your verification was not approved. Reason: ${rejection_reason.trim()}. Please resubmit with the correct documents.`,
      link: '/dashboard/settings?tab=verification',
      sendEmail: true,
    })

    return NextResponse.json({
      success: true,
      message: 'Verification rejected. User has been notified.',
    })
  } catch (error) {
    console.error('Verification review error:', error)
    return NextResponse.json({ error: 'Review failed' }, { status: 500 })
  }
}
