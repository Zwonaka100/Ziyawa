import { listRecipients } from '@/lib/admin/recipients'
import { listTemplateOptions } from '@/lib/admin/email-templates'
import { AdminBulkEmailForm } from './bulk-form'

export default async function AdminBulkEmailPage() {
  const [recipients, templates] = await Promise.all([
    listRecipients({ limit: 500 }),
    listTemplateOptions(),
  ])

  return <AdminBulkEmailForm initialRecipients={recipients} initialTemplates={templates as never} />
}
