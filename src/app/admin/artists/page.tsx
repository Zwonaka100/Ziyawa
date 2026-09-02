import { listAdminArtists } from '@/lib/admin/artists'
import { AdminArtistsTable } from './artists-table'

// Data is fetched here, while the page renders, rather than by the browser on
// mount. The table arrives populated instead of arriving empty and filling in.
export default async function AdminArtistsPage() {
  const artists = await listAdminArtists()

  return <AdminArtistsTable initialArtists={artists} />
}
