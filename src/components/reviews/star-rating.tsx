'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  showValue = false,
  className,
}: StarRatingProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {Array.from({ length: maxRating }, (_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= rating;
        const isHalf = !isFilled && starValue - 0.5 <= rating;

        return (
          <Star
            key={i}
            className={cn(
              sizeClasses[size],
              isFilled
                ? 'fill-yellow-400 text-yellow-400'
                : isHalf
                ? 'fill-yellow-400/50 text-yellow-400'
                : 'text-gray-300'
            )}
          />
        );
      })}
      {showValue && (
        <span className={cn('ml-1 font-medium text-muted-foreground', textSizes[size])}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
