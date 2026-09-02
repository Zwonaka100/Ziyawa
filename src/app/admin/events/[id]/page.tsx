import { notFound } from 'next/navigation'
import { loadAdminEventDetail } from '@/lib/admin/event-detail'
import { AdminEventDetail } from './event-detail'

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { event, buyers, reports } = await loadAdminEventDetail(id)

  if (!event) notFound()

  return (
    <AdminEventDetail
      eventId={id}
      initialEvent={event as never}
      initialBuyers={buyers as never}
      initialReports={reports as never}
    />
  )
}
