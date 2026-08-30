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
      .select('id, is_verified, verified_at, verified_entity_type, is_artist, is_organizer, is_provider')
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
    const { entity_type, bank_code, bank_name, account_number, account_holder, bank_document_url } = body

    if (!entity_type || !['individual', 'business'].includes(entity_type)) {
      return NextResponse.json({ error: 'entity_type must be individual or business' }, { status: 400 })
    }

    // Bank details are required: verification exists so we can pay people, and
    // an approved account with no payable destination is not much use.
    if (!bank_code || !bank_name || !account_number || !account_holder?.trim()) {
      return NextResponse.json(
        { error: 'Bank, account number and account holder name are all required' },
        { status: 400 }
      )
    }

    // The bank-issued document is the safeguard against a mistyped account
    // number, which nothing else in this flow can catch for ZAR accounts.
    if (!bank_document_url) {
      return NextResponse.json(
        { error: 'A bank confirmation letter or recent statement is required' },
        { status: 400 }
      )
    }

    // Account number length is not fixed across SA banks — Standard Bank issues
    // 9- and 11-digit numbers — so only sanity-check the shape.
    const normalizedAccount = String(account_number).replace(/\s/g, '')
    if (!/^\d{6,15}$/.test(normalizedAccount)) {
      return NextResponse.json({ error: 'Account number must be between 6 and 15 digits' }, { status: 400 })
    }

    // The account holder name is self-declared and CANNOT be machine-checked:
    // Paystack's resolve endpoint supports only NGN/USD/GHS/KES, not ZAR, and
    // createTransferRecipient accepts any account number without validating it.
    // An admin therefore compares this name against the ID document at review
    // time — that comparison is the only real safeguard available in SA.
    const declaredAccountHolder = String(account_holder).trim()

    let insertData: Record<string, unknown> = {
      profile_id: user.id,
      entity_type,
      status: 'pending',
      bank_code: String(bank_code),
      bank_name: String(bank_name),
      account_number: normalizedAccount,
      account_holder: declaredAccountHolder,
      bank_document_url: String(bank_document_url),
    }

    if (entity_type === 'individual') {
      const { id_type, id_number, doc_front_url, doc_back_url, legal_name } = body

      if (!id_type || !['sa_id', 'passport'].includes(id_type)) {
        return NextResponse.json({ error: 'id_type must be sa_id or passport' }, { status: 400 })
      }
      if (!id_number?.trim()) {
        return NextResponse.json({ error: 'ID number is required' }, { status: 400 })
      }
      // Required so there is something trustworthy to compare the bank account
      // holder against — profiles.full_name is usually the email handle.
      if (!legal_name?.trim()) {
        return NextResponse.json({ error: 'Your full name as it appears on your ID is required' }, { status: 400 })
      }
      if (!doc_front_url) {
        return NextResponse.json({ error: 'Front document photo is required' }, { status: 400 })
      }

      const normalizedDocFront = typeof doc_front_url === 'string' ? doc_front_url : ''
      const normalizedDocBack = typeof doc_back_url === 'string' ? doc_back_url : null

      // Basic SA ID format validation (13 digits)
      if (id_type === 'sa_id' && !/^\d{13}$/.test(id_number.trim())) {
        return NextResponse.json({ error: 'SA ID number must be 13 digits' }, { status: 400 })
      }

      insertData = {
        ...insertData,
        id_type,
        id_number: id_number.trim(),
        legal_name: legal_name.trim(),
        doc_front_url: normalizedDocFront,
        doc_back_url: normalizedDocBack || null,
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

      const normalizedRegCert = typeof company_reg_cert_url === 'string' ? company_reg_cert_url : ''
      const normalizedRepFront = typeof rep_id_front_url === 'string' ? rep_id_front_url : ''
      const normalizedRepBack = typeof rep_id_back_url === 'string' ? rep_id_back_url : null
      if (!rep_id_number?.trim()) {
        return NextResponse.json({ error: 'Representative ID number is required' }, { status: 400 })
      }
      if (!rep_id_front_url) {
        return NextResponse.json({ error: 'Representative ID front photo is required' }, { status: 400 })
      }

      insertData = {
        ...insertData,
        business_name: business_name.trim(),
        // The registered business name is the legal name for a company, so
        // both paths populate legal_name and downstream code needs no branch.
        legal_name: business_name.trim(),
        registration_number: registration_number.trim(),
        company_reg_cert_url: normalizedRegCert,
        rep_id_number: rep_id_number.trim(),
        rep_id_front_url: normalizedRepFront,
        rep_id_back_url: normalizedRepBack || null,
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

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('is_verified, verified_at, verified_entity_type')
      .eq('id', user.id)
      .single()

    const { data: requests, error } = await supabase
      .from('verification_requests')
      .select('id, entity_type, status, submitted_at, reviewed_at, rejection_reason, id_type, business_name')
      .eq('profile_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(5)

    if (error || profileError) {
      return NextResponse.json({ error: 'Failed to fetch verification status' }, { status: 500 })
    }

    return NextResponse.json({
      requests: requests ?? [],
      profile: profileData ? {
        is_verified: Boolean(profileData.is_verified),
        verified_at: profileData.verified_at,
        verified_entity_type: profileData.verified_entity_type,
      } : null,
    })
  } catch (error) {
    console.error('Verification fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch verification status' }, { status: 500 })
  }
}
