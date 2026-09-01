/**
 * The booking fee guarantee: Ziyawa never loses money on payment processing,
 * at any ticket price, on any card, ever.
 *
 * This is the whole reason the fee became a formula instead of a tier lookup.
 * Tiers capped the fee at R10 while Paystack's cost is an uncapped percentage,
 * so above ~R168 a refund cost more than the fee retained — R158 per ticket on
 * a R5,000 VIP. The fee is never refunded, so if it covers the gateway cost at
 * the moment of sale, a later refund or cancellation can never go negative.
 *
 * Two deliberate pessimisms, so the guarantee does not rest on anything I could
 * not verify:
 *
 *   1. The R1 flat fee is applied at EVERY price. Some sources say Paystack
 *      waives it under R10; I could not confirm that for South Africa, and the
 *      R5 floor covers that range anyway.
 *   2. The cost is checked against the INTERNATIONAL rate (3.1%) as well as the
 *      local one (2.9%). The card type is unknown when the fee is displayed.
 *      The international leg is the one that matters — it fails outright if
 *      anyone re-sizes the formula on the local rate.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SOURCE = 'src/lib/constants.ts'

const VAT = 1.15
const LOCAL_RATE = 0.029 * VAT
const INTL_RATE = 0.031 * VAT
const FLAT_CENTS = 100 * VAT

/** Paystack's cost in cents on the full amount charged to the buyer. */
const costCents = (chargedCents, rate) => rate * chargedCents + FLAT_CENTS

/**
 * Evaluate calculateBookingFee out of the TypeScript source.
 *
 * Importing the module would drag in Next-only paths, and re-implementing the
 * formula here would test my arithmetic rather than the shipped code — the
 * point is to catch someone changing the real constants.
 */
async function loadCalculator() {
  const source = await readFile(join(root, SOURCE), 'utf8')

  const feesMatch = source.match(/export const PLATFORM_FEES = (\{[\s\S]*?\n\}) as const/)
  assert.ok(feesMatch, 'Could not find PLATFORM_FEES in constants.ts')

  const start = source.indexOf('export function calculateBookingFee(')
  assert.notEqual(start, -1, 'Could not find calculateBookingFee')

  const open = source.indexOf('{', source.indexOf(')', start))
  let depth = 0
  let end = -1
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1
    if (source[i] === '}') {
      depth -= 1
      if (depth === 0) { end = i + 1; break }
    }
  }
  assert.notEqual(end, -1, 'Could not find the end of calculateBookingFee')

  const body = source.slice(open, end).replace(/:\s*number\b/g, '')
  const fees = feesMatch[1].replace(/\/\/[^\n]*/g, '')

  return new Function(
    `const PLATFORM_FEES = ${fees};
     return function calculateBookingFee(ticketPriceCents) ${body}`
  )()
}

const calculateBookingFee = await loadCalculator()

/** Every price from free to R50,000, in 50c steps, plus the tier boundaries. */
function* prices() {
  for (const edge of [0, 1, 99, 100, 101, 300, 301, 999, 1000]) yield edge
  for (let rands = 0; rands <= 50000; rands += 0.5) yield Math.round(rands * 100)
}

for (const [label, rate] of [['international', INTL_RATE], ['local', LOCAL_RATE]]) {
  test(`booking fee always covers Paystack on a ${label} card`, () => {
    let worst = Infinity
    let worstAt = null

    for (const priceCents of prices()) {
      const fee = calculateBookingFee(priceCents)
      const margin = fee - costCents(priceCents + fee, rate)

      if (margin < worst) {
        worst = margin
        worstAt = priceCents
      }
    }

    assert.ok(
      worst >= 0,
      `Ziyawa loses R${(-worst / 100).toFixed(2)} on a R${(worstAt / 100).toFixed(2)} ticket ` +
        `paid by a ${label} card. The booking fee must cover the gateway cost at every price — ` +
        `it is never refunded, so this is what makes refunds and cancellations safe.`
    )
  })
}

test('the fee is a formula, not a capped tier list', () => {
  // The specific failure this replaced: a fixed ceiling that a percentage cost
  // eventually overtakes.
  const atFiveThousand = calculateBookingFee(500000)
  const atTwentyThousand = calculateBookingFee(2000000)

  assert.ok(
    atTwentyThousand > atFiveThousand * 3,
    'The fee must keep scaling with ticket price, not flatten out at a cap'
  )
})

test('cheap and free tickets fall back to the R5 floor', () => {
  for (const priceCents of [0, 100, 500, 2000]) {
    assert.equal(
      calculateBookingFee(priceCents),
      500,
      `A R${(priceCents / 100).toFixed(2)} ticket should charge the R5 minimum`
    )
  }
})

test('fees land on whole rands', () => {
  for (const priceCents of [15000, 50000, 100000, 500000]) {
    assert.equal(
      calculateBookingFee(priceCents) % 100,
      0,
      'Fees are rounded up to a whole rand so they display cleanly'
    )
  }
})

test('the stale Paystack pricing is gone', async () => {
  const source = await readFile(join(root, SOURCE), 'utf8')

  assert.doesNotMatch(
    source,
    /localCardCap/,
    'There is no Paystack fee cap in South Africa — the cap is Nigeria-only, in naira'
  )
  assert.match(source, /localCardPercent:\s*2\.9/, 'Local card rate is 2.9%')
  assert.match(source, /internationalCardPercent:\s*3\.1/, 'International card rate is 3.1%')
  assert.match(source, /transferFeeCents:\s*300/, 'Transfers cost R3 ex VAT, not R10')
})
