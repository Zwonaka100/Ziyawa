import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/reviews/[id]/helpful - Mark review as helpful
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in to vote' },
        { status: 401 }
      );
    }

    // Check if review exists
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Can't vote on your own review
    if (review.user_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot mark your own review as helpful' },
        { status: 400 }
      );
    }

    // Check if already voted
    const { data: existingVote } = await supabase
      .from('review_helpful_votes')
      .select('id')
      .eq('review_id', id)
      .eq('user_id', user.id)
      .single();

    if (existingVote) {
      // Remove the vote (toggle off)
      await supabase
        .from('review_helpful_votes')
        .delete()
        .eq('id', existingVote.id);

      return NextResponse.json({
        message: 'Helpful vote removed',
        isHelpful: false
      });
    }

    // Add helpful vote
    const { error: voteError } = await supabase
      .from('review_helpful_votes')
      .insert({
        review_id: id,
        user_id: user.id
      });

    if (voteError) throw voteError;

    return NextResponse.json({
      message: 'Marked as helpful',
      isHelpful: true
    });
  } catch (error) {
    console.error('Error voting helpful:', error);
    return NextResponse.json(
      { error: 'Failed to update vote' },
      { status: 500 }
    );
  }
}

// GET /api/reviews/[id]/helpful - Check if current user voted helpful
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ isHelpful: false });
    }

    const { data: vote } = await supabase
      .from('review_helpful_votes')
      .select('id')
      .eq('review_id', id)
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({ isHelpful: !!vote });
  } catch (error) {
    console.error('Error checking helpful vote:', error);
    return NextResponse.json({ isHelpful: false });
  }
}
