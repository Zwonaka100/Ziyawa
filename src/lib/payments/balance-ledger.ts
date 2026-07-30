import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type BalanceBucket = 'wallet' | 'held' | 'pending_payout'

export interface BalanceLedgerContext {
  reasonCode: string
  referenceType?: string
  referenceId?: string
  actorUserId?: string
  metadata?: Record<string, unknown>
}

interface EntryInput {
  userId: string
  bucket: BalanceBucket
  deltaAmount: number
  balanceAfter: number
  context: BalanceLedgerContext
}

export async function recordBalanceLedgerEntries(entries: EntryInput[]) {
  const rows = entries
    .filter((entry) => Number(entry.deltaAmount) !== 0)
    .map((entry) => ({
      user_id: entry.userId,
      bucket: entry.bucket,
      delta_amount: Number(entry.deltaAmount),
      balance_after: Number(entry.balanceAfter),
      reason_code: entry.context.reasonCode,
      reference_type: entry.context.referenceType || null,
      reference_id: entry.context.referenceId || null,
      actor_user_id: entry.context.actorUserId || null,
      metadata: entry.context.metadata || {},
    }))

  if (rows.length === 0) {
    return { success: true, inserted: 0 }
  }

  const { error } = await supabaseAdmin
    .from('balance_ledger_entries')
    .insert(rows)

  if (error) {
    console.error('Balance ledger insert failed:', error)
    return { success: false, inserted: 0, error: error.message }
  }

  return { success: true, inserted: rows.length }
}
