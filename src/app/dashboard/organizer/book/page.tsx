import { redirect } from 'next/navigation'

interface LegacyOrganizerBookPageProps {
  searchParams: Promise<{
    artist?: string
  }>
}

export default async function LegacyOrganizerBookPage({ searchParams }: LegacyOrganizerBookPageProps) {
  const { artist } = await searchParams

  if (artist) {
    redirect(`/dashboard/organizer/book-artist/${artist}`)
  }

  redirect('/dashboard/organizer/events')
}
