import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OrganizerProfile } from './organizer-profile';

interface OrganizerPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrganizerPage({ params }: OrganizerPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch organizer profile
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      avatar_url,
      location,
      company_name,
      bio,
      is_organizer,
      total_events_hosted,
      total_artists_paid,
      payment_completion_rate,
      organizer_rating,
      total_organizer_reviews,
      years_organizing,
      verified_at,
      created_at
    `)
    .eq('id', id)
    .eq('is_organizer', true)
    .single();

  if (!profile) {
    notFound();
  }

  // Fetch organizer's social links
  const { data: socialLinks } = await supabase
    .from('organizer_social_links')
    .select('*')
    .eq('organizer_id', id)
    .order('display_order', { ascending: true });

  // Fetch organizer's media
  const { data: media } = await supabase
    .from('organizer_media')
    .select('*')
    .eq('organizer_id', id)
    .order('display_order', { ascending: true });

  // Fetch organizer's past events (completed)
  const { data: pastEvents } = await supabase
    .from('events')
    .select(`
      id,
      title,
      event_date,
      venue,
      location,
      cover_image,
      tickets_sold,
      ticket_price
    `)
    .eq('organizer_id', id)
    .lt('event_date', new Date().toISOString())
    .order('event_date', { ascending: false })
    .limit(10);

  // Fetch organizer's upcoming events
  const { data: upcomingEvents } = await supabase
    .from('events')
    .select(`
      id,
      title,
      event_date,
      venue,
      location,
      cover_image,
      ticket_price
    `)
    .eq('organizer_id', id)
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true });

  // Fetch reviews for this organizer
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      *,
      reviewer:profiles!reviews_reviewer_id_fkey(
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('reviewee_id', id)
    .eq('reviewee_type', 'organizer')
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" /></div>}>
      <OrganizerProfile
        profile={profile}
        socialLinks={socialLinks || []}
        media={media || []}
        pastEvents={pastEvents || []}
        upcomingEvents={upcomingEvents || []}
        reviews={reviews || []}
      />
    </Suspense>
  );
}

export async function generateMetadata({ params }: OrganizerPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company_name')
    .eq('id', id)
    .single();

  const name = profile?.company_name || profile?.full_name || 'Organizer';

  return {
    title: `${name} | Event Organizer | Ziyawa`,
    description: `View events organized by ${name} on Ziyawa`,
  };
}
