/**
 * ZIYAWA DATABASE TYPES v2.0
 * Production-Ready Type Definitions
 * Based on Phase 0 Foundational Design
 */

// =====================================================
// ENUMS (State Machines)
// =====================================================

export type SaProvince = 
  | 'gauteng'
  | 'western_cape'
  | 'kwazulu_natal'
  | 'eastern_cape'
  | 'free_state'
  | 'mpumalanga'
  | 'limpopo'
  | 'north_west'
  | 'northern_cape';

// EVENT LIFECYCLE: Events can only move forward
export type EventState = 
  | 'draft'      // Only organizer sees it
  | 'published'  // Visible on Ziwaphi, tickets sell
  | 'locked'     // Event date near, no new bookings
  | 'completed'  // Event happened, payouts release
  | 'cancelled'; // Event didn't happen, refunds apply

// BOOKING LIFECYCLE
export type BookingState = 
  | 'pending'    // Request sent, waiting for artist
  | 'accepted'   // Artist accepted, waiting for payment
  | 'declined'   // Artist declined
  | 'confirmed'  // Payment received, booking locked in
  | 'completed'  // Event done, payout released
  | 'cancelled'  // Cancelled, refund rules apply
  | 'disputed';  // Under dispute resolution

// TRANSACTION LIFECYCLE (Trust Engine)
export type TransactionState = 
  | 'initiated'  // User clicked pay, no money yet
  | 'authorized' // Gateway confirmed, money received
  | 'held'       // Money locked, waiting for conditions
  | 'released'   // Conditions met, payout triggered
  | 'settled'    // Money in recipient bank
  | 'refunded'   // Refund processed
  | 'failed';    // Transaction failed

export type TransactionType = 
  | 'ticket_purchase'  // Groovist buying ticket
  | 'artist_booking'   // Organizer paying artist
  | 'vendor_service'   // Provider/crew payments
  | 'payout'           // Platform releasing held funds
  | 'refund'           // Money returning to payer
  | 'platform_fee';    // Ziyawa cut (internal)

export type RecipientType = 'organizer' | 'artist' | 'vendor';

// SERVICE CATEGORIES for Providers (Crew)
export type ServiceCategory =
  | 'sound_lighting'     // Sound & Lighting equipment
  | 'staging_av'         // Staging & Audio Visual
  | 'event_staff'        // Security, ushers, bartenders
  | 'venue_hire'         // Venue rental
  | 'catering'           // Food & beverages
  | 'music_licensing'    // SAMRO, CAPASSO
  | 'photography_video'  // Photo & Video production
  | 'decor_design'       // Event decor & design
  | 'transport'          // Artist/equipment transport
  | 'mc_hosts'           // MCs & event hosts
  | 'equipment_rental'   // General equipment rental
  | 'marketing'          // Event marketing & PR
  | 'other';             // Other services

// Price type for services
export type PriceType = 'fixed' | 'hourly' | 'daily' | 'negotiable';

// PROVIDER BOOKING LIFECYCLE
export type ProviderBookingState = 
  | 'pending'    // Request sent, waiting for provider
  | 'accepted'   // Provider accepted, waiting for payment
  | 'declined'   // Provider declined
  | 'confirmed'  // Payment received, booking locked in
  | 'completed'  // Service delivered, payout released
  | 'cancelled'  // Cancelled, refund rules apply
  | 'disputed';  // Under dispute resolution

// SOCIAL PLATFORMS
export type SocialPlatform =
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'facebook'
  | 'twitter'
  | 'linkedin'
  | 'spotify'
  | 'apple_music'
  | 'soundcloud'
  | 'bandcamp'
  | 'deezer'
  | 'website'
  | 'other';

// MEDIA TYPES
export type MediaType =
  | 'image'
  | 'youtube_video'
  | 'tiktok_video'
  | 'instagram_post'
  | 'instagram_reel'
  | 'facebook_video'
  | 'video_url'
  | 'audio';

// RELEASE TYPES (for discography)
export type ReleaseType =
  | 'single'
  | 'ep'
  | 'album'
  | 'mixtape'
  | 'compilation'
  | 'live';

// Legacy aliases
export type UserRole = 'admin' | 'organizer' | 'artist' | 'user';
export type BookingStatus = BookingState;
export type TransactionStatus = TransactionState;
export type SAProvince = SaProvince;

// =====================================================
// TABLE TYPES
// =====================================================

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  location?: SaProvince | null;
  is_artist: boolean;
  is_organizer: boolean;
  is_provider: boolean;
  is_admin: boolean;
  admin_role?: 'super_admin' | 'admin' | 'moderator' | 'support' | null;
  is_suspended?: boolean;
  suspended_at?: string | null;
  suspended_until?: string | null;
  suspension_reason?: string | null;
  is_banned?: boolean;
  banned_at?: string | null;
  ban_reason?: string | null;
  warnings_count?: number;
  role?: UserRole;
  wallet_balance: number;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  is_verified: boolean;
  verified_at: string | null;
  // Organizer-specific fields
  company_name: string | null;
  company_description: string | null;
  company_logo: string | null;
  company_website: string | null;
  years_in_business: number | null;
  // Trust stats for organizers
  total_events_hosted: number;
  total_artists_paid: number;
  total_amount_paid: number;
  payment_completion_rate: number;
  organizer_rating: number;
  organizer_reviews: number;
  organizer_verified_at: string | null;
  total_organizer_reviews: number;
  created_at: string;
  updated_at: string;
}

export interface Artist {
  id: string;
  profile_id: string;
  stage_name: string;
  bio: string | null;
  bio_long: string | null;
  genre: string;
  location: SaProvince;
  profile_image: string | null;
  base_price: number;
  is_available: boolean;
  advance_notice_days: number;
  years_active: number | null;
  record_label: string | null;
  management_contact: string | null;
  rider_document_url: string | null;
  press_kit_url: string | null;
  // Trust stats
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  no_show_count: number;
  average_rating: number;
  total_reviews: number;
  total_earned: number;
  response_rate: number;
  avg_response_hours: number;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  organizer_id: string;
  title: string;
  description: string | null;
  venue: string;
  venue_address: string | null;
  location: SaProvince;
  event_date: string;
  start_time: string;
  end_time: string | null;
  doors_open: string | null;
  ticket_price: number;
  capacity: number;
  tickets_sold: number;
  cover_image: string | null;
  state: EventState;
  is_published?: boolean;
  published_at: string | null;
  locked_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  total_revenue: number;
  total_booking_costs: number;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  event_id: string;
  artist_id: string;
  organizer_id: string;
  state: BookingState;
  status?: BookingStatus;
  offered_amount: number;
  final_amount: number | null;
  platform_fee: number | null;
  artist_payout: number | null;
  set_duration_minutes: number | null;
  performance_time: string | null;
  special_requirements: string | null;
  organizer_notes: string | null;
  artist_notes: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  reference: string;
  type: TransactionType;
  state: TransactionState;
  status?: TransactionStatus;
  amount: number;
  platform_fee: number;
  net_amount: number;
  payer_id: string;
  user_id?: string;
  recipient_id: string | null;
  recipient_type: RecipientType | null;
  event_id: string | null;
  booking_id: string | null;
  ticket_id: string | null;
  gateway_provider: string;
  gateway_reference: string | null;
  gateway_response: Record<string, unknown> | null;
  paystack_reference?: string;
  authorized_at: string | null;
  held_at: string | null;
  released_at: string | null;
  settled_at: string | null;
  refunded_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  refund_amount: number | null;
  refund_reason: string | null;
  parent_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  event_id: string;
  user_id: string;
  transaction_id: string;
  ticket_code: string;
  ticket_type: string;
  price_paid: number;
  is_used: boolean;
  used_at: string | null;
  checked_in_by: string | null;
  original_owner_id: string | null;
  transferred_at: string | null;
  created_at: string;
}

// =====================================================
// PROVIDER TYPES (Crew System)
// =====================================================

export interface Provider {
  id: string;
  profile_id: string;
  business_name: string;
  tagline: string | null;
  description: string | null;
  primary_category: ServiceCategory;
  location: SaProvince;
  profile_image: string | null;
  business_phone: string | null;
  business_email: string | null;
  website: string | null;
  is_available: boolean;
  advance_notice_days: number;
  years_in_business: number | null;
  team_size: number | null;
  insurance_verified: boolean;
  // Trust stats
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  average_rating: number;
  total_reviews: number;
  total_earned: number;
  response_rate: number;
  avg_response_hours: number;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderService {
  id: string;
  provider_id: string;
  category: ServiceCategory;
  service_name: string;
  description: string | null;
  base_price: number;
  price_type: PriceType;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderBooking {
  id: string;
  event_id: string;
  provider_id: string;
  service_id: string;
  organizer_id: string;
  state: ProviderBookingState;
  offered_amount: number;
  final_amount: number | null;
  platform_fee: number | null;
  provider_payout: number | null;
  service_date: string;
  start_time: string | null;
  end_time: string | null;
  quantity: number;
  special_requirements: string | null;
  organizer_notes: string | null;
  provider_notes: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
}

// Helper type for provider with services
export interface ProviderWithServices extends Provider {
  services?: ProviderService[];
  profile?: Profile;
}

// Helper type for public provider view
export interface PublicProvider {
  id: string;
  business_name: string;
  description: string | null;
  primary_category: ServiceCategory;
  location: SaProvince;
  profile_image: string | null;
  is_available: boolean;
  total_bookings: number;
  completed_bookings: number;
  average_rating: number;
  created_at: string;
  owner_name: string | null;
  service_count: number;
}

// Service category display names
export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  sound_lighting: 'Sound & Lighting',
  staging_av: 'Staging & AV',
  event_staff: 'Event Staff',
  venue_hire: 'Venue Hire',
  catering: 'Catering',
  music_licensing: 'Music Licensing',
  photography_video: 'Photography & Video',
  decor_design: 'Decor & Design',
  transport: 'Transport',
  mc_hosts: 'MC & Hosts',
  equipment_rental: 'Equipment Rental',
  marketing: 'Marketing & PR',
  other: 'Other Services',
};

// Price type display names
export const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  fixed: 'Fixed Price',
  hourly: 'Per Hour',
  daily: 'Per Day',
  negotiable: 'Negotiable',
};

// STATE TRANSITIONS
export const EVENT_STATE_TRANSITIONS: Record<EventState, EventState[]> = {
  draft: ['published', 'cancelled'],
  published: ['locked', 'cancelled'],
  locked: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export const BOOKING_STATE_TRANSITIONS: Record<BookingState, BookingState[]> = {
  pending: ['accepted', 'declined'],
  accepted: ['confirmed', 'cancelled'],
  declined: [],
  confirmed: ['completed', 'cancelled', 'disputed'],
  completed: [],
  cancelled: [],
  disputed: ['completed', 'cancelled'],
};

export const TRANSACTION_STATE_TRANSITIONS: Record<TransactionState, TransactionState[]> = {
  initiated: ['authorized', 'failed'],
  authorized: ['held', 'refunded', 'failed'],
  held: ['released', 'refunded'],
  released: ['settled', 'failed'],
  settled: [],
  refunded: [],
  failed: [],
};

export const PROVIDER_BOOKING_STATE_TRANSITIONS: Record<ProviderBookingState, ProviderBookingState[]> = {
  pending: ['accepted', 'declined'],
  accepted: ['confirmed', 'cancelled'],
  declined: [],
  confirmed: ['completed', 'cancelled', 'disputed'],
  completed: [],
  cancelled: [],
  disputed: ['completed', 'cancelled'],
};

export function canTransitionTo<T extends string>(
  transitions: Record<T, T[]>,
  currentState: T,
  newState: T
): boolean {
  return transitions[currentState]?.includes(newState) ?? false;
}

// =====================================================
// SOCIAL LINKS
// =====================================================

export interface ArtistSocialLink {
  id: string;
  artist_id: string;
  platform: SocialPlatform;
  url: string;
  username: string | null;
  follower_count: number | null;
  is_verified: boolean;
  is_primary: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface OrganizerSocialLink {
  id: string;
  profile_id: string;
  platform: SocialPlatform;
  url: string;
  username: string | null;
  follower_count: number | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProviderSocialLink {
  id: string;
  provider_id: string;
  platform: SocialPlatform;
  url: string;
  username: string | null;
  follower_count: number | null;
  is_primary: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// =====================================================
// MEDIA
// =====================================================

export interface ArtistMedia {
  id: string;
  artist_id: string;
  media_type: MediaType;
  url: string;
  thumbnail_url: string | null;
  title: string | null;
  description: string | null;
  embed_id: string | null;
  is_featured: boolean;
  is_profile_image: boolean;
  is_cover_image: boolean;
  display_order: number;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface OrganizerMedia {
  id: string;
  profile_id: string;
  event_id: string | null;
  media_type: MediaType;
  url: string;
  thumbnail_url: string | null;
  title: string | null;
  description: string | null;
  embed_id: string | null;
  is_featured: boolean;
  is_logo: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProviderMedia {
  id: string;
  provider_id: string;
  service_id: string | null;
  media_type: MediaType;
  url: string;
  thumbnail_url: string | null;
  title: string | null;
  description: string | null;
  embed_id: string | null;
  is_featured: boolean;
  is_logo: boolean;
  is_cover_image: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface EventMedia {
  id: string;
  event_id: string;
  media_type: MediaType;
  url: string;
  thumbnail_url: string | null;
  title: string | null;
  description: string | null;
  embed_id: string | null;
  is_primary_poster: boolean;
  is_gallery: boolean;
  display_order: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// PORTFOLIO (Verified Proof of Work)
// =====================================================

export interface ArtistPortfolio {
  id: string;
  artist_id: string;
  booking_id: string | null;
  event_name: string;
  event_date: string;
  venue_name: string | null;
  venue_location: string | null;
  organizer_name: string | null;
  organizer_id: string | null;
  performance_type: string | null;
  set_duration_minutes: number | null;
  is_verified: boolean;
  verified_at: string | null;
  organizer_confirmed: boolean;
  amount_earned: number | null;
  paid_via_ziyawa: boolean;
  description: string | null;
  highlights: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortfolioMedia {
  id: string;
  portfolio_id: string;
  media_type: MediaType;
  url: string;
  thumbnail_url: string | null;
  title: string | null;
  is_highlight: boolean;
  display_order: number;
  created_at: string;
}

export interface ProviderPortfolio {
  id: string;
  provider_id: string;
  booking_id: string | null;
  event_name: string;
  event_date: string;
  date: string | null;
  venue: string | null;
  location: string | null;
  services_provided: string[] | null;
  cover_image_url: string | null;
  is_featured: boolean;
  client_name: string | null;
  client_id: string | null;
  service_description: string;
  is_verified: boolean;
  verified_at: string | null;
  client_confirmed: boolean;
  amount_earned: number | null;
  paid_via_ziyawa: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderPortfolioMedia {
  id: string;
  portfolio_id: string;
  media_type: MediaType;
  url: string;
  thumbnail_url: string | null;
  title: string | null;
  display_order: number;
  created_at: string;
}

// =====================================================
// REVIEWS & RATINGS
// =====================================================

export type RevieweeType = 'artist' | 'organizer' | 'provider';
export type ReviewerType = 'artist' | 'organizer' | 'provider';
export type BookingType = 'artist' | 'provider';

export interface Review {
  id: string;
  reviewee_type: RevieweeType;
  reviewee_id: string;
  reviewer_id: string;
  reviewer_type: ReviewerType;
  booking_id: string | null;
  booking_type: BookingType | null;
  overall_rating: number;
  professionalism_rating: number | null;
  communication_rating: number | null;
  quality_rating: number | null;
  value_rating: number | null;
  punctuality_rating: number | null;
  title: string | null;
  content: string | null;
  payment_on_time: boolean | null;
  showed_up: boolean | null;
  would_recommend: boolean | null;
  is_verified: boolean;
  is_public: boolean;
  is_flagged: boolean;
  flagged_reason: string | null;
  response: string | null;
  response_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VideoReview {
  id: string;
  review_id: string | null;
  subject_type: RevieweeType | 'event';
  subject_id: string;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  uploaded_by: string;
  source: 'upload' | 'tiktok' | 'instagram' | 'youtube' | null;
  event_id: string | null;
  is_verified: boolean;
  view_count: number;
  like_count: number;
  is_approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
}

// =====================================================
// MESSAGING
// =====================================================

export type ConversationContextType = 'booking' | 'provider_booking' | 'event' | 'general';
export type MessageType = 'text' | 'system' | 'booking_request' | 'payment_notification' | 'contract';
export type AttachmentType = 'image' | 'document' | 'audio';

export interface Conversation {
  id: string;
  participant_one: string;
  participant_two: string;
  context_type: ConversationContextType | null;
  context_id: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  last_message_by: string | null;
  participant_one_last_read: string;
  participant_two_last_read: string;
  participant_one_unread: number;
  participant_two_unread: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  attachment_url: string | null;
  attachment_type: AttachmentType | null;
  attachment_name: string | null;
  message_type: MessageType;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  is_delivered: boolean;
  delivered_at: string | null;
  is_edited: boolean;
  edited_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
}

// =====================================================
// DISCOGRAPHY
// =====================================================

export interface ArtistDiscography {
  id: string;
  artist_id: string;
  title: string;
  release_type: ReleaseType;
  release_date: string | null;
  cover_art_url: string | null;
  spotify_url: string | null;
  apple_music_url: string | null;
  youtube_music_url: string | null;
  deezer_url: string | null;
  soundcloud_url: string | null;
  bandcamp_url: string | null;
  label: string | null;
  description: string | null;
  track_count: number | null;
  featured_artists: string[] | null;
  is_featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// =====================================================
// ENHANCED PUBLIC VIEWS
// =====================================================

export interface PublicArtistEnhanced {
  id: string;
  stage_name: string;
  genre: string;
  location: SaProvince;
  profile_image: string | null;
  bio: string | null;
  bio_long: string | null;
  base_rate: number;
  is_available: boolean;
  years_active: number | null;
  record_label: string | null;
  // Trust stats
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  no_show_count: number;
  average_rating: number;
  total_reviews: number;
  response_rate: number;
  verified_at: string | null;
  // Computed
  completion_rate: number;
  is_trusted: boolean;
  media_count: number;
  social_link_count: number;
  verified_gigs: number;
  created_at: string;
}

export interface PublicOrganizer {
  id: string;
  full_name: string | null;
  company_name: string | null;
  company_description: string | null;
  company_logo: string | null;
  location: SaProvince | null;
  company_website: string | null;
  years_in_business: number | null;
  // Trust stats
  total_events_hosted: number;
  total_artists_paid: number;
  total_amount_paid: number;
  payment_completion_rate: number;
  organizer_rating: number;
  organizer_reviews: number;
  organizer_verified_at: string | null;
  // Computed
  is_trusted_organizer: boolean;
  social_link_count: number;
  completed_events: number;
  created_at: string;
}

export interface PublicProviderEnhanced {
  id: string;
  business_name: string;
  tagline: string | null;
  description: string | null;
  primary_category: ServiceCategory;
  location: SaProvince;
  profile_image: string | null;
  is_available: boolean;
  years_in_business: number | null;
  team_size: number | null;
  insurance_verified: boolean;
  // Trust stats
  total_bookings: number;
  completed_bookings: number;
  average_rating: number;
  total_reviews: number;
  response_rate: number;
  verified_at: string | null;
  // Computed
  completion_rate: number;
  is_trusted: boolean;
  service_count: number;
  social_link_count: number;
  verified_jobs: number;
  owner_name: string | null;
  created_at: string;
}

// =====================================================
// DISPLAY LABELS
// =====================================================

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  twitter: 'X (Twitter)',
  linkedin: 'LinkedIn',
  spotify: 'Spotify',
  apple_music: 'Apple Music',
  soundcloud: 'SoundCloud',
  bandcamp: 'Bandcamp',
  deezer: 'Deezer',
  website: 'Website',
  other: 'Other',
};

export const SOCIAL_PLATFORM_ICONS: Record<SocialPlatform, string> = {
  instagram: 'instagram',
  youtube: 'youtube',
  tiktok: 'music-2', // Using music icon for TikTok
  facebook: 'facebook',
  twitter: 'twitter',
  linkedin: 'linkedin',
  spotify: 'music',
  apple_music: 'music',
  soundcloud: 'cloud',
  bandcamp: 'music',
  deezer: 'music',
  website: 'globe',
  other: 'link',
};

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  image: 'Image',
  youtube_video: 'YouTube Video',
  tiktok_video: 'TikTok Video',
  instagram_post: 'Instagram Post',
  instagram_reel: 'Instagram Reel',
  facebook_video: 'Facebook Video',
  video_url: 'Video',
  audio: 'Audio',
};

export const RELEASE_TYPE_LABELS: Record<ReleaseType, string> = {
  single: 'Single',
  ep: 'EP',
  album: 'Album',
  mixtape: 'Mixtape',
  compilation: 'Compilation',
  live: 'Live Album',
};

// Helper: Get YouTube embed URL from video ID
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

// Helper: Extract YouTube video ID from URL
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Helper: Get YouTube thumbnail from video ID
export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// Helper: Extract TikTok video ID from URL
export function extractTikTokId(url: string): string | null {
  const match = url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/);
  return match ? match[1] : null;
}
