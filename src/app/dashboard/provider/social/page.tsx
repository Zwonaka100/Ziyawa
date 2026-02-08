import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { ProviderSocialManager } from './social-manager';

export default async function ProviderSocialPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  // Get provider
  const { data: provider } = await supabase
    .from('providers')
    .select('id, business_name')
    .eq('user_id', user.id)
    .single();

  if (!provider) redirect('/dashboard/provider/setup');

  // Get existing social links
  const { data: socialLinks } = await supabase
    .from('provider_social_links')
    .select('*')
    .eq('provider_id', provider.id)
    .order('display_order', { ascending: true });

  return (
    <div className="min-h-screen bg-neutral-50">
      <DashboardHeader 
        title="Social Links" 
        subtitle="Connect your business profiles"
      />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <ProviderSocialManager 
          providerId={provider.id} 
          initialLinks={socialLinks || []} 
        />
      </main>
    </div>
  );
}
