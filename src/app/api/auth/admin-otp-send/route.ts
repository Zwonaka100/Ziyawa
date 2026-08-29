import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { randomInt, createHash } from 'crypto'
import { emailWrapper } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY)

function getFromAddress() {
  const configured = process.env.FROM_EMAIL?.trim()
  if (configured) return configured

  if (process.env.NODE_ENV === 'production') {
    return 'noreply@ziyawa.com'
  }

  return 'onboarding@resend.dev'
}

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Verify this user is actually an admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Generate a 6-digit code and hash it for storage
  const code = String(randomInt(100000, 999999))
  const hash = createHash('sha256').update(code).digest('hex')
  const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes

  // In development, always log the code to the server console as a fallback
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n🔐 ADMIN OTP for ${user.email}: ${code}\n`)
  }

  // Send the code via email
  const { error: emailError } = await resend.emails.send({
    from: getFromAddress(),
    to: user.email,
    subject: 'Ziyawa Admin — Your verification code',
    html: emailWrapper(`
      <h1>Admin verification code</h1>
      <p>Hi ${profile.full_name ?? 'Admin'},</p>
      <p>Enter this code to access the Ziyawa admin panel:</p>
      <div class="highlight-box" style="text-align: center;">
        <p style="margin: 0; font-size: 40px; font-weight: 700; letter-spacing: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; color: #111111;">${code}</p>
      </div>
      <p style="font-size: 13px; color: #6b7280;">This code expires in <strong>10 minutes</strong>. If you did not try to sign in, you can safely ignore this email.</p>
    `),
  })

  if (emailError) {
    const message = typeof emailError === 'object' && emailError && 'message' in emailError
      ? String((emailError as { message?: string }).message)
      : 'Failed to send email. Please try again.'

    console.error('Admin OTP email send failed:', message)

    const friendlyError = message.includes('verified') || message.includes('domain') || message.includes('from')
      ? 'Email delivery failed because the sender address is not verified in Resend. Please configure a verified sender or try again with a verified address.'
      : 'Failed to send email. Please try again.'

    return NextResponse.json({ error: friendlyError }, { status: 500 })
  }

  // Store the hash + metadata in a short-lived httpOnly cookie
  const cookieValue = `${hash}|${user.id}|${expiresAt}`
  const response = NextResponse.json({ sent: true, email: user.email })
  response.cookies.set('_admin_oc', cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  return response
}
