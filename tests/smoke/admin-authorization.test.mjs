/**
 * Every admin API route must be behind the same authorisation check, and the
 * admin section must be gated on the server.
 *
 * This existed as sixteen hand-rolled copies of "read the profile, test
 * is_admin or admin_role". They had already drifted — /api/admin/send-email
 * accepted is_admin alone while the other fifteen also accepted an admin_role
 * of admin/super_admin — and sixteen copies is how a seventeenth route
 * eventually ships with no check at all. These tests fail if a new route
 * forgets the gate, or if someone reintroduces a local copy of it.
 *
 * Asserted against the source rather than over HTTP: the failure being guarded
 * against is a route shipping without a check, which is a property of the file,
 * not of any one request. A live request can only test the routes you remember
 * to call.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative, sep } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const ADMIN_API = join(root, 'src', 'app', 'api', 'admin')

async function findRoutes(dir) {
  const found = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...(await findRoutes(full)))
    else if (entry.name === 'route.ts') found.push(full)
  }
  return found
}

const routes = await findRoutes(ADMIN_API)
const sources = new Map()
for (const file of routes) {
  sources.set(relative(root, file).split(sep).join('/'), await readFile(file, 'utf8'))
}

test('there are admin API routes to check', () => {
  assert.ok(routes.length >= 16, `expected at least 16 admin routes, found ${routes.length}`)
})

test('every admin API route imports the shared gate', () => {
  const missing = [...sources.entries()]
    .filter(([, src]) => !src.includes("from '@/lib/admin-auth'"))
    .map(([name]) => name)

  assert.deepEqual(missing, [], `these admin routes do not import the shared gate:\n  ${missing.join('\n  ')}`)
})

test('every admin API route actually calls the gate', () => {
  const missing = [...sources.entries()]
    .filter(([, src]) => !src.includes('requireAdminApi()'))
    .map(([name]) => name)

  assert.deepEqual(missing, [], `these admin routes import the gate but never call it:\n  ${missing.join('\n  ')}`)
})

test('every admin API route returns the gate response when it denies', () => {
  const missing = [...sources.entries()]
    // Two shapes are legitimate. Most routes return the response straight from
    // the handler; seven keep a local assertAdmin() wrapper that re-wraps it in
    // that route own result shape, so their call sites did not change.
    // Both must branch on the denial and pass the gate response along.
    .filter(([, src]) => !(/if \('response' in \w+\)/.test(src) && /\w+\.response/.test(src)))
    .map(([name]) => name)

  assert.deepEqual(missing, [], `these admin routes call the gate but ignore a denial:\n  ${missing.join('\n  ')}`)
})

test('no admin API route rolls its own is_admin check', () => {
  const offenders = [...sources.entries()]
    .filter(([, src]) => {
      const code = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
      // A local check means reading the flag off a profile row in the route.
      return /\.select\([^)]*is_admin/.test(code) || /profile\?\.is_admin/.test(code)
    })
    .map(([name]) => name)

  assert.deepEqual(offenders, [], `these admin routes re-implement the check locally:\n  ${offenders.join('\n  ')}`)
})

test('the admin layout gates on the server, not in the browser', async () => {
  const layout = await readFile(join(root, 'src', 'app', 'admin', 'layout.tsx'), 'utf8')

  assert.ok(
    !layout.includes("'use client'"),
    'src/app/admin/layout.tsx is a client component — a redirect fired after the markup has been sent is not a gate'
  )
  assert.ok(
    layout.includes('requireAdminPage'),
    'src/app/admin/layout.tsx does not call requireAdminPage()'
  )
})

test('the gate distinguishes signed-out from not-an-admin', async () => {
  const helper = await readFile(join(root, 'src', 'lib', 'admin-auth.ts'), 'utf8')

  assert.ok(helper.includes('status: 401'), 'no 401 for a signed-out caller')
  assert.ok(helper.includes('status: 403'), 'no 403 for a signed-in non-admin')
  assert.ok(
    helper.includes('createAdminServiceClient'),
    'the check should read the profile through the service client, not the caller\'s own access'
  )
})

test('the admin gate runs in the proxy, before anything renders', async () => {
  const proxy = await readFile(join(root, 'src', 'proxy.ts'), 'utf8')

  assert.ok(
    proxy.includes('isAdminUserId'),
    'src/proxy.ts does not check admin status. Gating only in admin/layout.tsx is ' +
    'not enough: Next renders a layout and the page beneath it concurrently, so a ' +
    'redirect from the layout still lets a server-rendered admin page run its ' +
    'queries and stream its output into the same response.'
  )
})

test('the middleware admin check fails closed', async () => {
  const helper = await readFile(join(root, 'src', 'lib', 'admin-auth.ts'), 'utf8')
  const fn = helper.slice(helper.indexOf('export async function isAdminUserId'))

  assert.ok(fn.includes('return false'), 'isAdminUserId has no denying path')
  assert.ok(
    /if \(!url \|\| !serviceKey\)[\s\S]{0,220}return false/.test(fn),
    'isAdminUserId should deny when its Supabase env vars are missing, not allow'
  )
  assert.ok(
    /catch[\s\S]{0,160}return false/.test(fn),
    'isAdminUserId should deny when the check itself throws'
  )
})
