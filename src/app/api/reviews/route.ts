import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/reviews?eventId=xxx - Get reviews for an event
// GET /api/reviews?userId=xxx - Get reviews by a user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const eventId = searchParams.get('eventId');
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'recent'; // recent, helpful, highest, lowest
    
    const offset = (page - 1) * limit;

    let query = supabase
      .from('reviews')
      .select(`
        *
      `, { count: 'exact' });

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Apply sorting
    switch (sortBy) {
      case 'helpful':
        query = query.order('helpful_count', { ascending: false });
        break;
      case 'highest':
        query = query.order('rating', { ascending: false });
        break;
      case 'lowest':
        query = query.order('rating', { ascending: true });
        break;
      case 'recent':
      default:
        query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data: reviews, error, count } = await query;

    if (error) throw error;

    // Fetch user profiles separately for each review
    let reviewsWithProfiles = reviews || [];
    if (reviews && reviews.length > 0) {
      const userIds = [...new Set(reviews.map(r => r.user_id).filter(Boolean))];
      const eventIds = [...new Set(reviews.map(r => r.event_id).filter(Boolean))];
      
      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      // Fetch events
      const { data: events } = await supabase
        .from('events')
        .select('id, title, slug')
        .in('id', eventIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const eventMap = new Map((events || []).map(e => [e.id, e]));
      
      reviewsWithProfiles = reviews.map(review => ({
        ...review,
        profiles: profileMap.get(review.user_id) || null,
        events: eventMap.get(review.event_id) || null,
      }));
    }

    // Get rating summary if eventId provided
    let ratingSummary = null;
    if (eventId) {
      const { data: summary } = await supabase
        .from('event_rating_summaries')
        .select('*')
        .eq('event_id', eventId)
        .single();
      
      ratingSummary = summary;
    }

    return NextResponse.json({
      reviews: reviewsWithProfiles,
      ratingSummary,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST /api/reviews - Create a new review
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in to leave a review' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { eventId, rating, title, comment, isAnonymous } = body;

    // Validate required fields
    if (!eventId || !rating) {
      return NextResponse.json(
        { error: 'Event ID and rating are required' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Check if event exists and has ended
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, event_date, organizer_id, state, completed_at')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Can't review your own event
    if (event.organizer_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot review your own event' },
        { status: 400 }
      );
    }

    // Check if event has ended using the live event_date field
    const eventEndDate = event.event_date ? new Date(`${event.event_date}T23:59:59`) : null;
    const now = new Date();
    const eventMarkedCompleted = event.state === 'completed' || Boolean(event.completed_at);
    if (!eventMarkedCompleted && eventEndDate && eventEndDate > now) {
      return NextResponse.json(
        { error: 'You can only review events that have ended' },
        { status: 400 }
      );
    }

    // Check if user already reviewed this event
    const { data: existingReview, error: existingReviewError } = await supabase
      .from('reviews')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingReviewError) {
      console.error('Existing review check error:', existingReviewError)
      return NextResponse.json(
        { error: 'Unable to verify existing review status right now. Please try again.' },
        { status: 500 }
      );
    }

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this event' },
        { status: 400 }
      );
    }

    // Check if user attended the event by looking for at least one linked ticket.
    const { data: tickets, error: ticketError } = await supabase
      .from('tickets')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .limit(1);

    if (ticketError) {
      console.error('Ticket lookup error during review submit:', ticketError)
      return NextResponse.json(
        { error: 'Unable to validate ticket ownership right now. Please try again.' },
        { status: 500 }
      );
    }

    const isVerifiedAttendee = Boolean(tickets?.length);

    // Create the review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        event_id: eventId,
        user_id: user.id,
        rating,
        title: title?.trim() || null,
        comment: comment?.trim() || null,
        is_verified_attendee: isVerifiedAttendee,
        is_anonymous: isAnonymous || false
      })
      .select('*')
      .single();

    if (reviewError) {
      console.error('Review creation error:', reviewError);
      const duplicateReview = reviewError.code === '23505';
      return NextResponse.json(
        { error: duplicateReview ? 'You have already reviewed this event' : (reviewError.message || 'Failed to submit review') },
        { status: duplicateReview ? 400 : 500 }
      );
    }

    // Fetch profile separately to avoid fragile embedded relationship errors on insert.
    const { data: reviewerProfile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    return NextResponse.json({
      message: 'Review submitted successfully',
      review: {
        ...review,
        profiles: reviewerProfile || null,
      }
    });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit review' },
      { status: 500 }
    );
  }
}
