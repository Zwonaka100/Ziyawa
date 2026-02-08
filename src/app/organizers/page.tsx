import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { OrganizersGrid } from './organizers-grid';

export const metadata = {
  title: 'Event Organizers | Ziyawa',
  description: 'Discover trusted event organizers in South Africa',
};

export default async function OrganizersPage() {
  const supabase = await createClient();

  // Fetch organizers
  const { data: organizers } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      avatar_url,
      location,
      company_name,
      bio,
      total_events_hosted,
      organizer_rating,
      total_organizer_reviews,
      payment_completion_rate,
      verified_at
    `)
    .eq('is_organizer', true)
    .order('total_events_hosted', { ascending: false });

  // Get event counts for each organizer
  const organizerIds = organizers?.map(o => o.id) || [];
  
  const { data: upcomingEventCounts } = await supabase
    .from('events')
    .select('organizer_id, id')
    .in('organizer_id', organizerIds)
    .gte('event_date', new Date().toISOString());

  // Count upcoming events per organizer
  const upcomingCounts: Record<string, number> = {};
  upcomingEventCounts?.forEach(e => {
    upcomingCounts[e.organizer_id] = (upcomingCounts[e.organizer_id] || 0) + 1;
  });

  // Add upcoming event count to each organizer
  const organizersWithCounts = organizers?.map(o => ({
    ...o,
    upcoming_events: upcomingCounts[o.id] || 0
  })) || [];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-neutral-900">
            Event Organizers
          </h1>
          <p className="text-neutral-500 mt-2 max-w-xl mx-auto">
            Discover trusted event organizers in South Africa. View their track record, 
            past events, and artist reviews.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Suspense fallback={
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
          </div>
        }>
          <OrganizersGrid organizers={organizersWithCounts} />
        </Suspense>
      </main>
    </div>
  );
}
