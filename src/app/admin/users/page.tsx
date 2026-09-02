import { listAdminUsers } from '@/lib/admin/users'
import { AdminUsersTable } from './users-table'

interface AdminUsersPageProps {
  searchParams: Promise<{ q?: string; role?: string; status?: string }>
}

// The list is resolved here, so the table arrives populated. The select is also
// narrowed to the columns the table renders — this page used to send every
// column of every profile to the browser, balances and admin flags included.
export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const params = await searchParams
  const { users, totalCount } = await listAdminUsers({
    search: params.q || '',
    role: params.role || 'all',
    status: params.status || 'all',
    page: 1,
  })

  return <AdminUsersTable initialUsers={users} initialTotalCount={totalCount} />
}
