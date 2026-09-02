import { loadPlatformSettings } from '@/lib/admin/settings'
import { AdminSettingsForm } from './settings-form'

export default async function AdminSettingsPage() {
  const rows = await loadPlatformSettings()

  return <AdminSettingsForm initialRows={rows} />
}
