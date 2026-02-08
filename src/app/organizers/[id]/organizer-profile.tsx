'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Calendar, 
  MapPin, 
  Star, 
  CheckCircle, 
  Users,
  Ticket,
  Clock,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SocialLinksRow } from '@/components/shared';
import { TrustBadge, TrackRecordCard } from '@/components/shared/trust-badges';
import { ReviewsList } from '@/components/shared/reviews';
import { OrganizerSocialLink, OrganizerMedia, Review } from '@/types/database';
import { formatDate } from '@/lib/helpers';

interface OrganizerProfileProps {
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    location: string | null;
    company_name: string | null;
    bio: string | null;
    total_events_hosted: number;
    total_artists_paid: number;
    payment_completion_rate: number;
    organizer_rating: number;
    total_organizer_reviews: number;
    years_organizing: number;
    verified_at: string | null;
    created_at: string;
  };
  socialLinks: OrganizerSocialLink[];
  media: OrganizerMedia[];
  pastEvents: Array<{
    id: string;
    title: string;
    event_date: string;
    venue: string | null;
    location: string;
    cover_image: string | null;
    tickets_sold: number;
    ticket_price: number;
  }>;
  upcomingEvents: Array<{
    id: string;
    title: string;
    event_date: string;
    venue: string | null;
    location: string;
    cover_image: string | null;
    ticket_price: number;
  }>;
  reviews: Array<Review & { reviewer: { id: string; full_name: string | null; avatar_url: string | null } }>;
}

export function OrganizerProfile({
  profile,
  socialLinks,
  media,
  pastEvents,
  upcomingEvents,
  reviews
}: OrganizerProfileProps) {
  const [activeTab, setActiveTab] = useState('events');

  const displayName = profile.company_name || profile.full_name || 'Organizer';
  const coverImage = pastEvents[0]?.cover_image || media.find(m => m.is_featured)?.url;
  const logoImage = media.find(m => m.is_logo)?.url || profile.avatar_url;

  // Calculate total attendees
  const totalAttendees = pastEvents.reduce((sum, e) => sum + e.tickets_sold, 0);

  // Transform social links for the shared component
  const transformedSocialLinks = socialLinks.map(link => ({
    platform: link.platform,
    url: link.url,
    username: link.username
  }));

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero Section */}
      <div className="relative h-64 md:h-80 bg-neutral-200">
        {coverImage && (
          <Image
            src={coverImage}
            alt={displayName}
            fill
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Profile Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-6xl mx-auto flex items-end gap-4">
            {/* Logo/Avatar */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden bg-white shadow-lg border-4 border-white">
              {logoImage ? (
                <Image
                  src={logoImage}
                  alt={displayName}
                  width={128}
                  height={128}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-neutral-200 flex items-center justify-center">
                  <Users className="h-12 w-12 text-neutral-400" />
                </div>
              )}
            </div>
            
            {/* Name and badges */}
            <div className="flex-1 text-white pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold">{displayName}</h1>
                {profile.verified_at && (
                  <TrustBadge 
                    type="organizer" 
                    isVerified={true}
                    totalBookings={profile.total_events_hosted}
                    rating={profile.organizer_rating}
                  />
                )}
              </div>
              {profile.location && (
                <p className="text-white/80 flex items-center gap-1 mt-1">
                  <MapPin className="h-4 w-4" />
                  {profile.location}
                </p>
              )}
              {socialLinks.length > 0 && (
                <div className="mt-2">
                  <SocialLinksRow links={transformedSocialLinks} size="sm" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trust Stats Bar */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-neutral-900">{profile.total_events_hosted}</p>
              <p className="text-sm text-neutral-500">Events Hosted</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{totalAttendees.toLocaleString()}</p>
              <p className="text-sm text-neutral-500">Total Attendees</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{profile.total_artists_paid}</p>
              <p className="text-sm text-neutral-500">Artists Paid</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{profile.payment_completion_rate}%</p>
              <p className="text-sm text-neutral-500">Payment Rate</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="text-2xl font-bold text-neutral-900">
                  {profile.organizer_rating > 0 ? profile.organizer_rating.toFixed(1) : 'New'}
                </span>
              </div>
              <p className="text-sm text-neutral-500">{profile.total_organizer_reviews} Reviews</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio */}
            {profile.bio && (
              <div className="bg-white rounded-xl p-6 border border-neutral-200">
                <h2 className="font-semibold text-neutral-900 mb-3">About</h2>
                <p className="text-neutral-600 whitespace-pre-wrap">{profile.bio}</p>
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-white border border-neutral-200 p-1">
                <TabsTrigger value="events">
                  Upcoming Events ({upcomingEvents.length})
                </TabsTrigger>
                <TabsTrigger value="past">
                  Past Events ({pastEvents.length})
                </TabsTrigger>
                <TabsTrigger value="reviews">
                  Reviews ({reviews.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="events" className="mt-4">
                {upcomingEvents.length > 0 ? (
                  <div className="grid gap-4">
                    {upcomingEvents.map((event) => (
                      <Link key={event.id} href={`/events/${event.id}`}>
                        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-shadow flex">
                          <div className="w-32 h-32 relative bg-neutral-100 flex-shrink-0">
                            {event.cover_image ? (
                              <Image
                                src={event.cover_image}
                                alt={event.title}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Calendar className="h-8 w-8 text-neutral-300" />
                              </div>
                            )}
                          </div>
                          <div className="p-4 flex-1">
                            <h3 className="font-semibold text-neutral-900">{event.title}</h3>
                            <div className="flex items-center gap-1 text-sm text-neutral-500 mt-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(event.event_date)}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-neutral-500">
                              <MapPin className="h-4 w-4" />
                              {event.venue || event.location}
                            </div>
                            <p className="text-sm font-medium text-neutral-900 mt-2">
                              From R{event.ticket_price}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-xl border border-neutral-200">
                    <Calendar className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                    <p className="text-neutral-500">No upcoming events</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="past" className="mt-4">
                {pastEvents.length > 0 ? (
                  <div className="grid gap-4">
                    {pastEvents.map((event) => (
                      <div key={event.id} className="bg-white rounded-xl border border-neutral-200 overflow-hidden flex">
                        <div className="w-32 h-32 relative bg-neutral-100 flex-shrink-0">
                          {event.cover_image ? (
                            <Image
                              src={event.cover_image}
                              alt={event.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Calendar className="h-8 w-8 text-neutral-300" />
                            </div>
                          )}
                        </div>
                        <div className="p-4 flex-1">
                          <h3 className="font-semibold text-neutral-900">{event.title}</h3>
                          <div className="flex items-center gap-1 text-sm text-neutral-500 mt-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(event.event_date)}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-neutral-500">
                            <MapPin className="h-4 w-4" />
                            {event.venue || event.location}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-green-600 mt-2">
                            <Ticket className="h-4 w-4" />
                            {event.tickets_sold.toLocaleString()} tickets sold
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-xl border border-neutral-200">
                    <Clock className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                    <p className="text-neutral-500">No past events yet</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="reviews" className="mt-4">
                {reviews.length > 0 ? (
                  <ReviewsList 
                    reviews={reviews} 
                    averageRating={profile.organizer_rating}
                    totalReviews={profile.total_organizer_reviews}
                  />
                ) : (
                  <div className="text-center py-12 bg-white rounded-xl border border-neutral-200">
                    <Star className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                    <p className="text-neutral-500">No reviews yet</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Trust Card */}
            <TrackRecordCard
              type="organizer"
              totalBookings={profile.total_events_hosted}
              completedBookings={profile.total_events_hosted}
              cancelledBookings={0}
              totalPaid={0}
              rating={profile.organizer_rating}
              totalReviews={profile.total_organizer_reviews}
              memberSince={profile.created_at}
              isVerified={!!profile.verified_at}
            />

            {/* Quick Stats */}
            <div className="bg-white rounded-xl p-6 border border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-4">Quick Facts</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2 text-neutral-600">
                  <Clock className="h-4 w-4 text-neutral-400" />
                  Organizing for {profile.years_organizing || 1}+ year{(profile.years_organizing || 1) > 1 ? 's' : ''}
                </li>
                <li className="flex items-center gap-2 text-neutral-600">
                  <Shield className="h-4 w-4 text-neutral-400" />
                  {profile.payment_completion_rate}% payment completion
                </li>
                <li className="flex items-center gap-2 text-neutral-600">
                  <Users className="h-4 w-4 text-neutral-400" />
                  {totalAttendees.toLocaleString()} total attendees
                </li>
                {profile.verified_at && (
                  <li className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Verified organizer
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
