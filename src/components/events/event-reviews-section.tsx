'use client';

import { ReviewsList } from '@/components/reviews';
import { useAuth } from '@/components/providers/auth-provider';

interface EventReviewsSectionProps {
  eventId: string;
  eventTitle: string;
  organizerId: string;
  canReview: boolean;
}

export function EventReviewsSection({
  eventId,
  eventTitle,
  organizerId,
  canReview,
}: EventReviewsSectionProps) {
  const { user } = useAuth();

  const currentUserId = user?.id;
  const isOrganizer = currentUserId === organizerId;

  return (
    <ReviewsList
      eventId={eventId}
      eventTitle={eventTitle}
      currentUserId={currentUserId}
      isOrganizer={isOrganizer}
      canReview={canReview && !isOrganizer}
    />
  );
}
