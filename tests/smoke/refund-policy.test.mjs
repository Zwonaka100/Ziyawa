/**
 * Pins the refund policy where it is actually enforced: in the code.
 *
 * Two invariants, both of which were violated before this change:
 *
 *   1. A refund returns the TICKET PRICE, never the buyer total. The cancel
 *      route used to queue `txn.amount`, which includes the booking fee — the
 *      one thing that must never be refunded, because it is what already paid
 *      Paystack to process the charge and Paystack does not give that back.
 *
 *   2. A refund reverses to the original CARD, not to a platform balance.
 *      Crediting a balance leaves money a groovist cannot extract — they have
 *      no verified payout account and no reason to get one — and extracting it
 *      would cost a ~R3 transfer fee per person that need not exist.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (p) => readFile(join(root, p), 'utf8')

const CANCEL = 'src/app/api/events/[id]/cancel/route.ts'
const REFUND = 'src/app/api/admin/refunds/[id]/route.ts'
const PAYSTACK = 'src/lib/paystack.ts'

test('cancelling an event queues the ticket price, not the buyer total', async () => {
  const source = await read(CANCEL)

  assert.match(
    source,
    /ticket_price_cents/,
    'The queued refund must be built from the stored ticket price'
  )

  assert.doesNotMatch(
    source,
    /amount_cents:\s*Number\(txn\.amount/,
    'Queueing txn.amount refunds the booking fee too, which puts Ziyawa out of pocket on every cancelled ticket'
  )
})

test('a failure to queue refunds is not swallowed', async () => {
  const source = await read(CANCEL)

  assert.match(
    source,
    /queueError/,
    'The refund upsert error must be checked — silently cancelling an event and refunding nobody is the worst available outcome'
  )
})

test('refunds reverse to the card, and never credit the buyer a balance', async () => {
  const source = await read(REFUND)

  assert.match(source, /refundPayment\(/, 'The refund route must call Paystack to reverse the charge')

  // The buyer credit is the specific thing removed. The organizer clawback is
  // a different call on a different person and must survive.
  assert.doesNotMatch(
    source,
    /adjustProfileBalanceBuckets\(\s*item\.user_id/,
    'A refund must not credit the buyer a platform balance — it goes back to their card'
  )
})

test('the organizer clawback handles money that has already moved', async () => {
  const source = await read(REFUND)

  for (const state of ['held', 'released', 'settled']) {
    assert.ok(
      source.includes(`'${state}'`),
      `The clawback must handle a source transaction in '${state}' — reversing the wrong bucket corrupts the balance`
    )
  }

  assert.match(
    source,
    /heldDelta:\s*-organizerNetRands/,
    'Held revenue is reversed out of the held bucket'
  )
  assert.match(
    source,
    /walletDelta:\s*-organizerNetRands/,
    'Already-released revenue is reversed out of the available bucket'
  )
})

test('refundPayment is a refund, not a transfer', async () => {
  const source = await read(PAYSTACK)
  const start = source.indexOf('export async function refundPayment(')
  assert.notEqual(start, -1, 'refundPayment must exist')

  // Brace-match the body rather than slicing a fixed width, which runs into
  // whatever function happens to be declared next.
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
  assert.notEqual(end, -1, 'Could not find the end of refundPayment')

  const body = source.slice(open, end)

  assert.match(body, /'\/refund'/, 'It must hit the /refund endpoint')
  assert.doesNotMatch(body, /\/transfer/, 'A transfer costs ~R3 and is the wrong operation for reversing a card charge')
})

test('no customer-facing page still promises a full refund', async () => {
  const pages = [
    'src/lib/ziwaphi/knowledge-base.ts',
    'src/app/faq/page.tsx',
    'src/app/for/groovists/page.tsx',
    'src/app/refunds/page.tsx',
    'src/app/terms/page.tsx',
  ]

  for (const page of pages) {
    const source = await read(page)

    assert.doesNotMatch(
      source,
      /full refund/i,
      `${page} promises a "full refund", which is false once the booking fee is retained. Say "ticket price in full".`
    )
  }
})

test('the retired wallet and withdrawal language is gone from the policy pages', async () => {
  for (const page of ['src/app/refunds/page.tsx', 'src/app/terms/page.tsx']) {
    const source = await read(page)

    assert.doesNotMatch(
      source,
      /wallet (deposit|withdrawal)|withdrawal fee|minimum withdrawal/i,
      `${page} still describes deposits or withdrawals, which return 410 and are not charged`
    )
  }
})
