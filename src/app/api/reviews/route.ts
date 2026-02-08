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
        *,
        profiles:user_id (
          id,
          full_name,
          avatar_url
        ),
        events:event_id (
          id,
          title,
          slug
        )
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
      reviews: reviews || [],
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
      .select('id, title, end_date, organizer_id')
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

    // Check if event has ended (optional - you might want to allow reviews before)
    const eventEndDate = new Date(event.end_date);
    const now = new Date();
    if (eventEndDate > now) {
      return NextResponse.json(
        { error: 'You can only review events that have ended' },
        { status: 400 }
      );
    }

    // Check if user already reviewed this event
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this event' },
        { status: 400 }
      );
    }

    // Check if user attended the event (has a ticket)
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .in('status', ['confirmed', 'checked_in'])
      .single();

    const isVerifiedAttendee = !!ticket;

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
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (reviewError) {
      console.error('Review creation error:', reviewError);
      throw reviewError;
    }

    return NextResponse.json({
      message: 'Review submitted successfully',
      review
    });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}
