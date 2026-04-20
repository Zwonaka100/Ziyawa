/**
 * VERIFICATION SUBMIT API
 * POST /api/verification/submit
 *
 * Accepts a verification submission from an authenticated user.
 * Handles both individual (SA ID / passport) and business (CIPC) paths.
 * Documents are uploaded to Supabase storage by the client first;
 * this endpoint receives the storage paths (not raw files).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, is_verified, is_artist, is_organizer, is_provider')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.is_verified) {
      return NextResponse.json({ error: 'Your account is already verified' }, { status: 400 })
    }

    // Check for existing pending request
    const { data: existingPending } = await supabase
      .from('verification_requests')
      .select('id, status')
      .eq('profile_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingPending) {
      return NextResponse.json({
        error: 'You already have a pending verification request. Our team will review it within 1–2 business days.',
      }, { status: 400 })
    }

    const body = await request.json()
    const { entity_type } = body

    if (!entity_type || !['individual', 'business'].includes(entity_type)) {
      return NextResponse.json({ error: 'entity_type must be individual or business' }, { status: 400 })
    }

    let insertData: Record<string, unknown> = {
      profile_id: user.id,
      entity_type,
      status: 'pending',
    }

    if (entity_type === 'individual') {
      const { id_type, id_number, doc_front_url, doc_back_url } = body

      if (!id_type || !['sa_id', 'passport'].includes(id_type)) {
        return NextResponse.json({ error: 'id_type must be sa_id or passport' }, { status: 400 })
      }
      if (!id_number?.trim()) {
        return NextResponse.json({ error: 'ID number is required' }, { status: 400 })
      }
      if (!doc_front_url) {
        return NextResponse.json({ error: 'Front document photo is required' }, { status: 400 })
      }

      // Basic SA ID format validation (13 digits)
      if (id_type === 'sa_id' && !/^\d{13}$/.test(id_number.trim())) {
        return NextResponse.json({ error: 'SA ID number must be 13 digits' }, { status: 400 })
      }

      insertData = {
        ...insertData,
        id_type,
        id_number: id_number.trim(),
        doc_front_url,
        doc_back_url: doc_back_url || null,
      }
    } else {
      // Business
      const { business_name, registration_number, company_reg_cert_url, rep_id_number, rep_id_front_url, rep_id_back_url } = body

      if (!business_name?.trim()) {
        return NextResponse.json({ error: 'Business name is required' }, { status: 400 })
      }
      if (!registration_number?.trim()) {
        return NextResponse.json({ error: 'CIPC registration number is required' }, { status: 400 })
      }
      if (!company_reg_cert_url) {
        return NextResponse.json({ error: 'CIPC registration certificate upload is required' }, { status: 400 })
      }
      if (!rep_id_number?.trim()) {
        return NextResponse.json({ error: 'Representative ID number is required' }, { status: 400 })
      }
      if (!rep_id_front_url) {
        return NextResponse.json({ error: 'Representative ID front photo is required' }, { status: 400 })
      }

      insertData = {
        ...insertData,
        business_name: business_name.trim(),
        registration_number: registration_number.trim(),
        company_reg_cert_url,
        rep_id_number: rep_id_number.trim(),
        rep_id_front_url,
        rep_id_back_url: rep_id_back_url || null,
      }
    }

    const { data: request_, error: insertError } = await supabase
      .from('verification_requests')
      .insert(insertData)
      .select('id')
      .single()

    if (insertError || !request_) {
      console.error('Verification insert error:', insertError)
      return NextResponse.json({ error: 'Failed to submit verification request' }, { status: 500 })
    }

    // Notify the user that their request was received
    await createNotification({
      userId: user.id,
      type: 'profile_verified',
      title: 'Verification submitted',
      message: 'Your verification documents have been received. Our team will review within 1–2 business days.',
      link: '/dashboard/settings?tab=verification',
      sendEmail: false,
    })

    return NextResponse.json({
      success: true,
      message: 'Verification submitted. Our team will review within 1–2 business days.',
      requestId: request_.id,
    })
  } catch (error) {
    console.error('Verification submit error:', error)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: requests, error } = await supabase
      .from('verification_requests')
      .select('id, entity_type, status, submitted_at, reviewed_at, rejection_reason, id_type, business_name')
      .eq('profile_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(5)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch verification status' }, { status: 500 })
    }

    return NextResponse.json({ requests: requests ?? [] })
  } catch (error) {
    console.error('Verification fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch verification status' }, { status: 500 })
  }
}
