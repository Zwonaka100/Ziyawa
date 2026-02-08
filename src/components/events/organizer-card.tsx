'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Star, 
  Calendar, 
  CheckCircle, 
  ChevronRight,
  MapPin,
  TrendingUp
} from 'lucide-react';

interface OrganizerCardProps {
  organizer: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    company_name?: string | null;
    location?: string | null;
    bio?: string | null;
    verified_at?: string | null;
  };
  stats?: {
    totalEvents: number;
    upcomingEvents: number;
    rating: number;
    totalReviews: number;
  };
  variant?: 'compact' | 'full';
  showLink?: boolean;
}

export function OrganizerCard({ 
  organizer, 
  stats,
  variant = 'compact',
  showLink = true 
}: OrganizerCardProps) {
  const isVerified = !!organizer.verified_at;
  const displayName = organizer.company_name || organizer.full_name || 'Event Organizer';

  const content = (
    <Card className={`${showLink ? 'hover:shadow-md transition-shadow cursor-pointer' : ''} ${variant === 'full' ? 'p-2' : ''}`}>
      <CardContent className={variant === 'full' ? 'p-4' : 'p-4'}>
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className={variant === 'full' ? 'h-16 w-16' : 'h-12 w-12'}>
            <AvatarImage src={organizer.avatar_url || undefined} />
            <AvatarFallback className="bg-purple-100 text-purple-600 font-semibold">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold truncate ${variant === 'full' ? 'text-lg' : ''}`}>
                {displayName}
              </h3>
              {isVerified && (
                <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
              )}
            </div>

            {/* Location */}
            {organizer.location && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" />
                {organizer.location}
              </p>
            )}

            {/* Stats */}
            {stats && (
              <div className="flex flex-wrap items-center gap-3 mt-2">
                {/* Rating */}
                {stats.totalReviews > 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{stats.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">
                      ({stats.totalReviews})
                    </span>
                  </div>
                )}

                {/* Events hosted */}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{stats.totalEvents} events</span>
                </div>

                {/* Upcoming */}
                {stats.upcomingEvents > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {stats.upcomingEvents} upcoming
                  </Badge>
                )}
              </div>
            )}

            {/* Bio excerpt for full variant */}
            {variant === 'full' && organizer.bio && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {organizer.bio}
              </p>
            )}
          </div>

          {/* Arrow for clickable */}
          {showLink && (
            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          )}
        </div>

        {/* Trust indicators for full variant */}
        {variant === 'full' && stats && stats.totalEvents > 0 && (
          <div className="flex items-center gap-4 mt-4 pt-4 border-t text-sm">
            {isVerified && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Verified Organizer</span>
              </div>
            )}
            {stats.totalEvents >= 5 && (
              <div className="flex items-center gap-1 text-purple-600">
                <TrendingUp className="h-4 w-4" />
                <span>Experienced Host</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (showLink) {
    return (
      <Link href={`/organizers/${organizer.id}`}>
        {content}
      </Link>
    );
  }

  return content;
}

export default OrganizerCard;
