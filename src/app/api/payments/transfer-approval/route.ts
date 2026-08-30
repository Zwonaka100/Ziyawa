import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyWebhookSignature } from '@/lib/paystack'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface TransferApprovalPayload {
  reference?: string
  amount?: number
  recipient?: string
  recipient_code?: string
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      endpoint: 'paystack-transfer-approval',
      methods: ['POST'],
      note: 'POST requests must include a valid x-paystack-signature header.',
    },
    { status: 200 }
  )
}

/**
 * PAYSTACK TRANSFER APPROVAL ENDPOINT
 *
 * Paystack calls this endpoint when Transfer Approval is enabled.
 * - Return 200 to approve a transfer request
 * - Return 400 to reject a transfer request
 */
export async function POST(request: NextRequest) {
  try {
    const payloadText = await request.text()
    const signature = request.headers.get('x-paystack-signature') || ''

    // Reject unsigned/untrusted approval calls.
    if (!verifyWebhookSignature(payloadText, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(payloadText) as TransferApprovalPayload
    const reference = String(payload.reference || '').trim()
    const transferAmountCents = Number(payload.amount || 0)
    const recipientCode = String(payload.recipient_code || payload.recipient || '').trim()

    if (!reference || !Number.isFinite(transferAmountCents) || transferAmountCents <= 0) {
      return NextResponse.json({ error: 'Invalid transfer approval payload' }, { status: 400 })
    }

    const { data: transaction, error } = await supabaseAdmin
      .from('transactions')
      .select('id, type, state, amount, net_amount, gateway_response')
      .eq('reference', reference)
      .eq('type', 'payout')
      .single()

    if (error || !transaction) {
      return NextResponse.json({ error: 'Unknown transfer reference' }, { status: 400 })
    }

    if (!['initiated', 'released'].includes(transaction.state)) {
      return NextResponse.json({ error: 'Transfer state not approvable' }, { status: 400 })
    }

    const expectedAmountCents = Number(transaction.net_amount || 0)
    if (transferAmountCents !== expectedAmountCents) {
      return NextResponse.json({ error: 'Transfer amount mismatch' }, { status: 400 })
    }

    const gatewayResponse = (transaction.gateway_response || {}) as { recipient_code?: string }
    if (recipientCode && gatewayResponse.recipient_code && recipientCode !== gatewayResponse.recipient_code) {
      return NextResponse.json({ error: 'Recipient mismatch' }, { status: 400 })
    }

    return NextResponse.json({ approved: true }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Approval check failed' }, { status: 400 })
  }
}
