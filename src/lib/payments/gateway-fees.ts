/**
 * What the payment gateway actually charged us.
 *
 * Paystack reports its fee on every successful charge — `fees` for the total
 * (VAT included) and `fees_breakdown` itemising its own cut separately from the
 * VAT on it. That has always been arriving; nothing read it, so every revenue
 * figure in the app was gross of the gateway cost. Across the first three
 * completed sales that gap was R12.14 against R39.50 of gross — 31%.
 *
 * Prefer this recorded value over the estimate in `paystackCostCents`. The
 * estimate exists to size the booking fee *before* a card is known and is
 * deliberately sized on the more expensive international rate; using it for
 * reporting would overstate the cost on every local card.
 *
 * All figures are cents, matching transactions.amount / net_amount /
 * platform_fee. (profiles.*_balance and payout_requests.amount are rands.)
 */

export interface GatewayFee {
  /** Total the gateway charged, VAT included. Null when it reported none. */
  totalCents: number | null
  /** The VAT portion, where the gateway itemises it. */
  vatCents: number | null
}

const NO_FEE: GatewayFee = { totalCents: null, vatCents: null }

const asInt = (value: unknown): number | null => {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n) : null
}

/**
 * Read the fee off a Paystack charge payload (the `data` of a verify call or a
 * charge.success webhook).
 */
export function extractGatewayFee(payload: unknown): GatewayFee {
  if (!payload || typeof payload !== 'object') return NO_FEE

  const data = payload as {
    fees?: unknown
    fees_breakdown?: unknown
  }

  const totalCents = asInt(data.fees)
  if (totalCents === null) return NO_FEE

  // Matched on `type` rather than position: the order of the breakdown entries
  // is not documented as stable.
  let vatCents: number | null = null
  if (Array.isArray(data.fees_breakdown)) {
    const vatEntry = (data.fees_breakdown as { type?: unknown; amount?: unknown }[]).find(
      (entry) => entry?.type === 'vat'
    )
    if (vatEntry) vatCents = asInt(vatEntry.amount)
  }

  return { totalCents, vatCents }
}

/**
 * Read the fee off a Paystack transfer payload (transfer.success / .failed /
 * .reversed). Transfers are charged even when they fail, so a failed transfer
 * still costs and should still be recorded.
 */
export function extractTransferFee(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null
  const data = payload as { fee?: unknown; fees?: unknown }
  // Paystack uses `fee` on transfers and `fees` on charges.
  return asInt(data.fee ?? data.fees)
}

/** Columns to merge into a transactions update. Omits keys when no fee was reported. */
export function gatewayFeeColumns(payload: unknown): Record<string, number> {
  const { totalCents, vatCents } = extractGatewayFee(payload)
  const columns: Record<string, number> = {}
  if (totalCents !== null) columns.gateway_fee_cents = totalCents
  if (vatCents !== null) columns.gateway_fee_vat_cents = vatCents
  return columns
}
