/**
 * VERIFICATION REJECTION REASONS
 *
 * Shared between the admin review UI and the review API so the wording a user
 * receives is identical to what the admin picked.
 *
 * Each reason carries a short label for the reviewer and a plain, actionable
 * instruction for the user. Free-text rejections tended to be terse ("blurry")
 * and left people guessing at what to actually change, which produced repeat
 * submissions with the same problem.
 */

export type VerificationEntityScope = 'individual' | 'business' | 'both'

export interface VerificationRejectionReason {
  code: string
  /** Short description shown to the reviewer. */
  adminLabel: string
  /** What the user is told, phrased as the action they need to take. */
  userMessage: string
  /** Which submission types this reason can apply to. */
  scope: VerificationEntityScope
}

export const VERIFICATION_REJECTION_REASONS: VerificationRejectionReason[] = [
  // ── Identity document ─────────────────────────────────────────────────────
  {
    code: 'id_unclear',
    adminLabel: 'ID photo unclear or cut off',
    userMessage:
      'Your ID photo was blurry, dark, or partly cut off. Please re-upload a clear photo with all four corners visible and no glare.',
    scope: 'both',
  },
  {
    code: 'id_expired',
    adminLabel: 'ID or passport expired',
    userMessage:
      'The identity document you uploaded has expired. Please upload a valid, in-date ID or passport.',
    scope: 'both',
  },
  {
    code: 'id_wrong_document',
    adminLabel: 'Wrong document type uploaded',
    userMessage:
      'The file you uploaded is not a valid identity document. Please upload your South African ID (both sides) or the photo page of your passport.',
    scope: 'both',
  },
  {
    code: 'id_name_mismatch',
    adminLabel: 'Name entered does not match ID',
    userMessage:
      'The full name you entered does not match the name on your ID. Please enter your name exactly as it appears on the document, including all middle names.',
    scope: 'individual',
  },
  {
    code: 'id_number_mismatch',
    adminLabel: 'ID number does not match document',
    userMessage:
      'The ID number you entered does not match the document you uploaded. Please check the number and resubmit.',
    scope: 'both',
  },

  // ── Bank document ─────────────────────────────────────────────────────────
  {
    code: 'bank_doc_unreadable',
    adminLabel: 'Bank document unreadable or password-protected',
    userMessage:
      'We could not open or read your bank document. If it is a password-protected PDF, please remove the password first, or upload a bank confirmation letter from your banking app instead.',
    scope: 'both',
  },
  {
    code: 'bank_doc_missing_details',
    adminLabel: 'Bank document missing account number or holder name',
    userMessage:
      'Your bank document must clearly show both your account number and the account holder name. Please upload a bank confirmation letter or a statement page that shows both.',
    scope: 'both',
  },
  {
    code: 'bank_doc_too_old',
    adminLabel: 'Bank statement too old',
    userMessage:
      'Your bank statement is older than three months. Please upload a recent statement or a current bank confirmation letter.',
    scope: 'both',
  },
  {
    code: 'bank_account_number_mismatch',
    adminLabel: 'Account number does not match bank document',
    userMessage:
      'The account number you entered does not match the one on your bank document. Please correct it — an incorrect account number can send your money to the wrong person.',
    scope: 'both',
  },
  {
    code: 'bank_holder_mismatch',
    adminLabel: 'Account holder does not match ID / registered name',
    userMessage:
      'The bank account is not in your name. We can only pay out to an account held in the same name as your verified identity. Please provide an account in your own name.',
    scope: 'both',
  },

  // ── Business ──────────────────────────────────────────────────────────────
  {
    code: 'cipc_unclear',
    adminLabel: 'CIPC certificate unclear or invalid',
    userMessage:
      'We could not read your CIPC registration certificate. Please upload a clear, complete copy of the official document.',
    scope: 'business',
  },
  {
    code: 'business_name_mismatch',
    adminLabel: 'Business name does not match CIPC certificate',
    userMessage:
      'The business name you entered does not match your CIPC certificate. Please use the registered name exactly as it appears, not a trading name.',
    scope: 'business',
  },
  {
    code: 'rep_id_issue',
    adminLabel: "Representative's ID missing or unclear",
    userMessage:
      "We could not verify the representative's ID. Please upload a clear copy of the ID for a director, member, or the sole proprietor.",
    scope: 'business',
  },
]

export const REJECTION_REASONS_BY_CODE = new Map(
  VERIFICATION_REJECTION_REASONS.map((reason) => [reason.code, reason])
)

export function reasonsForEntityType(entityType: 'individual' | 'business') {
  return VERIFICATION_REJECTION_REASONS.filter(
    (reason) => reason.scope === 'both' || reason.scope === entityType
  )
}

/**
 * Build the message the user sees from the selected codes plus any note the
 * reviewer added. Unknown codes are ignored rather than echoed back, so a stale
 * client cannot inject arbitrary text into a user-facing email.
 */
export function buildRejectionMessage(codes: string[], note?: string): string {
  const messages = codes
    .map((code) => REJECTION_REASONS_BY_CODE.get(code)?.userMessage)
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
