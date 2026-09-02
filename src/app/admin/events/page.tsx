import { listAdminEvents, listEventOrganizers } from '@/lib/admin/events'
import { AdminEventsTable } from './events-table'

interface AdminEventsPageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function AdminEventsPage({ searchParams }: AdminEventsPageProps) {
  const params = await searchParams

  // The list and the organizer dropdown don't depend on each other.
  const [{ events, totalCount }, organizers] = await Promise.all([
    listAdminEvents({
      search: params.q || '',
      lifecycle: params.lifecycle || 'all',
      state: params.state || 'all',
      organizer: params.organizer || 'all',
      dateFrom: params.date_from || '',
      dateTo: params.date_to || '',
      sortBy: params.sort || 'created_at',
      sortDirection: (params.dir || 'desc') as 'asc' | 'desc',
    }),
    listEventOrganizers(),
  ])

  return (
    <AdminEventsTable
      initialEvents={events}
      initialTotalCount={totalCount}
      initialOrganizers={organizers}
    />
  )
}
