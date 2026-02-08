import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { ProviderMediaManager } from './media-manager';

export default async function ProviderMediaPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  // Get provider using profile_id (same as user.id)
  const { data: provider } = await supabase
    .from('providers')
    .select('id, business_name, profile_image')
    .eq('profile_id', user.id)
    .single();

  if (!provider) redirect('/dashboard/provider/setup');

  // Get existing media
  const { data: media } = await supabase
    .from('provider_media')
    .select('*')
    .eq('provider_id', provider.id)
    .order('display_order', { ascending: true });

  // Get cover image (if any)
  const coverMedia = media?.find(m => m.is_cover_image);

  return (
    <div className="min-h-screen bg-neutral-50">
      <DashboardHeader 
        title="Media Gallery" 
        subtitle="Add photos and videos of your work"
      />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <ProviderMediaManager 
          providerId={provider.id}
          userId={user.id}
          profileImage={provider.profile_image}
          coverImage={coverMedia?.url}
          initialMedia={media || []} 
        />
      </main>
    </div>
  );
}
