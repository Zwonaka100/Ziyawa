import { Suspense, type ComponentProps } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OrganizerProfile } from './organizer-profile';

interface OrganizerPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrganizerPage({ params }: OrganizerPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Read the public projection, not the profiles table. This page is served to
  // logged-out visitors, and profiles carries email, phone, balances and admin
  // flags that must never reach them. The view exposes display columns only and
  // already filters to is_organizer = true, so a non-organizer id 404s here.
  const { data: profile, error: _error } = await supabase
    .from('v_public_organizers')
    .select(`
      id,
      full_name,
      avatar_url,
      location,
      company_name,
      verified_at,
      created_at,
      organizer_rating,
      organizer_reviews
    `)
    .eq('id', id)
    .maybeSingle();

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

  // Groovists review events, so an organiser's reviews are the reviews on
  // their events. (This used to query reviewer_id / reviewee_id /
  // reviewee_type from an older review design; those columns no longer exist,
  // so the query failed and every organiser showed "No reviews yet".)
  const { data: eventReviews } = await supabase
    .from('reviews')
    .select('id, user_id, rating, title, comment, is_anonymous, is_verified_attendee, organizer_response, organizer_responded_at, created_at, updated_at, events!inner(organizer_id)')
    .eq('events.organizer_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Reviewer names come from the public projection: this page is served to
  // logged-out visitors, who cannot read profiles.
  const reviewerIds = [...new Set((eventReviews || []).filter((r) => !r.is_anonymous).map((r) => r.user_id))];
  const { data: reviewers } = reviewerIds.length
    ? await supabase.from('v_public_profiles').select('id, full_name, avatar_url').in('id', reviewerIds)
    : { data: [] as { id: string; full_name: string | null; avatar_url: string | null }[] };
  const reviewerMap = new Map((reviewers || []).map((r) => [r.id, r]));

  // Shape event reviews for the shared ReviewsList.
  const reviews = (eventReviews || []).map((r) => ({
    id: r.id,
    overall_rating: r.rating,
    title: r.title,
    content: r.comment,
    is_verified: r.is_verified_attendee,
    response: r.organizer_response,
    response_at: r.organizer_responded_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
    reviewer: r.is_anonymous
      ? { id: '', full_name: 'Anonymous Groovist', avatar_url: null }
      : reviewerMap.get(r.user_id) ?? { id: r.user_id, full_name: null, avatar_url: null },
  })) as unknown as ComponentProps<typeof OrganizerProfile>['reviews'];

  return (
    <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" /></div>}>
      <OrganizerProfile
        profile={{ ...profile, total_organizer_reviews: profile.organizer_reviews ?? undefined }}
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
    .from('v_public_organizers')
    .select('full_name, company_name')
    .eq('id', id)
    .maybeSingle();

  const name = profile?.company_name || profile?.full_name || 'Organizer';

  return {
    title: `${name} | Event Organizer | Ziyawa`,
    description: `View events organized by ${name} on Ziyawa`,
  };
}
