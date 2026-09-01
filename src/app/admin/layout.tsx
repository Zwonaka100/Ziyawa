import { requireAdminPage } from '@/lib/admin-auth'
import { AdminShell } from '@/components/admin/admin-shell'

/**
 * The admin gate, now on the server.
 *
 * This was a client component: it rendered, read useAuth(), ran its own
 * profiles query for is_admin, then called router.push('/') if you weren't one.
 * That has two problems. It costs an extra browser round trip before any admin
 * page starts fetching its own data — a spinner on every single admin screen.
 * And a redirect fired after the markup has already been sent is not a barrier;
 * it is a suggestion. RLS was doing the actual protecting.
 *
 * Now the check happens before anything renders. A non-admin receives a
 * redirect, not an admin page they are then navigated away from.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await requireAdminPage()

  return (
    <AdminShell adminName={admin.fullName} adminRole={admin.adminRole}>
      {children}
    </AdminShell>
  )
}
