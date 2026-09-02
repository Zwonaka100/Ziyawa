import { listRecipients } from '@/lib/admin/recipients'
import { listTemplateOptions } from '@/lib/admin/email-templates'
import { AdminSendEmailForm } from './send-form'

export default async function AdminSendEmailPage() {
  const [recipients, templates] = await Promise.all([
    listRecipients({ limit: 100 }),
    listTemplateOptions(),
  ])

  return <AdminSendEmailForm initialRecipients={recipients} initialTemplates={templates as never} />
}
