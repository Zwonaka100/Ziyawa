'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Star, ThumbsUp, Flag, MessageSquare, CheckCircle, Play } from 'lucide-react';
import { Review, VideoReview } from '@/types/database';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ReviewWithAuthor extends Review {
  reviewer?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  video_review?: VideoReview | null;
}

interface ReviewCardProps {
  review: ReviewWithAuthor;
  onRespond?: (reviewId: string, response: string) => void;
  canRespond?: boolean;
  className?: string;
}

export function ReviewCard({ review, onRespond, canRespond = false, className }: ReviewCardProps) {
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [response, setResponse] = useState('');

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleSubmitResponse = () => {
    if (onRespond && response.trim()) {
      onRespond(review.id, response);
      setShowResponseForm(false);
      setResponse('');
    }
  };

  return (
    <div className={cn('bg-white border border-neutral-200 rounded-xl p-5', className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neutral-200 overflow-hidden">
            {review.reviewer?.avatar_url ? (
              <Image
                src={review.reviewer.avatar_url}
                alt=""
                width={40}
                height={40}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-500 text-sm font-medium">
                {review.reviewer?.full_name?.charAt(0) || '?'}
              </div>
            )}
          </div>
          <div>
            <p className="font-medium text-neutral-900">
              {review.reviewer?.full_name || 'Anonymous'}
            </p>
            <p className="text-sm text-neutral-500">{formatDate(review.created_at)}</p>
          </div>
        </div>

        {/* Rating stars */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                'h-4 w-4',
                star <= review.overall_rating
                  ? 'text-yellow-500 fill-current'
                  : 'text-neutral-300'
              )}
            />
          ))}
        </div>
      </div>

      {/* Verified badge */}
      {review.is_verified && (
        <div className="flex items-center gap-1.5 mb-3 text-sm text-green-700">
          <CheckCircle className="h-4 w-4" />
          <span>Verified booking via Ziyawa</span>
        </div>
      )}

      {/* Title */}
      {review.title && (
        <h4 className="font-semibold text-neutral-900 mb-2">{review.title}</h4>
      )}

      {/* Content */}
      {review.content && (
        <p className="text-neutral-700 mb-4">{review.content}</p>
      )}

      {/* Video review preview */}
      {review.video_review && (
        <div className="relative aspect-video rounded-lg overflow-hidden bg-neutral-100 mb-4">
          {review.video_review.thumbnail_url ? (
            <Image
              src={review.video_review.thumbnail_url}
              alt="Video review"
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="h-12 w-12 text-neutral-400" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="h-7 w-7 text-neutral-900 ml-1" fill="currentColor" />
            </div>
          </div>
        </div>
      )}

      {/* Category ratings */}
      {(review.professionalism_rating || review.communication_rating || review.quality_rating) && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 p-3 bg-neutral-50 rounded-lg">
          {review.professionalism_rating && (
            <div>
              <p className="text-xs text-neutral-500">Professionalism</p>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500" fill="currentColor" />
                <span className="text-sm font-medium">{review.professionalism_rating}</span>
              </div>
            </div>
          )}
          {review.communication_rating && (
            <div>
              <p className="text-xs text-neutral-500">Communication</p>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500" fill="currentColor" />
                <span className="text-sm font-medium">{review.communication_rating}</span>
              </div>
            </div>
          )}
          {review.quality_rating && (
            <div>
              <p className="text-xs text-neutral-500">Quality</p>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500" fill="currentColor" />
                <span className="text-sm font-medium">{review.quality_rating}</span>
              </div>
            </div>
          )}
          {review.punctuality_rating && (
            <div>
              <p className="text-xs text-neutral-500">Punctuality</p>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500" fill="currentColor" />
                <span className="text-sm font-medium">{review.punctuality_rating}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trust indicators */}
      <div className="flex flex-wrap gap-2 mb-4">
        {review.showed_up === true && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
            <CheckCircle className="h-3 w-3" />
            Showed up on time
          </span>
        )}
        {review.payment_on_time === true && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
            <CheckCircle className="h-3 w-3" />
            Paid on time
          </span>
        )}
        {review.would_recommend === true && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
            <ThumbsUp className="h-3 w-3" />
            Would recommend
          </span>
        )}
      </div>

      {/* Response */}
      {review.response && (
        <div className="mt-4 pl-4 border-l-2 border-neutral-200">
          <p className="text-sm font-medium text-neutral-900 mb-1">Response</p>
          <p className="text-sm text-neutral-600">{review.response}</p>
          {review.response_at && (
            <p className="text-xs text-neutral-400 mt-1">{formatDate(review.response_at)}</p>
          )}
        </div>
      )}

      {/* Respond button */}
      {canRespond && !review.response && (
        <>
          {showResponseForm ? (
            <div className="mt-4 space-y-3">
              <Textarea
                placeholder="Write your response..."
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSubmitResponse} disabled={!response.trim()}>
                  Submit Response
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowResponseForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={() => setShowResponseForm(true)}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Respond
            </Button>
          )}
        </>
      )}
    </div>
  );
}

// Reviews list with summary
interface ReviewsListProps {
  reviews: ReviewWithAuthor[];
  averageRating: number;
  totalReviews: number;
  onRespond?: (reviewId: string, response: string) => void;
  canRespond?: boolean;
  className?: string;
}

export function ReviewsList({
  reviews,
  averageRating,
  totalReviews,
  onRespond,
  canRespond,
  className,
}: ReviewsListProps) {
  // Calculate rating distribution
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.overall_rating === star).length,
    percentage: totalReviews > 0 
      ? (reviews.filter((r) => r.overall_rating === star).length / totalReviews) * 100 
      : 0,
  }));

  return (
    <div className={className}>
      {/* Summary */}
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        {/* Average rating */}
        <div className="text-center md:text-left">
          <div className="text-5xl font-bold text-neutral-900">
            {averageRating > 0 ? averageRating.toFixed(1) : '-'}
          </div>
          <div className="flex items-center justify-center md:justify-start gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  'h-5 w-5',
                  star <= Math.round(averageRating)
                    ? 'text-yellow-500 fill-current'
                    : 'text-neutral-300'
                )}
              />
            ))}
          </div>
          <p className="text-sm text-neutral-500 mt-1">{totalReviews} reviews</p>
        </div>

        {/* Distribution */}
        <div className="flex-1 space-y-2">
          {distribution.map(({ star, count, percentage }) => (
            <div key={star} className="flex items-center gap-3">
              <span className="text-sm text-neutral-600 w-12">{star} star</span>
              <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-sm text-neutral-500 w-8">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onRespond={onRespond}
              canRespond={canRespond}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-neutral-50 rounded-xl">
          <Star className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-600">No reviews yet</p>
          <p className="text-sm text-neutral-500">Be the first to leave a review</p>
        </div>
      )}
    </div>
  );
}

// Star rating input
interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export function StarRatingInput({ 
  value, 
  onChange, 
  size = 'md',
  label,
  className 
}: StarRatingInputProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const sizes = {
    sm: 'h-5 w-5',
    md: 'h-7 w-7',
    lg: 'h-9 w-9',
  };

  return (
    <div className={className}>
      {label && <p className="text-sm text-neutral-600 mb-2">{label}</p>}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoverValue(star)}
            onMouseLeave={() => setHoverValue(0)}
            className="p-0.5 hover:scale-110 transition-transform"
          >
            <Star
              className={cn(
                sizes[size],
                'transition-colors',
                (hoverValue || value) >= star
                  ? 'text-yellow-500 fill-current'
                  : 'text-neutral-300'
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
