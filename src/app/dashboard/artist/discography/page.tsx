import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DiscographyManager } from './discography-manager';

export default async function ArtistDiscographyPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Get artist
  const { data: artist } = await supabase
    .from('artists')
    .select('id, name')
    .eq('user_id', user.id)
    .single();

  if (!artist) redirect('/dashboard');

  // Get existing discography
  const { data: discography } = await supabase
    .from('artist_discography')
    .select('*')
    .eq('artist_id', artist.id)
    .order('release_date', { ascending: false });

  return (
    <div className="min-h-screen bg-neutral-50">
      <DashboardHeader 
        title="Discography" 
        subtitle="Manage your music releases"
      />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <DiscographyManager 
          artistId={artist.id} 
          initialReleases={discography || []} 
        />
      </main>
    </div>
  );
}
