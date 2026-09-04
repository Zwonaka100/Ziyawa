/**
 * A branded PDF statement for a payout, attached to the email that announces it.
 *
 * The email tells someone money is coming; this is the document they keep, hand
 * to a bookkeeper, or check against their bank statement. Everything on it is
 * already known at the moment of approval.
 *
 * Built with pdf-lib rather than a React PDF renderer: this is a fixed
 * label/value statement, not flowing content, so a layout engine buys nothing
 * and costs a reconciler running inside a serverless function.
 *
 * The palette matches emailWrapper() in src/lib/email-templates.ts so the PDF
 * and the email it arrives with look like one thing:
 *   ink #111111, body #374151, muted #6b7280, rule #e5e7eb, panel #f3f4f6
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { formatMoneyExact } from '@/lib/helpers'

const INK = rgb(0x11 / 255, 0x11 / 255, 0x11 / 255)
const BODY = rgb(0x37 / 255, 0x41 / 255, 0x51 / 255)
const MUTED = rgb(0x6b / 255, 0x72 / 255, 0x80 / 255)
const RULE = rgb(0xe5 / 255, 0xe7 / 255, 0xeb / 255)
const PANEL = rgb(0xf3 / 255, 0xf4 / 255, 0xf6 / 255)

const PAGE_WIDTH = 595.28 // A4 portrait, points
const PAGE_HEIGHT = 841.89
const MARGIN = 56

export interface PayoutStatementData {
  reference: string
  recipientName: string
  recipientEmail: string
  /** organizer | artist | vendor */
  recipientRole: string
  amountRands: number
  bankName: string
  accountLast4: string
  accountHolder: string
  approvedAt: Date
  /** Line items that add up to this payout, newest first. */
  sources: { label: string; detail: string; amountRands: number }[]
  /** Ziyawa's booking fee and Paystack's cut on the sales behind it. */
  bookingFeesRands: number
  gatewayFeesRands: number
  grossSalesRands: number
}

/** Ziyawa absorbs the transfer cost; it is shown so the statement reconciles. */
async function loadLogo(pdf: PDFDocument) {
  try {
    const file = path.join(process.cwd(), 'public', 'branding', 'ziyawa-logo-no-background.png')
    return await pdf.embedPng(await fs.readFile(file))
  } catch {
    // A missing logo must never cost someone their statement.
    return null
  }
}

/**
 * StandardFonts.Helvetica is WinAnsi-encoded, and pdf-lib throws rather than
 * substituting when asked for a character outside it. A Unicode minus (U+2212)
 * and a bullet (U+2022) both got in here and failed the whole document — on a
 * path where the alternative is someone not being told they were paid. Anything
 * unrepresentable is degraded to a close ASCII equivalent instead.
 */
function safe(text: string): string {
  return text
    .replace(/[−–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/•/g, '*')
    .replace(/…/g, '...')
    // Anything still outside WinAnsi's range is dropped rather than thrown on.
    .replace(/[^ -ÿ]/g, '')
}

function drawRow(
  page: PDFPage,
  y: number,
  label: string,
  value: string,
  fonts: { regular: PDFFont; bold: PDFFont },
  options: { bold?: boolean; size?: number } = {}
) {
  const size = options.size ?? 10
  const safeLabel = safe(label)
  const safeValue = safe(value)
  page.drawText(safeLabel, { x: MARGIN + 16, y, size, font: fonts.regular, color: MUTED })
  const font = options.bold ? fonts.bold : fonts.regular
  const width = font.widthOfTextAtSize(safeValue, size)
  page.drawText(safeValue, {
    x: PAGE_WIDTH - MARGIN - 16 - width,
    y,
    size,
    font,
    color: options.bold ? INK : BODY,
  })
}

export async function buildPayoutStatementPdf(data: PayoutStatementData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`Ziyawa payout statement ${data.reference}`)
  pdf.setAuthor('Ziyawa')
  pdf.setSubject(`Payout of ${formatMoneyExact(data.amountRands)} to ${data.recipientName}`)
  pdf.setCreationDate(data.approvedAt)

  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const fonts = { regular, bold }

  let y = PAGE_HEIGHT - MARGIN

  // ── Header ───────────────────────────────────────────────────────────────
  const logo = await loadLogo(pdf)
  if (logo) {
    const scaled = logo.scaleToFit(28, 28)
    page.drawImage(logo, { x: MARGIN, y: y - scaled.height + 6, width: scaled.width, height: scaled.height })
  }
  page.drawText('Ziyawa', { x: MARGIN + (logo ? 36 : 0), y: y - 16, size: 20, font: bold, color: INK })
  page.drawText("South Africa's event operating system", {
    x: MARGIN + (logo ? 36 : 0), y: y - 28, size: 8, font: regular, color: MUTED,
  })

  const titleText = 'PAYOUT STATEMENT'
  page.drawText(titleText, {
    x: PAGE_WIDTH - MARGIN - bold.widthOfTextAtSize(titleText, 10),
    y: y - 16, size: 10, font: bold, color: MUTED,
  })
  const dateText = safe(data.approvedAt.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }))
  page.drawText(dateText, {
    x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(dateText, 9),
    y: y - 28, size: 9, font: regular, color: MUTED,
  })

  y -= 48
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 1, color: RULE })
  y -= 36

  // ── Headline amount ──────────────────────────────────────────────────────
  page.drawRectangle({
    x: MARGIN, y: y - 54, width: PAGE_WIDTH - MARGIN * 2, height: 72, color: PANEL,
  })
  page.drawText('Amount paid to you', { x: MARGIN + 16, y: y - 2, size: 9, font: regular, color: MUTED })
  page.drawText(formatMoneyExact(data.amountRands), {
    x: MARGIN + 16, y: y - 32, size: 28, font: bold, color: INK,
  })
  const refLabel = safe(`Reference ${data.reference}`)
  page.drawText(refLabel, {
    x: PAGE_WIDTH - MARGIN - 16 - regular.widthOfTextAtSize(refLabel, 9),
    y: y - 32, size: 9, font: regular, color: MUTED,
  })
  y -= 90

  // ── Paid to ──────────────────────────────────────────────────────────────
  page.drawText('PAID TO', { x: MARGIN, y, size: 8, font: bold, color: MUTED })
  y -= 18
  drawRow(page, y, 'Name', data.recipientName, fonts); y -= 16
  drawRow(page, y, 'Email', data.recipientEmail, fonts); y -= 16
  drawRow(page, y, 'Paid as', data.recipientRole, fonts); y -= 16
  drawRow(page, y, 'Bank', data.bankName, fonts); y -= 16
  drawRow(page, y, 'Account', `**** ${data.accountLast4}`, fonts); y -= 16
  drawRow(page, y, 'Account holder', data.accountHolder, fonts); y -= 30

  // ── What this covers ─────────────────────────────────────────────────────
  if (data.sources.length > 0) {
    page.drawText('WHAT THIS COVERS', { x: MARGIN, y, size: 8, font: bold, color: MUTED })
    y -= 18
    for (const source of data.sources) {
      drawRow(page, y, `${source.label} - ${source.detail}`, formatMoneyExact(source.amountRands), fonts)
      y -= 16
      if (y < MARGIN + 150) break
    }
    y -= 14
  }

  // ── How it was worked out ────────────────────────────────────────────────
  //
  // This has to add up on the page. Earnings from the sales listed above are
  // gross less the booking fee; a payout can also carry a balance from earlier
  // that is not covered by those sales, so that is shown as its own line rather
  // than quietly making the arithmetic wrong.
  const earnedHereRands = data.grossSalesRands - data.bookingFeesRands
  const broughtForwardRands = Math.round((data.amountRands - earnedHereRands) * 100) / 100

  page.drawText('HOW IT WAS WORKED OUT', { x: MARGIN, y, size: 8, font: bold, color: MUTED })
  y -= 18
  drawRow(page, y, 'Ticket sales', formatMoneyExact(data.grossSalesRands), fonts); y -= 16
  drawRow(page, y, 'Ziyawa booking fee', `-${formatMoneyExact(data.bookingFeesRands)}`, fonts); y -= 16

  if (Math.abs(broughtForwardRands) >= 0.01) {
    drawRow(page, y, 'Earnings from these sales', formatMoneyExact(earnedHereRands), fonts); y -= 16
    drawRow(
      page,
      y,
      broughtForwardRands > 0 ? 'Balance carried from earlier' : 'Kept back for your next payout',
      `${broughtForwardRands > 0 ? '' : '-'}${formatMoneyExact(Math.abs(broughtForwardRands))}`,
      fonts
    )
    y -= 16
  }

  page.drawLine({ start: { x: MARGIN + 16, y: y + 6 }, end: { x: PAGE_WIDTH - MARGIN - 16, y: y + 6 }, thickness: 0.5, color: RULE })
  y -= 6
  drawRow(page, y, 'Paid to you', formatMoneyExact(data.amountRands), fonts, { bold: true, size: 11 })
  y -= 28

  page.drawText(
    safe(`Ziyawa paid ${formatMoneyExact(data.gatewayFeesRands)} in card processing fees and the bank transfer cost on these`),
    { x: MARGIN, y, size: 8, font: regular, color: MUTED }
  )
  y -= 11
  page.drawText('sales. Those are not deducted from you.', { x: MARGIN, y, size: 8, font: regular, color: MUTED })

  // ── Footer ───────────────────────────────────────────────────────────────
  const footerY = MARGIN + 24
  page.drawLine({ start: { x: MARGIN, y: footerY + 22 }, end: { x: PAGE_WIDTH - MARGIN, y: footerY + 22 }, thickness: 1, color: RULE })
  page.drawText(
    'Bank transfers usually arrive within one business day. If anything here looks wrong, reply to the email this came with.',
    { x: MARGIN, y: footerY + 8, size: 8, font: regular, color: MUTED }
  )
  page.drawText(safe(`(c) ${data.approvedAt.getFullYear()} Ziyawa - accounts@ziyawa.com`), {
    x: MARGIN, y: footerY - 4, size: 8, font: regular, color: MUTED,
  })

  return pdf.save()
}
