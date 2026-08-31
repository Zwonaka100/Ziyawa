/**
 * Guards the payout request lifecycle.
 *
 * These are source assertions rather than HTTP calls, on purpose: the bug they
 * exist to catch was an *absent* call. The Paystack transfer webhooks updated
 * `transactions` and the balance buckets but never closed the `payout_requests`
 * row, so every approved payout sat at 'processing' forever — and because
 * enqueuePayoutRequest() skips anyone holding an open request, that recipient
 * could never be queued again. Their later earnings would release into their
 * available balance and silently never reach the admin queue.
 *
 * Exercising that through HTTP would need a valid Paystack signature and would
 * move real money, so the coupling is asserted in the source instead.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const read = (relativePath) => readFile(join(root, relativePath), 'utf8')

const WEBHOOK = 'src/app/api/webhooks/paystack/route.ts'
const ESCROW = 'src/lib/payments/escrow.ts'

/**
 * Pull one `async function name(...) { ... }` body out by brace matching.
 *
 * Skips past the parameter list first — these handlers take inline object types
 * like `(data: { reference: string })`, so the first `{` after the name is the
 * parameter's, not the body's.
 */
function functionBody(source, name) {
  const start = source.indexOf(`async function ${name}(`)
  assert.notEqual(start, -1, `Expected to find ${name} in the source`)

  let parens = 0
  let afterParams = -1

  for (let i = source.indexOf('(', start); i < source.length; i += 1) {
    if (source[i] === '(') parens += 1
    if (source[i] === ')') {
      parens -= 1
      if (parens === 0) {
        afterParams = i + 1
        break
      }
    }
  }

  assert.notEqual(afterParams, -1, `Could not find the parameter list of ${name}`)

  const open = source.indexOf('{', afterParams)
  let depth = 0

  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1
    if (source[i] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(open, i + 1)
    }
  }

  throw new Error(`Could not find the end of ${name}`)
}

for (const handler of ['handleTransferSuccess', 'handleTransferFailed', 'handleTransferReversed']) {
  test(`${handler} closes out the payout request`, async () => {
    const body = functionBody(await read(WEBHOOK), handler)

    assert.match(
      body,
      /settlePayoutRequest\(/,
      `${handler} must call settlePayoutRequest, or the approved payout stays at 'processing' forever ` +
        'and blocks the recipient from ever being queued again'
    )
  })
}

test('a successful transfer completes the request, a failed one fails it', async () => {
  const source = await read(WEBHOOK)

  assert.match(
    functionBody(source, 'handleTransferSuccess'),
    /settlePayoutRequest\(reference,\s*\{\s*status:\s*'completed'/,
    'transfer.success must mark the payout request completed'
  )

  for (const handler of ['handleTransferFailed', 'handleTransferReversed']) {
    assert.match(
      functionBody(source, handler),
      /status:\s*'failed'/,
      `${handler} must mark the payout request failed so the restored balance can queue again`
    )
  }
})

test('a reversal can overturn a payout already marked completed', async () => {
  const body = functionBody(await read(WEBHOOK), 'handleTransferReversed')

  assert.match(
    body,
    /settleFrom:\s*\[\s*\.\.\.OPEN_PAYOUT_STATUSES,\s*'completed'\s*\]/,
    'A reversal can legitimately arrive after transfer.success, so it must be allowed ' +
      'to move a completed request to failed'
  )
})

test('every status that blocks queueing is one the webhook can clear', async () => {
  const webhook = await read(WEBHOOK)
  const escrow = await read(ESCROW)

  const blocking = functionBody(escrow, 'enqueuePayoutRequest')
    .match(/\.in\(\s*'status',\s*\[([^\]]+)\]/)?.[1]

  assert.ok(blocking, 'Expected enqueuePayoutRequest to filter on a list of blocking statuses')

  const blockingStatuses = blocking
    .split(',')
    .map((entry) => entry.trim().replace(/^'|'$/g, ''))
    .filter(Boolean)

  const clearable = webhook
    .match(/const OPEN_PAYOUT_STATUSES = \[([^\]]+)\]/)?.[1]

  assert.ok(clearable, 'Expected OPEN_PAYOUT_STATUSES in the webhook')

  const clearableStatuses = clearable
    .split(',')
    .map((entry) => entry.trim().replace(/^'|'$/g, ''))
    .filter(Boolean)

  for (const status of blockingStatuses) {
    assert.ok(
      clearableStatuses.includes(status),
      `enqueuePayoutRequest refuses to queue anyone sitting at '${status}', but the webhook ` +
        `cannot clear that status — anyone reaching it would be permanently unpayable`
    )
  }
})

test('the failure reason is kept apart from the admin note', async () => {
  const approve = await read('src/app/api/admin/payouts/[id]/route.ts')
  const failureBranches = approve.match(/status: 'failed',[\s\S]{0,120}?\}/g) ?? []

  assert.ok(failureBranches.length > 0, 'Expected the approve route to have failure branches')

  for (const branch of failureBranches) {
    assert.doesNotMatch(
      branch,
      /admin_notes:/,
      'A failing payout must not overwrite admin_notes — that is what the approving admin typed'
    )
  }
})
