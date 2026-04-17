import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { releaseEligibleHeldFunds } from '@/lib/payments/escrow'
import { captureServerError, logOpsEvent } from '@/lib/monitoring'

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
    logOpsEvent('payments-release', 'warn', 'Unauthorized release attempt blocked')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await releaseEligibleHeldFunds({
    transactionId: request.nextUrl.searchParams.get('transactionId') || undefined,
    eventId: request.nextUrl.searchParams.get('eventId') || undefined,
    bookingId: request.nextUrl.searchParams.get('bookingId') || undefined,
  })

  logOpsEvent('payments-release', 'info', 'Held-funds release run completed', { result })
  return NextResponse.json({ success: true, result })
}

export async function GET(request: NextRequest) {
  try {
    return await handleRelease(request)
  } catch (error) {
    captureServerError('payments-release', error)
    return NextResponse.json({ error: 'Release run failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handleRelease(request)
  } catch (error) {
    captureServerError('payments-release', error)
    return NextResponse.json({ error: 'Release run failed' }, { status: 500 })
  }
}
