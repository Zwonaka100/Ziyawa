import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { releaseEligibleHeldFunds } from '@/lib/payments/escrow'

async function isAdminRequest() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return false
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, admin_role')
    .eq('id', user.id)
    .single()

  return Boolean(profile?.is_admin || profile?.admin_role === 'super_admin')
}

function hasValidCronSecret(request: NextRequest) {
  const configuredSecret = process.env.CRON_SECRET
  if (!configuredSecret) {
    return false
  }

  const authHeader = request.headers.get('authorization') || ''
  const querySecret = request.nextUrl.searchParams.get('secret') || ''

  return authHeader === `Bearer ${configuredSecret}` || querySecret === configuredSecret
}

async function handleRelease(request: NextRequest) {
  const allowed = hasValidCronSecret(request) || await isAdminRequest()

  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await releaseEligibleHeldFunds({
    transactionId: request.nextUrl.searchParams.get('transactionId') || undefined,
    eventId: request.nextUrl.searchParams.get('eventId') || undefined,
    bookingId: request.nextUrl.searchParams.get('bookingId') || undefined,
  })

  return NextResponse.json({ success: true, result })
}

export async function GET(request: NextRequest) {
  return handleRelease(request)
}

export async function POST(request: NextRequest) {
  return handleRelease(request)
}
