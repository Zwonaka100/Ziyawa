'use client';

import { StarRating } from './star-rating';
import { Progress } from '@/components/ui/progress';

interface RatingSummary {
  average_rating: number;
  total_reviews: number;
  rating_1_count: number;
  rating_2_count: number;
  rating_3_count: number;
  rating_4_count: number;
  rating_5_count: number;
}

interface RatingSummaryProps {
  summary: RatingSummary | null;
}

export function RatingSummaryCard({ summary }: RatingSummaryProps) {
  if (!summary || summary.total_reviews === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No reviews yet</p>
        <p className="text-sm mt-1">Be the first to review this event!</p>
      </div>
    );
  }

  const { average_rating, total_reviews, rating_1_count, rating_2_count, rating_3_count, rating_4_count, rating_5_count } = summary;

  const ratingBars = [
    { stars: 5, count: rating_5_count },
    { stars: 4, count: rating_4_count },
    { stars: 3, count: rating_3_count },
    { stars: 2, count: rating_2_count },
    { stars: 1, count: rating_1_count },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-6">
      {/* Overall Rating */}
      <div className="flex flex-col items-center justify-center sm:min-w-[140px]">
        <div className="text-5xl font-bold">{Number(average_rating).toFixed(1)}</div>
        <StarRating rating={Number(average_rating)} size="lg" className="mt-2" />
        <p className="text-sm text-muted-foreground mt-1">
          {total_reviews} {total_reviews === 1 ? 'review' : 'reviews'}
        </p>
      </div>

      {/* Rating Breakdown */}
      <div className="flex-1 space-y-2">
        {ratingBars.map(({ stars, count }) => {
          const percentage = total_reviews > 0 ? (count / total_reviews) * 100 : 0;
          return (
            <div key={stars} className="flex items-center gap-3">
              <span className="text-sm w-8 text-muted-foreground">{stars} ★</span>
              <Progress value={percentage} className="flex-1 h-2" />
              <span className="text-sm w-8 text-muted-foreground text-right">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
