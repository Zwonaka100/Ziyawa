/**
 * Constants used throughout the Ziyawa app
 * Based on Phase 0 Foundational Design
 */

// South African provinces with display names
export const PROVINCES = {
  gauteng: 'Gauteng',
  western_cape: 'Western Cape',
  kwazulu_natal: 'KwaZulu-Natal',
  eastern_cape: 'Eastern Cape',
  free_state: 'Free State',
  mpumalanga: 'Mpumalanga',
  limpopo: 'Limpopo',
  north_west: 'North West',
  northern_cape: 'Northern Cape',
} as const

// Music genres common in SA
export const GENRES = [
  'Amapiano',
  'Afro-House',
  'Afro-Soul',
  'Gqom',
  'Hip-Hop',
  'R&B',
  'Kwaito',
  'Maskandi',
  'Gospel',
  'Jazz',
  'Afrobeats',
  'House',
  'Other',
] as const

// =====================================================
// EVENT STATE MACHINE
// Events can only move forward, never backwards
// Draft → Published → Locked → Completed
//                  ↘ Cancelled
// =====================================================
export const EVENT_STATES = {
  draft: { 
    label: 'Draft', 
    color: 'bg-gray-100 text-gray-800',
    description: 'Only you can see this event. No tickets, no bookings.',
    nextStates: ['published', 'cancelled'],
  },
  published: { 
    label: 'Published', 
    color: 'bg-green-100 text-green-800',
    description: 'Live on Ziwaphi. Tickets selling, bookings accepted.',
    nextStates: ['locked', 'cancelled'],
  },
  locked: { 
    label: 'Locked', 
    color: 'bg-blue-100 text-blue-800',
    description: 'Event date approaching. No new bookings.',
    nextStates: ['completed', 'cancelled'],
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-purple-100 text-purple-800',
    description: 'Event happened! Payouts will be released.',
    nextStates: [],
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'bg-red-100 text-red-800',
    description: 'Event cancelled. Refunds apply.',
    nextStates: [],
  },
} as const

// =====================================================
// BOOKING STATE MACHINE
// Pending → Accepted → Confirmed → Completed
//        ↘ Declined   ↘ Cancelled ↘ Disputed
// =====================================================
export const BOOKING_STATES = {
  pending: { 
    label: 'Pending', 
    color: 'bg-yellow-100 text-yellow-800',
    description: 'Waiting for artist to respond.',
    nextStates: ['accepted', 'declined'],
  },
  accepted: { 
    label: 'Accepted', 
    color: 'bg-blue-100 text-blue-800',
    description: 'Artist accepted. Awaiting payment.',
    nextStates: ['confirmed', 'cancelled'],
  },
  declined: { 
    label: 'Declined', 
    color: 'bg-red-100 text-red-800',
    description: 'Artist declined the booking.',
    nextStates: [],
  },
  confirmed: { 
    label: 'Confirmed', 
    color: 'bg-green-100 text-green-800',
    description: 'Payment received. Booking locked in!',
    nextStates: ['completed', 'cancelled', 'disputed'],
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-purple-100 text-purple-800',
    description: 'Performance complete. Payout released.',
    nextStates: [],
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'bg-gray-100 text-gray-600',
    description: 'Booking cancelled. Refund rules apply.',
    nextStates: [],
  },
  disputed: { 
    label: 'Under Dispute', 
    color: 'bg-orange-100 text-orange-800',
    description: 'Under review by Ziyawa.',
    nextStates: ['completed', 'cancelled'],
  },
} as const

// Legacy alias
export const BOOKING_STATUS = BOOKING_STATES

// =====================================================
// TRANSACTION STATE MACHINE (Trust Engine)
// Initiated → Authorized → Held → Released → Settled
//                       ↘ Refunded
// =====================================================
export const TRANSACTION_STATES = {
  initiated: { 
    label: 'Initiated', 
    color: 'bg-gray-100 text-gray-800',
    description: 'Payment started. No money moved yet.',
  },
  authorized: { 
    label: 'Authorized', 
    color: 'bg-blue-100 text-blue-800',
    description: 'Payment confirmed. Money received.',
  },
  held: { 
    label: 'Held', 
    color: 'bg-yellow-100 text-yellow-800',
    description: 'Money held safely. Awaiting conditions.',
  },
  released: { 
    label: 'Released', 
    color: 'bg-green-100 text-green-800',
    description: 'Conditions met. Payout triggered.',
  },
  settled: { 
    label: 'Settled', 
    color: 'bg-purple-100 text-purple-800',
    description: 'Money in recipient bank.',
  },
  refunded: { 
    label: 'Refunded', 
    color: 'bg-orange-100 text-orange-800',
    description: 'Money returned to payer.',
  },
  failed: { 
    label: 'Failed', 
    color: 'bg-red-100 text-red-800',
    description: 'Transaction failed.',
  },
} as const

// Platform configuration
export const PLATFORM_CONFIG = {
  name: 'Ziyawa',
  tagline: 'Your Event Operating System',
  platformFeePercent: 10,
  currency: 'ZAR',
  currencySymbol: 'R',
  // Principle: Ziyawa is a neutral platform
  rules: {
    moneyNeverMovesWithoutStateChange: true,
    eventsAreSacred: true,
    oneHumanManyRoles: true,
  },
} as const

// User roles with display names (legacy)
export const USER_ROLES = {
  admin: 'Administrator',
  organizer: 'Event Organizer',
  artist: 'Artist',
  user: 'Groovist',
} as const
