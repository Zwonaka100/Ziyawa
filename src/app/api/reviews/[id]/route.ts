import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/reviews/[id] - Get a single review
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: review, error } = await supabase
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
      `)
      .eq('id', id)
      .single();

    if (error || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ review });
  } catch (error) {
    console.error('Error fetching review:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review' },
      { status: 500 }
    );
  }
}

// PATCH /api/reviews/[id] - Update a review (user) or add organizer response
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Get the review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select(`
        *,
        events:event_id (
          organizer_id
        )
      `)
      .eq('id', id)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    const isOwner = review.user_id === user.id;
    const isOrganizer = review.events?.organizer_id === user.id;

    if (!isOwner && !isOrganizer) {
      return NextResponse.json(
        { error: 'You can only edit your own reviews or respond as organizer' },
        { status: 403 }
      );
    }

    let updateData: Record<string, unknown> = {};

    if (isOwner) {
      // User updating their own review
      const { rating, title, comment, isAnonymous } = body;
      
      if (rating !== undefined) {
        if (rating < 1 || rating > 5) {
          return NextResponse.json(
            { error: 'Rating must be between 1 and 5' },
            { status: 400 }
          );
        }
        updateData.rating = rating;
      }
      
      if (title !== undefined) updateData.title = title?.trim() || null;
      if (comment !== undefined) updateData.comment = comment?.trim() || null;
      if (isAnonymous !== undefined) updateData.is_anonymous = isAnonymous;
      updateData.updated_at = new Date().toISOString();
    }

    if (isOrganizer && body.organizerResponse !== undefined) {
      // Organizer responding to review
      updateData.organizer_response = body.organizerResponse?.trim() || null;
      updateData.organizer_responded_at = body.organizerResponse ? new Date().toISOString() : null;
    }

    const { data: updatedReview, error: updateError } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      message: 'Review updated successfully',
      review: updatedReview
    });
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json(
      { error: 'Failed to update review' },
      { status: 500 }
    );
  }
}

// DELETE /api/reviews/[id] - Delete a review
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user owns the review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('user_id')
      .eq('id', id)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    if (review.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own reviews' },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    );
  }
}
