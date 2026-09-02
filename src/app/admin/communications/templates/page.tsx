import { listEmailTemplates } from '@/lib/admin/email-templates'
import { AdminEmailTemplatesTable } from './templates-table'

export default async function AdminEmailTemplatesPage() {
  const templates = await listEmailTemplates()

  return <AdminEmailTemplatesTable initialTemplates={templates as never} />
}
