/**
 * Why a payout was declined, phrased twice: once for the reviewer and once for
 * the person waiting to be paid.
 *
 * Modelled on src/lib/verification-rejection-reasons.ts, which exists because
 * free-text rejections came out terse ("blurry") and produced resubmissions
 * with the same problem. A declined payout is worse than a declined document —
 * someone is expecting money — so the same discipline applies: the reviewer
 * ticks what is wrong, and the recipient is told exactly that, plus whatever
 * the reviewer chose to add.
 *
 * Before this, a payout rejection required a note and then told the recipient
 * nothing at all: no email, no in-app notification. The reason was recorded for
 * admin eyes only, and their money simply stayed put with no explanation.
 */

export interface PayoutRejectionReason {
  code: string
  /** Short description shown to the reviewer. */
  adminLabel: string
  /** What the recipient is told, phrased as what happens next. */
  userMessage: string
}

export const PAYOUT_REJECTION_REASONS: PayoutRejectionReason[] = [
  {
    code: 'bank_details_mismatch',
    adminLabel: 'Bank account holder does not match verified name',
    userMessage:
      'The account holder name on your bank details does not match the name we verified for your account. Please update your bank details in Settings so the two match, and we will release the payment.',
  },
  {
    code: 'bank_account_invalid',
    adminLabel: 'Bank rejected the account details',
    userMessage:
      'Your bank could not accept a payment to the account on file. Please check the account number and branch details in Settings and correct anything that is wrong.',
  },
  {
    code: 'verification_incomplete',
    adminLabel: 'Verification not complete',
    userMessage:
      'We can only pay out to a fully verified account. Please finish verification in Settings and your payment will be released.',
  },
  {
    code: 'dispute_open',
    adminLabel: 'An open dispute covers these funds',
    userMessage:
      'Some of this money relates to an event with an open dispute. We are holding the payment until that is resolved, and it will be released as soon as it is settled. Your funds are safe.',
  },
  {
    code: 'under_review',
    adminLabel: 'Held for a routine review',
    userMessage:
      'We are running a routine check on this payment before it goes out. Nothing is wrong with your account and your funds are safe — we will be in touch shortly.',
  },
  {
    code: 'amount_changed',
    adminLabel: 'Balance changed after the request was queued',
    userMessage:
      'Your available balance changed after this payment was queued, so we cancelled it rather than send the wrong amount. A corrected payment will be queued automatically.',
  },
  {
    code: 'duplicate_request',
    adminLabel: 'Duplicate of another payout',
    userMessage:
      'This payment was queued twice, so we cancelled the duplicate. The original is still on its way — you have not lost anything.',
  },
]

export const PAYOUT_REASONS_BY_CODE = new Map(
  PAYOUT_REJECTION_REASONS.map((reason) => [reason.code, reason])
)

/**
 * Compose what the recipient is told from the selected codes plus the
 * reviewer's note. Unknown codes are dropped rather than echoed, so a stale or
 * tampered client cannot inject its own text into an email Ziyawa sends.
 */
export function buildPayoutRejectionMessage(codes: string[], note?: string): string {
  const messages = codes
    .map((code) => PAYOUT_REASONS_BY_CODE.get(code)?.userMessage)
    .filter((message): message is string => Boolean(message))

  const parts: string[] = []
  if (messages.length === 1) {
    parts.push(messages[0])
  } else if (messages.length > 1) {
    parts.push(messages.map((message, index) => `${index + 1}. ${message}`).join('\n'))
  }

  const trimmedNote = note?.trim()
  if (trimmedNote) parts.push(trimmedNote)

  return parts.join('\n\n')
}
