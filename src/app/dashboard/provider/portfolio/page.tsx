import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { ProviderPortfolioManager } from './portfolio-manager';

export default async function ProviderPortfolioPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Get provider
  const { data: provider } = await supabase
    .from('providers')
    .select('id, business_name')
    .eq('user_id', user.id)
    .single();

  if (!provider) redirect('/dashboard');

  // Get existing portfolio entries with their media
  const { data: portfolio } = await supabase
    .from('provider_portfolio')
    .select(`
      *,
      media:provider_portfolio_media(*)
    `)
    .eq('provider_id', provider.id)
    .order('date', { ascending: false });

  return (
    <div className="min-h-screen bg-neutral-50">
      <DashboardHeader 
        title="Portfolio" 
        subtitle="Showcase your past projects and events"
      />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <ProviderPortfolioManager 
          providerId={provider.id}
          userId={user.id}
          initialPortfolio={portfolio || []} 
        />
      </main>
    </div>
  );
}
