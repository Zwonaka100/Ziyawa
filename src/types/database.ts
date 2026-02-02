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
  | 'vendor_service'   // Future: vendor payments
  | 'payout'           // Platform releasing held funds
  | 'refund'           // Money returning to payer
  | 'platform_fee';    // Ziyawa cut (internal)

export type RecipientType = 'organizer' | 'artist' | 'vendor';

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
  is_artist: boolean;
  is_organizer: boolean;
  is_admin: boolean;
  role?: UserRole;
  wallet_balance: number;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Artist {
  id: string;
  profile_id: string;
  stage_name: string;
  bio: string | null;
  genre: string;
  location: SaProvince;
  profile_image: string | null;
  base_price: number;
  is_available: boolean;
  advance_notice_days: number;
  total_bookings: number;
  completed_bookings: number;
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

export function canTransitionTo<T extends string>(
  transitions: Record<T, T[]>,
  currentState: T,
  newState: T
): boolean {
  return transitions[currentState]?.includes(newState) ?? false;
}
