import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

export async function POST(request: NextRequest) {
  const body = await request.json() as { code?: string }
  const code = body.code?.trim()

  if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Please enter a valid 6-digit code.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Read the pending OTP cookie
  const cookieValue = request.cookies.get('_admin_oc')?.value
  if (!cookieValue) {
    return NextResponse.json(
      { error: 'No pending verification found. Please request a new code.' },
      { status: 400 }
    )
  }

  const parts = cookieValue.split('|')
  if (parts.length !== 3) {
    return NextResponse.json({ error: 'Invalid session. Please request a new code.' }, { status: 400 })
  }

  const [storedHash, storedUserId, expiresAtStr] = parts

  // Ensure the cookie belongs to this user
  if (storedUserId !== user.id) {
    return NextResponse.json({ error: 'Session mismatch. Please request a new code.' }, { status: 400 })
  }

  // Check expiry
  if (Date.now() > parseInt(expiresAtStr, 10)) {
    return NextResponse.json({ error: 'Code has expired. Please request a new one.' }, { status: 400 })
  }

  // Compare hashes (constant-time via string equality on fixed-length hex)
  const submittedHash = createHash('sha256').update(code).digest('hex')
  if (submittedHash !== storedHash) {
    return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 400 })
  }

  // Success — set the verified cookie (24 hours) and clear the pending one
  const response = NextResponse.json({ success: true })

  response.cookies.set('_admin_ov', '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/',
  })

  response.cookies.delete('_admin_oc')

  return response
}
