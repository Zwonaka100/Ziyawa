'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Star, MessageSquare, TrendingUp, Clock, Filter, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StarRating } from '@/components/reviews/star-rating';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface EventInfo {
  id: string;
  title: string;
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
  events: EventInfo | null;
}

interface Event {
  id: string;
  title: string;
  cover_image: string | null;
  event_date: string;
}

interface RatingSummary {
  average_rating: number;
  total_reviews: number;
}

interface OrganizerReviewsDashboardProps {
  events: Event[];
  reviews: Review[];
  ratingSummaries: Record<string, RatingSummary>;
  stats: {
    totalReviews: number;
    averageRating: number;
    pendingResponses: number;
  };
}

export function OrganizerReviewsDashboard({
  events,
  reviews: initialReviews,
  ratingSummaries,
  stats,
}: OrganizerReviewsDashboardProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [respondingTo, setRespondingTo] = useState<Review | null>(null);
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Filter reviews
  const filteredReviews = reviews.filter((review) => {
    if (filterEvent !== 'all' && review.event_id !== filterEvent) return false;
    if (filterStatus === 'pending' && review.organizer_response) return false;
    if (filterStatus === 'responded' && !review.organizer_response) return false;
    return true;
  });

  const handleSubmitResponse = async () => {
    if (!respondingTo || !response.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/${respondingTo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizerResponse: response.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setReviews((prev) =>
          prev.map((r) =>
            r.id === respondingTo.id
              ? { ...r, organizer_response: response.trim(), organizer_responded_at: new Date().toISOString() }
              : r
          )
        );
        toast({ title: 'Response posted successfully' });
        setRespondingTo(null);
        setResponse('');
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      toast({
        title: 'Error',
        description: 'Failed to post response',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Reviews</h1>
        <p className="text-muted-foreground">
          Manage and respond to reviews across all your events
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Average Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalReviews}</p>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingResponses}</p>
                <p className="text-sm text-muted-foreground">Pending Responses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="reviews">
        <TabsList>
          <TabsTrigger value="reviews">All Reviews</TabsTrigger>
          <TabsTrigger value="events">By Event</TabsTrigger>
        </TabsList>

        {/* All Reviews Tab */}
        <TabsContent value="reviews" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterEvent} onValueChange={setFilterEvent}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Response status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Needs Response</SelectItem>
                <SelectItem value="responded">Responded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reviews List */}
          {filteredReviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No reviews found
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <Avatar>
                          {!review.is_anonymous && review.profiles?.avatar_url && (
                            <AvatarImage src={review.profiles.avatar_url} />
                          )}
                          <AvatarFallback>
                            {review.is_anonymous ? 'A' : (review.profiles?.full_name?.[0] || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              {review.is_anonymous ? 'Anonymous' : review.profiles?.full_name || 'Unknown'}
                            </span>
                            {review.is_verified_attendee && (
                              <Badge variant="secondary" className="text-xs">Verified</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <Link
                            href={`/events/${review.event_id}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {review.events?.title}
                          </Link>
                          <div className="mt-1">
                            <StarRating rating={review.rating} size="sm" />
                          </div>
                          {review.title && (
                            <p className="font-medium mt-2">{review.title}</p>
                          )}
                          {review.comment && (
                            <p className="text-muted-foreground text-sm mt-1">{review.comment}</p>
                          )}

                          {/* Organizer Response */}
                          {review.organizer_response && (
                            <div className="mt-3 p-3 bg-muted/50 rounded-lg border-l-2 border-primary">
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                Your response
                              </p>
                              <p className="text-sm">{review.organizer_response}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Respond Button */}
                      {!review.organizer_response && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRespondingTo(review)}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Respond
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* By Event Tab */}
        <TabsContent value="events" className="space-y-4">
          {events.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No events yet
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {events.map((event) => {
                const summary = ratingSummaries[event.id];
                return (
                  <Card key={event.id} className="overflow-hidden">
                    <div className="flex">
                      {event.cover_image && (
                        <div className="w-24 h-24 flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={event.cover_image}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardContent className="flex-1 p-4">
                        <h3 className="font-semibold line-clamp-1">{event.title}</h3>
                        {summary ? (
                          <div className="flex items-center gap-2 mt-1">
                            <StarRating rating={summary.average_rating} size="sm" />
                            <span className="text-sm text-muted-foreground">
                              ({summary.total_reviews} reviews)
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-1">No reviews yet</p>
                        )}
                        <Link
                          href={`/events/${event.id}`}
                          className="text-sm text-primary hover:underline inline-flex items-center mt-2"
                        >
                          View Event <ChevronRight className="h-4 w-4" />
                        </Link>
                      </CardContent>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Response Dialog */}
      <Dialog open={!!respondingTo} onOpenChange={(open) => !open && setRespondingTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {respondingTo && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <StarRating rating={respondingTo.rating} size="sm" />
                  <span className="text-sm text-muted-foreground">
                    by {respondingTo.is_anonymous ? 'Anonymous' : respondingTo.profiles?.full_name}
                  </span>
                </div>
                {respondingTo.comment && (
                  <p className="text-sm">{respondingTo.comment}</p>
                )}
              </div>
            )}
            <Textarea
              placeholder="Write a professional response..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Your response will be visible to everyone viewing this review.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setRespondingTo(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitResponse}
                disabled={isSubmitting || !response.trim()}
                className="flex-1"
              >
                {isSubmitting ? 'Posting...' : 'Post Response'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
