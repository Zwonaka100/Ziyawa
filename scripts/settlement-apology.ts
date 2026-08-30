/**
 * SETTLEMENT APOLOGY — one-off outreach to organizers whose funds were left
 * sitting because nothing prompted them to mark their event complete.
 *
 * PREVIEW BY DEFAULT — sends nothing. It writes each rendered email to
 * scripts/out/ so the content can be read and approved first.
 *
 *   npx tsx scripts/settlement-apology.ts --event=<id>          # preview
 *   npx tsx scripts/settlement-apology.ts --event=<id> --send   # send
 *
 * An apology is a deliberate, one-off gesture for a specific event whose funds
 * we genuinely left sitting — NOT a routine notice. Events that are simply
 * awaiting completion in the normal course get the standard reminder from the
 * event-lifecycle job instead. So --event is required: this never fans out to
 * every stale event on its own.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

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
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnv('.env.local')

async function main() {
  const shouldSend = process.argv.includes('--send')
  const eventArg = process.argv.find((arg) => arg.startsWith('--event='))
  const targetEventId = eventArg?.split('=')[1]?.trim()

  if (!targetEventId) {
    console.error(
      'Refusing to run without --event=<event-id>.\n' +
      'An apology is a one-off for a specific event whose funds we left sitting.\n' +
      'Routine "please complete your event" nudges come from the event-lifecycle job.'
    )
    process.exit(1)
  }

  const { organizerSettlementApologyEmail } = await import('../src/lib/email-templates')
  const { sendEmail } = await import('../src/lib/email')
  const { formatMoneyExact } = await import('../src/lib/helpers')
  const { SITE_URL } = await import('../src/lib/constants')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const { data: pastEvents, error } = await supabase
    .from('events')
    .select('id, title, event_date, state, organizer_id')
    .eq('id', targetEventId)

  if (error) throw error

  if (!pastEvents?.length) {
    console.error(`No event found with id ${targetEventId}`)
    process.exit(1)
  }

  const stale = pastEvents

  const outDir = path.resolve(process.cwd(), 'scripts/out')
  fs.mkdirSync(outDir, { recursive: true })

  const fromAddress = process.env.ACCOUNTS_FROM_EMAIL || 'Ziyawa Accounts <accounts@ziyawa.com>'
  let prepared = 0

  for (const event of stale) {
    if (!event.organizer_id) continue

    const { data: organizer } = await supabase
      .from('profiles')
      .select('id, email, full_name, is_verified')
      .eq('id', event.organizer_id)
      .maybeSingle()

    if (!organizer?.email) continue

    const { data: held } = await supabase
      .from('transactions')
      .select('net_amount, amount')
      .eq('event_id', event.id)
      .eq('state', 'held')

    const pendingRands = (held || []).reduce(
      (sum, tx) => sum + Number(tx.net_amount || tx.amount || 0) / 100,
      0
    )

    // Only contact organizers who actually have money waiting.
    if (pendingRands <= 0) continue

    const html = organizerSettlementApologyEmail({
      recipientName: (organizer.full_name || 'there').split(' ')[0],
      eventName: event.title,
      eventDate: new Date(event.event_date).toLocaleDateString('en-ZA', {
        weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
      }),
      amountPending: formatMoneyExact(pendingRands),
      manageUrl: `${SITE_URL}/dashboard/organizer/events/${event.id}/manage`,
      isVerified: Boolean(organizer.is_verified),
      verifyUrl: `${SITE_URL}/dashboard/settings?tab=verification`,
    })

    const subject = `About your funds from ${event.title}`
    const slug = event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const outFile = path.join(outDir, `apology-${slug}.html`)
    fs.writeFileSync(outFile, html, 'utf8')

    prepared += 1
    console.log(
      `${shouldSend ? 'SENDING' : 'PREVIEW'} → ${organizer.email}\n` +
      `  event:     ${event.title} (${event.event_date})\n` +
      `  pending:   ${formatMoneyExact(pendingRands)}\n` +
      `  verified:  ${organizer.is_verified ? 'yes' : 'no'}\n` +
      `  subject:   ${subject}\n` +
      `  preview:   ${outFile}\n`
    )

    if (shouldSend) {
      const result = await sendEmail({
        from: fromAddress,
        // Settlement mail invites a reply, so keep the reply-to on the same
        // accounts alias it was sent from rather than diverting to support.
        replyTo: process.env.ACCOUNTS_EMAIL || 'accounts@ziyawa.com',
        to: organizer.email,
        subject,
        html,
        tags: [{ name: 'category', value: 'settlement-apology' }],
      })

      if (result.success) {
        await supabase.from('email_logs').insert({
          sender_id: null,
          recipient_ids: [organizer.id],
          recipient_emails: [organizer.email],
          subject,
          body: `settlement-apology-${event.id}-${todayKey}\nsettlement-apology`,
          email_type: 'manual',
          status: 'sent',
        })
        console.log('  ✓ sent\n')
      } else {
        console.log(`  ✗ send failed: ${result.error}\n`)
      }
    }
  }

  console.log(
    shouldSend
      ? `Done. ${prepared} email(s) processed.`
      : `Done. ${prepared} email(s) prepared as previews in scripts/out/. Nothing was sent — re-run with --send to actually send.`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
