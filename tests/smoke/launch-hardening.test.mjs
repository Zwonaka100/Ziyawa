import test from 'node:test'
import assert from 'node:assert/strict'

const BASE_URL = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000'

async function post(path, body = {}) {
  return fetch(new URL(path, BASE_URL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

test('provider response endpoint exists and is protected', async () => {
  const response = await post('/api/provider-bookings/test-booking-id/respond', { action: 'accept' })
  assert.equal(response.status, 401)
})

test('admin refund queue endpoint exists and is protected', async () => {
  const response = await post('/api/admin/refunds', { action: 'enqueueTransaction', transactionId: 'test-id' })
  assert.equal(response.status, 401)
})

test('event cancel endpoint exists and is protected', async () => {
  const response = await post('/api/events/test-event-id/cancel', { reason: 'Smoke test guardrail' })
  assert.equal(response.status, 401)
})
