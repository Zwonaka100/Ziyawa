import { notFound } from 'next/navigation'
import { loadUserForEdit } from '@/lib/admin/users'
import { AdminUserEditForm } from './edit-form'

export default async function AdminUserEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await loadUserForEdit(id)

  if (!user) notFound()

  return <AdminUserEditForm userId={id} initialUser={user} />
}
