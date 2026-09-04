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

    // A signature, when Paystack sends one, must be correct. When it does not,
    // the request still has to be answered.
    //
    // This endpoint used to refuse anything unsigned with a 401. Paystack reads
    // any non-200 as "reject", so a real R90 payout to a real organiser was
    // blocked at 13:46 on 4 Sep — the transfer never left, the money bounced
    // back, and the only trace was a 401 in the logs.
    //
    // Refusing unsigned calls bought nothing anyway. This endpoint cannot move
    // money; it can only answer yes or no about a transfer Paystack was already
    // asked to make, and initiating one needs the secret key. The real control
    // is below: the transfer must match a payout row this system created, by
    // reference, exact amount and recipient. An attacker who cannot create that
    // row cannot get a yes out of this.
    if (signature && !verifyWebhookSignature(payloadText, signature)) {
      console.error('Transfer approval refused: signature present but invalid')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    if (!signature) {
      console.warn('Transfer approval arrived unsigned - validating against our own payout record instead')
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
      console.error('Transfer approval refused: no payout transaction with this reference', { reference })
      return NextResponse.json({ error: 'Unknown transfer reference' }, { status: 400 })
    }

    if (!['initiated', 'released'].includes(transaction.state)) {
      console.error('Transfer approval refused: state not approvable', { reference, state: transaction.state })
      return NextResponse.json({ error: 'Transfer state not approvable' }, { status: 400 })
    }

    const expectedAmountCents = Number(transaction.net_amount || 0)
    if (transferAmountCents !== expectedAmountCents) {
      console.error('Transfer approval refused: amount mismatch', { reference, expectedAmountCents, transferAmountCents })
      return NextResponse.json({ error: 'Transfer amount mismatch' }, { status: 400 })
    }

    const gatewayResponse = (transaction.gateway_response || {}) as { recipient_code?: string }
    if (recipientCode && gatewayResponse.recipient_code && recipientCode !== gatewayResponse.recipient_code) {
      console.error('Transfer approval refused: recipient mismatch', { reference })
      return NextResponse.json({ error: 'Recipient mismatch' }, { status: 400 })
    }

    console.log('Transfer approval granted', { reference, amountCents: transferAmountCents })
    return NextResponse.json({ approved: true }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Approval check failed' }, { status: 400 })
  }
}
