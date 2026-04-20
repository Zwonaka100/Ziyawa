import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { factorId, code } = await request.json() as { factorId?: string; code?: string }

  if (!factorId || !code || code.length !== 6) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId })
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 })

  const { error: vErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  })
  if (vErr) return NextResponse.json({ error: vErr.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
