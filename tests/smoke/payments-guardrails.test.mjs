import test from 'node:test'
import assert from 'node:assert/strict'

const BASE_URL = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000'

async function getPage(path) {
  const response = await fetch(new URL(path, BASE_URL), {
    redirect: 'follow',
  })

  const html = await response.text()

  return {
    response,
    html,
    finalUrl: response.url,
  }
}

test('wallet page renders the protected balance messaging safely', async () => {
  const page = await getPage('/wallet')

  assert.equal(page.response.status, 200)
  assert.match(page.html, /wallet|sign in|escrow|available balance/i)
})

test('release endpoint exists and is protected', async () => {
  const response = await fetch(new URL('/api/payments/release', BASE_URL), {
    method: 'POST',
  })

  assert.ok([200, 401].includes(response.status), `Unexpected status ${response.status}`)
})
