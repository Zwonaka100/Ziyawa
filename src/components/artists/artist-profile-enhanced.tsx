'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  MapPin, 
  Music, 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Star,
  Clock,
  CheckCircle,
  MessageSquare,
  ExternalLink,
  ChevronDown,
  Play,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/helpers';
import { PROVINCES } from '@/lib/constants';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';
import { 
  SocialLinksRow, 
  MediaGallery, 
  VideoCarousel,
  TrustBadge, 
  TrustStats, 
  TrackRecordCard,
  ReviewsList,
  PortfolioGrid
} from '@/components/shared';
import type { 
  Artist, 
  Profile, 
  ArtistSocialLink, 
  ArtistMedia, 
  ArtistPortfolio,
  ArtistDiscography,
  Review,
  Booking,
  Event
} from '@/types/database';

interface ArtistWithProfile extends Artist {
  profiles: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>;
}

interface BookingWithEvent extends Booking {
  events: Pick<Event, 'id' | 'title' | 'venue' | 'event_date' | 'cover_image'>;
}

interface ReviewWithReviewer extends Review {
  reviewer: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface ArtistProfileEnhancedProps {
  artist: ArtistWithProfile;
  socialLinks: ArtistSocialLink[];
  media: ArtistMedia[];
  portfolio: ArtistPortfolio[];
  discography: ArtistDiscography[];
  reviews: ReviewWithReviewer[];
  upcomingBookings: BookingWithEvent[];
}

export function ArtistProfileEnhanced({ 
  artist, 
  socialLinks, 
  media, 
  portfolio,
  discography,
  reviews,
  upcomingBookings
}: ArtistProfileEnhancedProps) {
  const { profile } = useAuth();
  const router = useRouter();
  const isOrganizer = profile?.is_organizer || profile?.is_admin;
  const [showFullBio, setShowFullBio] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  // Start conversation handler
  const handleStartConversation = async () => {
    if (!profile) {
      toast.error('Please sign in to send messages');
      router.push('/auth/signin');
      return;
    }

    if (!isOrganizer) {
      toast.error('Only organizers can message artists');
      return;
    }

    setStartingChat(true);
    try {
      const response = await fetch('/api/conversations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: artist.profiles.id,
          contextType: 'general',
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start conversation');
      }

      router.push(`/messages?chat=${data.conversationId}`);
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setStartingChat(false);
    }
  };

  // Separate media by type
  const images = media.filter(m => m.media_type === 'image');
  const videos = media.filter(m => 
    ['youtube_video', 'tiktok_video', 'instagram_reel', 'facebook_video', 'video_url'].includes(m.media_type)
  );
  const featuredMedia = media.filter(m => m.is_featured);
  const coverImage = media.find(m => m.is_cover_image);
  const profileImage = media.find(m => m.is_profile_image);

  // Calculate trust metrics
  const completionRate = artist.total_bookings > 0 
    ? Math.round((artist.completed_bookings / artist.total_bookings) * 100) 
    : 0;
  const showUpRate = artist.total_bookings > 0 && artist.no_show_count !== undefined
    ? Math.round(((artist.total_bookings - artist.no_show_count) / artist.total_bookings) * 100)
    : 100;
  const isTrusted = artist.total_bookings >= 10 && completionRate >= 95 && artist.average_rating >= 4.5;

  // Bio display
  const bioText = artist.bio_long || artist.bio;
  const shouldTruncateBio = bioText && bioText.length > 400;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-64 md:h-80 bg-neutral-900 relative overflow-hidden">
          {coverImage ? (
            <Image
              src={coverImage.url}
              alt={artist.stage_name}
              fill
              className="object-cover opacity-60"
            />
          ) : artist.profile_image ? (
            <Image
              src={artist.profile_image}
              alt={artist.stage_name}
              fill
              className="object-cover opacity-40 blur-sm"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900" />
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>

        {/* Profile Card Overlay */}
        <div className="max-w-6xl mx-auto px-4 relative">
          <div className="absolute -bottom-32 left-4 right-4 md:left-0 md:right-auto">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6">
              {/* Profile Image */}
              <div className="w-40 h-40 md:w-48 md:h-48 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-neutral-200">
                {(profileImage?.url || artist.profile_image) ? (
                  <Image
                    src={profileImage?.url || artist.profile_image!}
                    alt={artist.stage_name}
                    width={192}
                    height={192}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-neutral-400">
                    {artist.stage_name.charAt(0)}
                  </div>
                )}
              </div>

              {/* Name and badges */}
              <div className="text-center md:text-left pb-4">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                    {artist.stage_name}
                  </h1>
                  {artist.verified_at && (
                    <TrustBadge 
                      type="artist" 
                      isVerified={true} 
                      isTrusted={isTrusted}
                      size="md"
                    />
                  )}
                </div>
                <p className="text-white/80">{artist.profiles.full_name}</p>
              </div>
            </div>
          </div>

          {/* Back button */}
          <Link 
            href="/artists" 
            className="absolute top-4 left-4 md:top-[-220px] inline-flex items-center text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Artists
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 pt-36 pb-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Info Row */}
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className="gap-1 px-3 py-1">
                <Music className="h-3 w-3" />
                {artist.genre}
              </Badge>
              <Badge variant="outline" className="gap-1 px-3 py-1 border-neutral-300">
                <MapPin className="h-3 w-3" />
                {PROVINCES[artist.location as keyof typeof PROVINCES]}
              </Badge>
              {artist.years_active && (
                <Badge variant="outline" className="gap-1 px-3 py-1 border-neutral-300">
                  <Clock className="h-3 w-3" />
                  {artist.years_active}+ years
                </Badge>
              )}
              <Badge 
                className={artist.is_available ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}
              >
                {artist.is_available ? '● Available' : '○ Unavailable'}
              </Badge>
            </div>

            {/* Social Links */}
            {socialLinks.length > 0 && (
              <SocialLinksRow links={socialLinks} size="md" />
            )}

            {/* Trust Stats */}
            <TrustStats
              completedBookings={artist.completed_bookings}
              totalBookings={artist.total_bookings}
              rating={artist.average_rating}
              totalReviews={artist.total_reviews}
              responseRate={artist.response_rate}
              showUpRate={showUpRate}
              type="artist"
              className="p-6 bg-neutral-50 rounded-xl"
            />

            {/* Bio */}
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">About</h2>
              {bioText ? (
                <div>
                  <p className="text-neutral-600 whitespace-pre-wrap leading-relaxed">
                    {shouldTruncateBio && !showFullBio 
                      ? `${bioText.substring(0, 400)}...` 
                      : bioText}
                  </p>
                  {shouldTruncateBio && (
                    <button
                      onClick={() => setShowFullBio(!showFullBio)}
                      className="mt-2 text-neutral-900 font-medium hover:underline inline-flex items-center gap-1"
                    >
                      {showFullBio ? 'Show less' : 'Read more'}
                      <ChevronDown className={`h-4 w-4 transition-transform ${showFullBio ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-neutral-500 italic">No bio available.</p>
              )}
            </div>

            {/* Tabs for Media, Videos, Discography, Portfolio, Reviews */}
            <Tabs defaultValue="media" className="w-full">
              <TabsList className="w-full justify-start border-b border-neutral-200 bg-transparent p-0 h-auto">
                {images.length > 0 && (
                  <TabsTrigger 
                    value="media" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-black rounded-none px-4 py-3"
                  >
                    Photos ({images.length})
                  </TabsTrigger>
                )}
                {videos.length > 0 && (
                  <TabsTrigger 
                    value="videos"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-black rounded-none px-4 py-3"
                  >
                    Videos ({videos.length})
                  </TabsTrigger>
                )}
                {discography.length > 0 && (
                  <TabsTrigger 
                    value="music"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-black rounded-none px-4 py-3"
                  >
                    Music ({discography.length})
                  </TabsTrigger>
                )}
                {portfolio.length > 0 && (
                  <TabsTrigger 
                    value="portfolio"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-black rounded-none px-4 py-3"
                  >
                    Past Shows ({portfolio.length})
                  </TabsTrigger>
                )}
                <TabsTrigger 
                  value="reviews"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-black rounded-none px-4 py-3"
                >
                  Reviews ({reviews.length})
                </TabsTrigger>
              </TabsList>

              {/* Photos Tab */}
              {images.length > 0 && (
                <TabsContent value="media" className="pt-6">
                  <MediaGallery 
                    media={images.map(m => ({
                      id: m.id,
                      media_type: m.media_type,
                      url: m.url,
                      thumbnail_url: m.thumbnail_url,
                      title: m.title,
                      description: m.description,
                      is_featured: m.is_featured,
                    }))} 
                    columns={3}
                    showTitles
                  />
                </TabsContent>
              )}

              {/* Videos Tab */}
              {videos.length > 0 && (
                <TabsContent value="videos" className="pt-6">
                  <VideoCarousel 
                    videos={videos.map(v => ({
                      id: v.id,
                      media_type: v.media_type,
                      url: v.url,
                      thumbnail_url: v.thumbnail_url,
                      title: v.title,
                      embed_id: v.embed_id,
                    }))}
                  />
                </TabsContent>
              )}

              {/* Music/Discography Tab */}
              {discography.length > 0 && (
                <TabsContent value="music" className="pt-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    {discography.map((release) => (
                      <div key={release.id} className="flex gap-4 p-4 border border-neutral-200 rounded-xl">
                        {/* Album Art */}
                        <div className="w-24 h-24 rounded-lg bg-neutral-100 overflow-hidden flex-shrink-0">
                          {release.cover_art_url ? (
                            <Image
                              src={release.cover_art_url}
                              alt={release.title}
                              width={96}
                              height={96}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Music className="h-8 w-8 text-neutral-300" />
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-neutral-900 truncate">{release.title}</h4>
                          <p className="text-sm text-neutral-500 capitalize">
                            {release.release_type} • {release.release_date ? new Date(release.release_date).getFullYear() : 'TBA'}
                          </p>
                          {release.label && (
                            <p className="text-sm text-neutral-500">{release.label}</p>
                          )}
                          {/* Streaming links */}
                          <div className="flex gap-2 mt-2">
                            {release.spotify_url && (
                              <a href={release.spotify_url} target="_blank" rel="noopener noreferrer" 
                                 className="text-neutral-400 hover:text-green-600">
                                <Music className="h-4 w-4" />
                              </a>
                            )}
                            {release.apple_music_url && (
                              <a href={release.apple_music_url} target="_blank" rel="noopener noreferrer"
                                 className="text-neutral-400 hover:text-pink-600">
                                <Music className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}

              {/* Portfolio Tab */}
              {portfolio.length > 0 && (
                <TabsContent value="portfolio" className="pt-6">
                  <PortfolioGrid 
                    type="artist"
                    items={portfolio}
                  />
                </TabsContent>
              )}

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="pt-6">
                <ReviewsList
                  reviews={reviews.map(r => ({
                    ...r,
                    reviewer: r.reviewer,
                  }))}
                  averageRating={artist.average_rating}
                  totalReviews={artist.total_reviews}
                />
              </TabsContent>
            </Tabs>

            {/* Upcoming Events */}
            {upcomingBookings.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 mb-4">Upcoming Events</h2>
                <div className="space-y-3">
                  {upcomingBookings.slice(0, 3).map((booking) => (
                    <Link 
                      key={booking.id}
                      href={`/events/${booking.events.id}`}
                      className="flex gap-4 p-4 border border-neutral-200 rounded-xl hover:border-neutral-300 transition-colors"
                    >
                      <div className="w-20 h-20 rounded-lg bg-neutral-100 overflow-hidden flex-shrink-0">
                        {booking.events.cover_image ? (
                          <Image
                            src={booking.events.cover_image}
                            alt={booking.events.title}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-neutral-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-neutral-900 truncate">{booking.events.title}</h4>
                        <p className="text-sm text-neutral-500">
                          {new Date(booking.events.event_date).toLocaleDateString('en-ZA', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-sm text-neutral-500">{booking.events.venue}</p>
                      </div>
                      <ExternalLink className="h-5 w-5 text-neutral-400 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sticky Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Booking Card */}
              <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-lg text-neutral-900 mb-4">Book This Artist</h3>
                
                <div className="text-center mb-6">
                  <p className="text-sm text-neutral-500 mb-1">Starting from</p>
                  <p className="text-4xl font-bold text-neutral-900">
                    {formatCurrency(artist.base_price)}
                  </p>
                </div>

                <div className="space-y-3 mb-6 text-sm">
                  <div className="flex justify-between py-2 border-b border-neutral-100">
                    <span className="text-neutral-500">Genre</span>
                    <span className="font-medium text-neutral-900">{artist.genre}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-neutral-100">
                    <span className="text-neutral-500">Location</span>
                    <span className="font-medium text-neutral-900">
                      {PROVINCES[artist.location as keyof typeof PROVINCES]}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-neutral-100">
                    <span className="text-neutral-500">Notice Required</span>
                    <span className="font-medium text-neutral-900">{artist.advance_notice_days} days</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-neutral-500">Status</span>
                    <span className={artist.is_available ? 'text-green-600 font-medium' : 'text-red-500'}>
                      {artist.is_available ? 'Available for booking' : 'Not available'}
                    </span>
                  </div>
                </div>

                {isOrganizer ? (
                  <div className="space-y-3">
                    <Link href={`/dashboard/organizer/book?artist=${artist.id}`}>
                      <Button className="w-full" size="lg" disabled={!artist.is_available}>
                        {artist.is_available ? 'Request Booking' : 'Not Available'}
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      size="lg"
                      onClick={handleStartConversation}
                      disabled={startingChat}
                    >
                      {startingChat ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <MessageSquare className="h-4 w-4 mr-2" />
                      )}
                      {startingChat ? 'Opening...' : 'Send Message'}
                    </Button>
                  </div>
                ) : profile ? (
                  <div className="text-center">
                    <p className="text-sm text-neutral-500 mb-3">
                      Only event organizers can book artists
                    </p>
                    <Link href="/profile">
                      <Button variant="outline" className="w-full">
                        Become an Organizer
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-neutral-500 mb-3">
                      Sign in to contact this artist
                    </p>
                    <Link href="/auth/signin">
                      <Button className="w-full">
                        Sign In
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              {/* Track Record Card */}
              <TrackRecordCard
                type="artist"
                totalBookings={artist.total_bookings}
                completedBookings={artist.completed_bookings}
                cancelledBookings={artist.cancelled_bookings}
                totalEarned={artist.total_earned}
                rating={artist.average_rating}
                totalReviews={artist.total_reviews}
                memberSince={artist.created_at}
                isVerified={!!artist.verified_at}
              />

              {/* Contact Info */}
              {(artist.record_label || artist.management_contact) && (
                <div className="bg-neutral-50 rounded-xl p-6">
                  <h3 className="font-semibold text-neutral-900 mb-4">Contact</h3>
                  {artist.record_label && (
                    <div className="mb-3">
                      <p className="text-sm text-neutral-500">Record Label</p>
                      <p className="text-neutral-900">{artist.record_label}</p>
                    </div>
                  )}
                  {artist.management_contact && (
                    <div>
                      <p className="text-sm text-neutral-500">Management</p>
                      <p className="text-neutral-900">{artist.management_contact}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Press Kit / Rider */}
              {(artist.press_kit_url || artist.rider_document_url) && (
                <div className="space-y-2">
                  {artist.press_kit_url && (
                    <a 
                      href={artist.press_kit_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg hover:border-neutral-300 transition-colors"
                    >
                      <span className="text-neutral-700">Press Kit</span>
                      <ExternalLink className="h-4 w-4 text-neutral-400" />
                    </a>
                  )}
                  {artist.rider_document_url && (
                    <a 
                      href={artist.rider_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg hover:border-neutral-300 transition-colors"
                    >
                      <span className="text-neutral-700">Technical Rider</span>
                      <ExternalLink className="h-4 w-4 text-neutral-400" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
