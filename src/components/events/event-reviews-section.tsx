'use client';

import { ReviewsList } from '@/components/reviews';
import { useAuth } from '@/components/providers/auth-provider';

interface EventReviewsSectionProps {
  eventId: string;
  eventTitle: string;
  organizerId: string;
  isLoggedIn: boolean;
  hasTicket: boolean;
  eventEnded: boolean;
}

export function EventReviewsSection({
  eventId,
  eventTitle,
  organizerId,
  isLoggedIn,
  hasTicket,
  eventEnded,
}: EventReviewsSectionProps) {
  const { user } = useAuth();

  const currentUserId = user?.id;
  // useAuth reflects client-side session state, which is more current than the
  // server-rendered isLoggedIn prop if the user just signed in on this page.
  const signedIn = Boolean(currentUserId) || isLoggedIn;
  const isOrganizer = currentUserId === organizerId;
  const canReview = signedIn && hasTicket && eventEnded && !isOrganizer;

  let reviewBlockedReason: string | null = null;
  if (!isOrganizer && !canReview) {
    if (!signedIn) reviewBlockedReason = 'signin';
    else if (!eventEnded) reviewBlockedReason = 'not_ended';
    else if (!hasTicket) reviewBlockedReason = 'no_ticket';
  }

  return (
    <ReviewsList
      eventId={eventId}
      eventTitle={eventTitle}
      currentUserId={currentUserId}
      isOrganizer={isOrganizer}
      canReview={canReview}
      reviewBlockedReason={reviewBlockedReason}
    />
  );
}
