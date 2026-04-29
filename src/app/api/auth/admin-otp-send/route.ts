import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { randomInt, createHash } from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

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

  // Send the code via email
  const { error: emailError } = await resend.emails.send({
    from: process.env.FROM_EMAIL ?? 'noreply@zande.io',
    to: user.email,
    subject: 'Ziyawa Admin — Your verification code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="margin-bottom:8px">Admin verification code</h2>
        <p style="color:#555;margin-bottom:24px">Hi ${profile.full_name ?? 'Admin'},</p>
        <p style="color:#555">Enter this code to access the Ziyawa admin panel:</p>
        <div style="font-size:40px;font-weight:700;letter-spacing:12px;font-family:monospace;text-align:center;padding:24px;background:#f5f5f5;border-radius:8px;margin:24px 0">
          ${code}
        </div>
        <p style="color:#888;font-size:13px">This code expires in <strong>10 minutes</strong>. If you didn't try to sign in, you can safely ignore this email.</p>
      </div>
    `,
  })

  if (emailError) {
    return NextResponse.json({ error: 'Failed to send email. Please try again.' }, { status: 500 })
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
