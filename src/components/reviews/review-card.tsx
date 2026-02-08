'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ThumbsUp, BadgeCheck, MessageSquare, MoreVertical, Trash2, Pencil } from 'lucide-react';
import { StarRating } from './star-rating';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface ReviewCardProps {
  review: Review;
  currentUserId?: string;
  isOrganizer?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  onRespond?: () => void;
}

export function ReviewCard({
  review,
  currentUserId,
  isOrganizer,
  onDelete,
  onEdit,
  onRespond,
}: ReviewCardProps) {
  const [helpfulCount, setHelpfulCount] = useState(review.helpful_count);
  const [isHelpful, setIsHelpful] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const { toast } = useToast();

  const isOwner = currentUserId === review.user_id;
  const displayName = review.is_anonymous
    ? 'Anonymous'
    : review.profiles?.full_name || 'Unknown User';
  const initials = review.is_anonymous
    ? 'A'
    : (review.profiles?.full_name || 'U').charAt(0).toUpperCase();

  const handleHelpfulVote = async () => {
    if (!currentUserId) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to mark reviews as helpful',
        variant: 'destructive',
      });
      return;
    }

    if (isOwner) {
      toast({
        title: 'Cannot vote',
        description: 'You cannot mark your own review as helpful',
        variant: 'destructive',
      });
      return;
    }

    setIsVoting(true);
    try {
      const response = await fetch(`/api/reviews/${review.id}/helpful`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setIsHelpful(data.isHelpful);
        setHelpfulCount((prev) => (data.isHelpful ? prev + 1 : prev - 1));
      }
    } catch (error) {
      console.error('Error voting helpful:', error);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {!review.is_anonymous && review.profiles?.avatar_url && (
              <AvatarImage src={review.profiles.avatar_url} alt={displayName} />
            )}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{displayName}</span>
              {review.is_verified_attendee && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <BadgeCheck className="h-3 w-3" />
                  Attended
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <StarRating rating={review.rating} size="sm" />
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        {(isOwner || isOrganizer) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOwner && (
                <>
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Review
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Review
                  </DropdownMenuItem>
                </>
              )}
              {isOrganizer && !review.organizer_response && (
                <DropdownMenuItem onClick={onRespond}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Respond
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Review Content */}
      {review.title && <h4 className="font-semibold">{review.title}</h4>}
      {review.comment && <p className="text-muted-foreground text-sm leading-relaxed">{review.comment}</p>}

      {/* Organizer Response */}
      {review.organizer_response && (
        <div className="bg-muted/50 rounded-lg p-3 mt-3 border-l-2 border-primary">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              Organizer Response
            </Badge>
            {review.organizer_responded_at && (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(review.organizer_responded_at), { addSuffix: true })}
              </span>
            )}
          </div>
          <p className="text-sm">{review.organizer_response}</p>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center gap-4 pt-2">
        <Button
          variant="ghost"
          size="sm"
          className={`text-xs gap-1 ${isHelpful ? 'text-primary' : ''}`}
          onClick={handleHelpfulVote}
          disabled={isVoting || isOwner}
        >
          <ThumbsUp className={`h-3.5 w-3.5 ${isHelpful ? 'fill-current' : ''}`} />
          Helpful ({helpfulCount})
        </Button>
      </div>
    </div>
  );
}
