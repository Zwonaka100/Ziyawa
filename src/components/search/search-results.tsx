'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Star,
  ChevronLeft,
  ChevronRight,
  Users
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Event {
  id: string;
  title: string;
  description: string;
  venue: string;
  location: string;
  event_date: string;
  start_time: string;
  end_time: string;
  ticket_price: number;
  capacity: number;
  tickets_sold: number;
  cover_image: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  event_rating_summaries?: {
    average_rating: number;
    total_reviews: number;
  }[];
}

interface SearchResultsProps {
  className?: string;
}

const PROVINCE_LABELS: Record<string, string> = {
  gauteng: 'Gauteng',
  western_cape: 'Western Cape',
  kwazulu_natal: 'KwaZulu-Natal',
  eastern_cape: 'Eastern Cape',
  free_state: 'Free State',
  limpopo: 'Limpopo',
  mpumalanga: 'Mpumalanga',
  north_west: 'North West',
  northern_cape: 'Northern Cape',
};

export function SearchResults({ className }: SearchResultsProps) {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(searchParams.toString());
      if (!params.has('page')) params.set('page', '1');
      
      const response = await fetch(`/api/events/search?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setEvents(data.events);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    window.history.pushState(null, '', `?${params.toString()}`);
    // Trigger re-fetch
    fetchEvents();
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className={className}>
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
            <Calendar className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No events found</h3>
          <p className="text-muted-foreground mb-6">
            Try adjusting your search filters or check back later for new events.
          </p>
          <Button asChild variant="outline">
            <Link href="/ziwaphi">Clear Filters</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Results Count */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground">
          Showing {events.length} of {pagination.total} events
        </p>
      </div>

      {/* Event Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {[...Array(pagination.totalPages)].map((_, i) => {
              const page = i + 1;
              const isActive = page === pagination.page;
              const showPage = 
                page === 1 || 
                page === pagination.totalPages || 
                Math.abs(page - pagination.page) <= 1;

              if (!showPage && page === 2) {
                return <span key={page} className="px-2 text-muted-foreground">...</span>;
              }
              if (!showPage && page === pagination.totalPages - 1) {
                return <span key={page} className="px-2 text-muted-foreground">...</span>;
              }
              if (!showPage) return null;

              return (
                <Button
                  key={page}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                  className={isActive ? "bg-purple-600 hover:bg-purple-700" : ""}
                >
                  {page}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  const rating = event.event_rating_summaries?.[0];
  const ticketsLeft = event.capacity - event.tickets_sold;
  const isSoldOut = ticketsLeft <= 0;
  const isLowStock = ticketsLeft > 0 && ticketsLeft <= 10;

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full">
        {/* Image */}
        <div className="relative aspect-[16/9] overflow-hidden">
          {event.cover_image ? (
            <Image
              src={event.cover_image}
              alt={event.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Calendar className="h-12 w-12 text-white/50" />
            </div>
          )}
          
          {/* Price Badge */}
          <div className="absolute top-3 right-3">
            <span className="px-3 py-1 bg-black/70 text-white text-sm font-medium rounded-full">
              {event.ticket_price === 0 ? 'FREE' : `R${event.ticket_price}`}
            </span>
          </div>

          {/* Stock Status */}
          {(isSoldOut || isLowStock) && (
            <div className="absolute top-3 left-3">
              <span className={`px-3 py-1 text-white text-xs font-medium rounded-full ${
                isSoldOut ? 'bg-red-500' : 'bg-orange-500'
              }`}>
                {isSoldOut ? 'Sold Out' : `${ticketsLeft} left`}
              </span>
            </div>
          )}
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Title */}
          <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-purple-600 transition-colors">
            {event.title}
          </h3>

          {/* Rating */}
          {rating && rating.total_reviews > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{rating.average_rating.toFixed(1)}</span>
              <span className="text-muted-foreground">
                ({rating.total_reviews} {rating.total_reviews === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}

          {/* Date & Time */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(parseISO(event.event_date), 'EEE, MMM d, yyyy')}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {event.start_time?.slice(0, 5) || 'TBA'}
              {event.end_time && ` - ${event.end_time.slice(0, 5)}`}
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">
              {event.venue}
              {event.location && `, ${PROVINCE_LABELS[event.location] || event.location}`}
            </span>
          </div>

          {/* Organizer */}
          {event.profiles && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <div className="relative w-6 h-6 rounded-full overflow-hidden bg-muted">
                {event.profiles.avatar_url ? (
                  <Image
                    src={event.profiles.avatar_url}
                    alt={event.profiles.full_name || 'Organizer'}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <Users className="w-full h-full p-1 text-muted-foreground" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                by {event.profiles.full_name || 'Unknown Organizer'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function EventCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-[16/9]" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center gap-2 pt-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

export default SearchResults;
