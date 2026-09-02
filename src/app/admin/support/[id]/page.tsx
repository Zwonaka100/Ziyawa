import { notFound } from 'next/navigation'
import { requireAdminPage } from '@/lib/admin-auth'
import { loadSupportTicket } from '@/lib/admin/support-detail'
import { AdminTicketDetail } from './ticket-detail'

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // The admin's own identity used to be two more browser round trips
  // (getUser, then a profiles read). It is already known here.
  const [admin, { ticket, replies }] = await Promise.all([
    requireAdminPage(),
    loadSupportTicket(id),
  ])

  if (!ticket) notFound()

  return (
    <AdminTicketDetail
      ticketId={id}
      initialTicket={ticket as never}
      initialReplies={replies as never}
      currentAdminId={admin.userId}
      currentAdminName={admin.fullName ?? 'Admin'}
    />
  )
}
