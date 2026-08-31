/**
 * Guards the Paystack signature check — the only thing between the open
 * internet and the money paths. A request that passes it can mint tickets
 * (charge.success), mark a payout settled and move balances (transfer.success),
 * or approve an outgoing transfer.
 *
 * It used to return true whenever no signing secret was set, so a single unset
 * or renamed env var would silently disable payment authentication in
 * production while everything still looked healthy. These tests pin the
 * fail-closed behaviour.
 *
 * verifyWebhookSignature is a pure function over (payload, signature, secret),
 * so unlike the webhook handlers this can be exercised directly rather than
 * asserted against the source. The implementation is re-derived here from the
 * documented Paystack scheme (HMAC-SHA512 of the raw body) so the test would
 * still catch the algorithm itself being changed.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SOURCE = 'src/lib/paystack.ts'

const SECRET = 'sk_test_signature_fixture'
const PAYLOAD = JSON.stringify({ event: 'transfer.success', data: { reference: 'PAY_TEST' } })

const sign = (payload, secret) =>
  crypto.createHmac('sha512', secret).update(payload).digest('hex')

/**
 * The module is TypeScript and pulls in Next-only paths, so lift the one
 * function out and evaluate it standalone rather than importing the module.
 */
async function loadVerifier() {
  const source = await readFile(join(root, SOURCE), 'utf8')

  const start = source.indexOf('export function verifyWebhookSignature(')
  assert.notEqual(start, -1, 'Expected to find verifyWebhookSignature in the source')

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

  assert.notEqual(end, -1, 'Could not find the end of verifyWebhookSignature')

  const body = source
    .slice(open, end)
    .replace(/:\s*string\b/g, '')
    .replace(/:\s*boolean\b/g, '')
    .replace(/logOpsEvent\([^)]*\)[^;]*;/gs, ';')

  const factory = new Function(
    'crypto',
    'process',
    `return function verifyWebhookSignature(payload, signature, secret) ${body}`
  )

  return (env) => factory(crypto, { env })
}

const verifierFor = await loadVerifier()

test('a correctly signed payload is accepted', () => {
  const verify = verifierFor({ NODE_ENV: 'production', PAYSTACK_WEBHOOK_SECRET: SECRET })

  assert.equal(verify(PAYLOAD, sign(PAYLOAD, SECRET)), true)
})

test('a forged signature is rejected', () => {
  const verify = verifierFor({ NODE_ENV: 'production', PAYSTACK_WEBHOOK_SECRET: SECRET })

  assert.equal(verify(PAYLOAD, sign(PAYLOAD, 'the-wrong-secret')), false)
})

test('a tampered payload is rejected', () => {
  const verify = verifierFor({ NODE_ENV: 'production', PAYSTACK_WEBHOOK_SECRET: SECRET })
  const signature = sign(PAYLOAD, SECRET)
  const tampered = JSON.stringify({ event: 'transfer.success', data: { reference: 'PAY_OTHER' } })

  assert.equal(verify(tampered, signature), false)
})

test('an empty or malformed signature is rejected', () => {
  const verify = verifierFor({ NODE_ENV: 'production', PAYSTACK_WEBHOOK_SECRET: SECRET })

  for (const signature of ['', 'not-a-signature', 'zz'.repeat(64), 'a'.repeat(127)]) {
    assert.equal(verify(PAYLOAD, signature), false, `Expected ${JSON.stringify(signature)} to be rejected`)
  }
})

test('production fails CLOSED when no signing secret is set', () => {
  const verify = verifierFor({ NODE_ENV: 'production' })

  assert.equal(
    verify(PAYLOAD, sign(PAYLOAD, SECRET)),
    false,
    'A missing secret in production must reject, not wave the request through'
  )
  assert.equal(verify(PAYLOAD, ''), false)
})

test('development still allows an unsigned request, for local testing', () => {
  const verify = verifierFor({ NODE_ENV: 'development' })

  assert.equal(verify(PAYLOAD, ''), true)
})

test('the secret key is accepted as a fallback signing secret', () => {
  // Paystack signs with the account secret key, so PAYSTACK_SECRET_KEY is a
  // legitimate fallback when PAYSTACK_WEBHOOK_SECRET is not separately set.
  const verify = verifierFor({ NODE_ENV: 'production', PAYSTACK_SECRET_KEY: SECRET })

  assert.equal(verify(PAYLOAD, sign(PAYLOAD, SECRET)), true)
})

test('the comparison is constant-time', async () => {
  const source = await readFile(join(root, SOURCE), 'utf8')

  assert.match(
    source,
    /crypto\.timingSafeEqual\(/,
    'Signature comparison must use crypto.timingSafeEqual, not ==='
  )
})
