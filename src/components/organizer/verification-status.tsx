'use client'

/**
 * Says, in one place, whether this organiser can publish and get paid.
 *
 * Verification used to matter only when someone tried to withdraw — long after
 * they had sold tickets. It now gates publishing, so the status has to be
 * obvious before they invest any effort in an event, not discovered at the
 * moment they press Publish.
 *
 * Four states, because "not verified" hides three very different situations
 * with three different next actions: never applied, waiting on us, or rejected
 * and waiting on them.
 */

import Link from 'next/link'
import { ShieldCheck, ShieldAlert, Clock, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type VerificationState = 'verified' | 'pending' | 'rejected' | 'none'

export function verificationStateFrom(
  isVerified: boolean | null | undefined,
  latestRequestStatus?: string | null
): VerificationState {
  if (isVerified) return 'verified'
  if (latestRequestStatus === 'pending') return 'pending'
  if (latestRequestStatus === 'rejected') return 'rejected'
  return 'none'
}

const VERIFY_HREF = '/dashboard/settings?tab=verification'

/** The compact form, for sitting beside a name or a page heading. */
export function VerificationBadge({ state }: { state: VerificationState }) {
  const config = {
    verified: { label: 'Verified organiser', className: 'border-green-300 bg-green-50 text-green-800', Icon: ShieldCheck },
    pending: { label: 'Verification in review', className: 'border-amber-300 bg-amber-50 text-amber-800', Icon: Clock },
    rejected: { label: 'Verification needs attention', className: 'border-red-300 bg-red-50 text-red-800', Icon: XCircle },
    none: { label: 'Not verified', className: 'border-neutral-300 bg-neutral-50 text-neutral-700', Icon: ShieldAlert },
  }[state]

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      <config.Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  )
}

/**
 * The full banner. Renders nothing when verified — a verified organiser needs
 * no reminder, and a permanent green bar trains people to ignore the space.
 */
export function VerificationStatusBanner({
  state,
  rejectionReason,
}: {
  state: VerificationState
  rejectionReason?: string | null
}) {
  if (state === 'verified') return null

  if (state === 'pending') {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="font-medium text-amber-900">We&apos;re reviewing your verification</p>
            <p className="mt-1 text-sm text-amber-800">
              Usually done within 1–2 business days. You can keep building events as drafts in the
              meantime — you&apos;ll be able to publish as soon as this is approved.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'rejected') {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
          <div>
            <p className="font-medium text-red-900">Your verification needs another look</p>
            {rejectionReason && (
              <p className="mt-1 whitespace-pre-wrap text-sm text-red-800">{rejectionReason}</p>
            )}
            <p className="mt-2 text-sm text-red-800">
              Fix the points above and submit again — anything that was fine can be reused.
            </p>
            <Link href={VERIFY_HREF}>
              <Button size="sm" className="mt-3">Update my verification</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-neutral-700" />
        <div>
          <p className="font-medium text-neutral-900">Verify your account to publish events</p>
          <p className="mt-1 text-sm text-neutral-700">
            You can create and edit events now, but they stay as drafts until your account is
            verified. We verify every organiser so ticket buyers know who they&apos;re paying, and so
            we can pay your earnings out without delay.
          </p>
          <p className="mt-2 text-sm text-neutral-700">
            It takes a few minutes — you&apos;ll need your ID and your bank details.
          </p>
          <Link href={VERIFY_HREF}>
            <Button size="sm" className="mt-3">Verify my account</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
