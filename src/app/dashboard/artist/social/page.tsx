import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { ArtistSocialManager } from './social-manager';

export default async function ArtistSocialPage() {
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

  // Get existing social links
  const { data: socialLinks } = await supabase
    .from('artist_social_links')
    .select('*')
    .eq('artist_id', artist.id)
    .order('display_order', { ascending: true });

  return (
    <div className="min-h-screen bg-neutral-50">
      <DashboardHeader 
        title="Social Links" 
        subtitle="Connect your social media profiles"
      />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <ArtistSocialManager 
          artistId={artist.id} 
          initialLinks={socialLinks || []} 
        />
      </main>
    </div>
  );
}
