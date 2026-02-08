'use client';

import { useState, useEffect, useCallback } from 'react';
import { ReviewCard } from './review-card';
import { ReviewForm } from './review-form';
import { RatingSummaryCard } from './rating-summary';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PenLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Review {
  id: string;
  event_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_verified_attendee: boolean;
  is_anonymous: boolean;
  helpful_count: number;
  organizer_response: string | null;
  organizer_responded_at: string | null;
  created_at: string;
  profiles: Profile | null;
}

interface RatingSummary {
  average_rating: number;
  total_reviews: number;
  rating_1_count: number;
  rating_2_count: number;
  rating_3_count: number;
  rating_4_count: number;
  rating_5_count: number;
}

interface ReviewsListProps {
  eventId: string;
  eventTitle: string;
  currentUserId?: string;
  isOrganizer?: boolean;
  canReview?: boolean; // User has attended and event has ended
}

export function ReviewsList({
  eventId,
  eventTitle,
  currentUserId,
  isOrganizer,
  canReview,
}: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('recent');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [respondingTo, setRespondingTo] = useState<Review | null>(null);
  const [response, setResponse] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const { toast } = useToast();

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/reviews?eventId=${eventId}&page=${page}&sortBy=${sortBy}&limit=10`
      );
      const data = await response.json();

      if (response.ok) {
        setReviews(data.reviews);
        setRatingSummary(data.ratingSummary);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eventId, page, sortBy]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({ title: 'Review deleted' });
        fetchReviews();
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete review',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitResponse = async () => {
    if (!respondingTo || !response.trim()) return;

    setIsSubmittingResponse(true);
    try {
      const res = await fetch(`/api/reviews/${respondingTo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizerResponse: response.trim() }),
      });

      if (res.ok) {
        toast({ title: 'Response posted' });
        setRespondingTo(null);
        setResponse('');
        fetchReviews();
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      toast({
        title: 'Error',
        description: 'Failed to post response',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  // Check if current user has already reviewed
  const hasReviewed = reviews.some((r) => r.user_id === currentUserId);

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Reviews & Ratings</h3>
        <RatingSummaryCard summary={ratingSummary} />
      </div>

      {/* Write Review Button */}
      {canReview && !hasReviewed && !isOrganizer && (
        <Button onClick={() => setShowReviewForm(true)} className="gap-2">
          <PenLine className="h-4 w-4" />
          Write a Review
        </Button>
      )}

      {/* Review Form Dialog */}
      <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
          </DialogHeader>
          <ReviewForm
            eventId={eventId}
            eventTitle={eventTitle}
            onSuccess={() => {
              setShowReviewForm(false);
              fetchReviews();
            }}
            onCancel={() => setShowReviewForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Organizer Response Dialog */}
      <Dialog open={!!respondingTo} onOpenChange={(open) => !open && setRespondingTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Responding to {respondingTo?.profiles?.full_name || 'Anonymous'}&apos;s review
            </p>
            <Textarea
              placeholder="Write your response..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={4}
            />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setRespondingTo(null)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSubmitResponse}
                disabled={isSubmittingResponse || !response.trim()}
                className="flex-1"
              >
                {isSubmittingResponse ? 'Posting...' : 'Post Response'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reviews List */}
      {reviews.length > 0 && (
        <div className="space-y-4">
          {/* Sort Dropdown */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {ratingSummary?.total_reviews || 0} reviews
            </p>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="helpful">Most Helpful</SelectItem>
                <SelectItem value="highest">Highest Rated</SelectItem>
                <SelectItem value="lowest">Lowest Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reviews */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  currentUserId={currentUserId}
                  isOrganizer={isOrganizer}
                  onDelete={() => handleDeleteReview(review.id)}
                  onRespond={() => setRespondingTo(review)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-3 text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
