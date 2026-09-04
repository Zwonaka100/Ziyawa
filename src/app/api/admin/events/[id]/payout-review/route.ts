import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { loadEventPayoutReview } from '@/lib/admin/event-payout-review'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminApi()
  if ('response' in gate) return gate.response

  const { id } = await params
  const review = await loadEventPayoutReview(id)
  if (!review) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  return NextResponse.json(review)
}
