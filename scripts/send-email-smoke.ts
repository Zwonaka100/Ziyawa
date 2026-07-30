import fs from 'node:fs'
import path from 'node:path'

import { sendEventPublishedEmail } from '../src/lib/email'

function loadEnv(fileName: string): void {
  const envPath = path.resolve(process.cwd(), fileName)
  if (!fs.existsSync(envPath)) return

  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx < 1) continue

    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()

    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1)
    }

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

async function main(): Promise<void> {
  loadEnv('.env.production.local')
  loadEnv('.env.local')

  const recipients = ['zmabege@zande.io', 'mgmakgotho@gmail.com']
  const eventId = '46001e8c-2771-47c9-bb57-3a5b300bc97a'

  const results = [] as Array<{ recipient: string; success: boolean; id?: string; error?: string }>

  for (const to of recipients) {
    const recipientName = to.split('@')[0]
    const result = await sendEventPublishedEmail(to, {
      recipientName,
      eventName: 'TEST: Email Style Smoke Check',
      eventDate: '2026-08-15',
      eventLocation: 'Johannesburg Expo Arena',
      eventId,
    })

    results.push({ recipient: to, ...result })
  }

  console.log('EMAIL_SMOKE_RESULTS_START')
  console.log(JSON.stringify(results, null, 2))
  console.log('EMAIL_SMOKE_RESULTS_END')

  const failed = results.filter((r) => !r.success)
  if (failed.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Smoke send failed:', error)
  process.exit(1)
})
