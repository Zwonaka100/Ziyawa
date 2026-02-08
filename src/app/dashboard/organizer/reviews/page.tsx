import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OrganizerReviewsDashboard } from '@/components/dashboard/organizer-reviews-dashboard';

export const metadata = {
  title: 'Reviews | Organizer Dashboard | Ziyawa',
  description: 'View and respond to reviews for your events',
};

export default async function OrganizerReviewsPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/auth/signin');
  }

  // Get organizer's events with reviews
  const { data: events } = await supabase
    .from('events')
    .select(`
      id,
      title,
      cover_image,
      event_date
    `)
    .eq('organizer_id', user.id)
    .order('event_date', { ascending: false });

  // Get all reviews for organizer's events
  const eventIds = events?.map(e => e.id) || [];
  
  let reviews = [];
  let ratingSummaries: Record<string, { average_rating: number; total_reviews: number }> = {};

  if (eventIds.length > 0) {
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          avatar_url
        ),
        events:event_id (
          id,
          title
        )
      `)
      .in('event_id', eventIds)
      .order('created_at', { ascending: false });

    reviews = reviewsData || [];

    // Get rating summaries for all events
    const { data: summaries } = await supabase
      .from('event_rating_summaries')
      .select('*')
      .in('event_id', eventIds);

    summaries?.forEach(s => {
      ratingSummaries[s.event_id] = {
        average_rating: Number(s.average_rating),
        total_reviews: s.total_reviews
      };
    });
  }

  // Calculate overall stats
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 0;
  const pendingResponses = reviews.filter(r => !r.organizer_response).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <OrganizerReviewsDashboard
        events={events || []}
        reviews={reviews}
        ratingSummaries={ratingSummaries}
        stats={{
          totalReviews,
          averageRating: avgRating,
          pendingResponses
        }}
      />
    </div>
  );
}
