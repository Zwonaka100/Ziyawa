import { notFound } from 'next/navigation'
import { loadAdminEventDetail } from '@/lib/admin/event-detail'
import { AdminEventDetail } from './event-detail'

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const detail = await loadAdminEventDetail(id)

  if (!detail.event) notFound()

  return (
    <AdminEventDetail
      eventId={id}
      initialEvent={detail.event as never}
      initialBuyers={detail.buyers as never}
      initialReports={detail.reports as never}
      sales={detail.sales}
      money={detail.money}
      reviews={detail.reviews}
      averageRating={detail.averageRating}
      eventBookings={detail.eventBookings}
      attendance={detail.attendance}
    />
  )
}
