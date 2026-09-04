/**
 * Renders both approved emails using the REAL templates from the codebase, so
 * what gets sent is identical to what the app would produce. Renders only.
 */
import fs from 'node:fs';

const src = fs.readFileSync('src/lib/email-templates.ts', 'utf8');

function lift(name) {
  const start = src.indexOf(`export function ${name}`);
  if (start < 0) throw new Error(`${name} not found`);
  const end = src.indexOf('\nexport function', start + 10);
  return src.slice(start, end === -1 ? undefined : end).replace('export function', 'function');
}

// Strip TS annotations so the source runs as plain JS.
const stripTypes = (s) => s
  .replace(/\)\s*:\s*string\s*\{/g, ') {')
  .replace(/data:\s*\{[\s\S]*?\}\s*\)/, 'data)')
  .replace(/(\w+)\s*:\s*string\[\]/g, '$1')
  .replace(/(const|let)\s+(\w+)\s*:\s*string\[\]/g, '$1 $2');

const wrapper = stripTypes(lift('emailWrapper'));
const adminTpl = stripTypes(lift('adminEventCompletedEmail'));

const make = new Function('SITE_URL', `
  ${wrapper}
  ${adminTpl}
  return { emailWrapper, adminEventCompletedEmail };
`);
const { emailWrapper, adminEventCompletedEmail } = make('https://www.ziyawa.com');

const out = process.argv[2];

fs.writeFileSync(`${out}/admin-alert.html`, adminEventCompletedEmail({
  eventName: 'Soulful Live Session',
  eventDate: '2 August 2026',
  organiserName: 'gmastermusiq',
  organiserEmail: 'gmastermusiq@gmail.com',
  ticketsSold: 2,
  grossSales: 'R210.00',
  organiserEarns: 'R180.00',
  ziyawaNet: 'R20.68',
  holdClearsOn: '5 September 2026',
  isVerified: true,
  hasPayoutAccount: true,
  completedByAdmin: false,
  adminUrl: 'https://www.ziyawa.com/admin/events/37a68255-79b3-4a6c-a4e9-d3ed825d17e9',
}), 'utf8');

fs.writeFileSync(`${out}/gmaster-apology.html`, emailWrapper(`
    <h1>A correction about your payout</h1>
    <p>Hi Gmaster,</p>
    <p>When we verified your account we sent you a message saying you could now withdraw funds from your wallet. That was wrong, and we're sorry for the confusion &mdash; there's no withdrawal button to find, because Ziyawa doesn't work that way.</p>
    <p><strong>You don't have to do anything to be paid.</strong> Once your event is complete we review it, and then we send your earnings straight to your bank account.</p>
    <div class="highlight-box">
      <div class="detail-row"><span class="detail-label">Event</span><span class="detail-value">Soulful Live Session</span></div>
      <div class="detail-row"><span class="detail-label">Tickets sold</span><span class="detail-value">2</span></div>
      <div class="detail-row"><span class="detail-label">Your earnings</span><span class="detail-value">R180.00</span></div>
      <div class="detail-row"><span class="detail-label">Going to</span><span class="detail-value">Capitec Bank &middot;&middot;&middot;&middot;8009</span></div>
    </div>
    <p>Your R180.00 is in review now. As soon as we're happy with the details we release it, and you'll get a statement by email &mdash; with a PDF for your records &mdash; when the money is on its way.</p>
    <p>Thank you for being one of the first organisers on Ziyawa, and for your patience while we sorted this out. If anything is unclear, just reply to this email and it comes straight to us.</p>
    <p style="text-align: center;"><a href="https://www.ziyawa.com/earnings" class="button">View my earnings</a></p>
`), 'utf8');

for (const f of ['admin-alert.html', 'gmaster-apology.html']) {
  const h = fs.readFileSync(`${out}/${f}`, 'utf8');
  console.log(`  ${f}: ${h.length} bytes · logo ${h.includes('ziyawa-logo.svg') ? 'yes' : 'NO'} · "Review window closes" ${h.includes('Review window closes') ? 'yes' : 'n/a'}`);
}
