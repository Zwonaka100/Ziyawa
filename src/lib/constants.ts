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
  currency: 'ZAR',
  currencySymbol: 'R',
  // Principle: Ziyawa is a neutral platform
  rules: {
    moneyNeverMovesWithoutStateChange: true,
    eventsAreSacred: true,
    oneHumanManyRoles: true,
  },
} as const

// =====================================================
// PLATFORM FEES - Complete Fee Structure
// All amounts in CENTS (ZAR * 100)
// =====================================================

export const PLATFORM_FEES = {
  // -------------------------------------------------
  // A. TICKET SALES
  // -------------------------------------------------
  ticketing: {
    // 5% of ticket price goes to Ziyawa
    commissionPercent: 5,
    // 5% platform service fee
    platformFeePercent: 5,
    // Booking fee tiers (paid by buyer, added to ticket price)
    // Amounts in cents
    bookingFeeTiers: [
      { maxPrice: 10000, fee: 500 },    // R0-R100 ticket = R5 fee
      { maxPrice: 30000, fee: 700 },    // R101-R300 ticket = R7 fee
      { maxPrice: Infinity, fee: 1000 }, // R301+ ticket = R10 fee
    ],
  },

  // -------------------------------------------------
  // B. ARTIST BOOKING COMMISSION
  // Tiered: smaller bookings = higher %, rewards big deals
  // -------------------------------------------------
  artistBooking: {
    tiers: [
      { maxAmount: 2000000, percent: 20 },   // Under R20K = 20%
      { maxAmount: 10000000, percent: 15 },  // R20K-R100K = 15%
      { maxAmount: Infinity, percent: 10 },  // Over R100K = 10%
    ],
  },

  // -------------------------------------------------
  // C. VENDOR/CREW BOOKING COMMISSION
  // -------------------------------------------------
  vendorBooking: {
    tiers: [
      { maxAmount: 1500000, percent: 10 },   // Under R15K = 10%
      { maxAmount: 7500000, percent: 7.5 },  // R15K-R75K = 7.5%
      { maxAmount: Infinity, percent: 5 },   // Over R75K = 5%
    ],
  },

  // -------------------------------------------------
  // D. WALLET OPERATIONS
  // -------------------------------------------------
  wallet: {
    // Deposit: 2.5% + R3 (covers Paystack + small margin)
    depositPercent: 2.5,
    depositFlatFee: 300, // R3 in cents
    // Withdrawal: R20 flat fee
    withdrawalFlatFee: 2000, // R20 in cents
    // Minimum withdrawal
    minimumWithdrawal: 10000, // R100 minimum
  },

  // -------------------------------------------------
  // E. PAYSTACK FEES (for reference)
  // -------------------------------------------------
  paystack: {
    localCardPercent: 1.5,
    localCardCap: 200000, // R2000 cap
    internationalPercent: 3.9,
    transferFee: 1000, // R10 per transfer
  },
} as const

// =====================================================
// FEE CALCULATION HELPERS
// =====================================================

/**
 * Calculate booking fee based on ticket price (in cents)
 */
export function calculateBookingFee(ticketPriceCents: number): number {
  const tier = PLATFORM_FEES.ticketing.bookingFeeTiers.find(
    t => ticketPriceCents <= t.maxPrice
  );
  return tier?.fee || PLATFORM_FEES.ticketing.bookingFeeTiers[2].fee;
}

/**
 * Calculate total ticket fees (ticketing + platform)
 * Returns amount in cents that Ziyawa keeps from organizer's revenue
 */
export function calculateTicketingFees(ticketPriceCents: number): {
  ticketingCommission: number;
  platformFee: number;
  total: number;
} {
  const { commissionPercent, platformFeePercent } = PLATFORM_FEES.ticketing;
  const ticketingCommission = Math.round(ticketPriceCents * commissionPercent / 100);
  const platformFee = Math.round(ticketPriceCents * platformFeePercent / 100);
  return {
    ticketingCommission,
    platformFee,
    total: ticketingCommission + platformFee,
  };
}

/**
 * Calculate artist booking commission (tiered)
 * Returns commission in cents
 */
export function calculateArtistCommission(bookingAmountCents: number): {
  commissionPercent: number;
  commissionAmount: number;
  artistPayout: number;
} {
  const tier = PLATFORM_FEES.artistBooking.tiers.find(
    t => bookingAmountCents <= t.maxAmount
  );
  const percent = tier?.percent || 10;
  const commissionAmount = Math.round(bookingAmountCents * percent / 100);
  return {
    commissionPercent: percent,
    commissionAmount,
    artistPayout: bookingAmountCents - commissionAmount,
  };
}

/**
 * Calculate vendor booking commission (tiered)
 * Returns commission in cents
 */
export function calculateVendorCommission(bookingAmountCents: number): {
  commissionPercent: number;
  commissionAmount: number;
  vendorPayout: number;
} {
  const tier = PLATFORM_FEES.vendorBooking.tiers.find(
    t => bookingAmountCents <= t.maxAmount
  );
  const percent = tier?.percent || 5;
  const commissionAmount = Math.round(bookingAmountCents * percent / 100);
  return {
    commissionPercent: percent,
    commissionAmount,
    vendorPayout: bookingAmountCents - commissionAmount,
  };
}

/**
 * Calculate wallet deposit fee
 * Returns fee in cents
 */
export function calculateDepositFee(amountCents: number): {
  fee: number;
  totalToPay: number;
} {
  const { depositPercent, depositFlatFee } = PLATFORM_FEES.wallet;
  const percentFee = Math.round(amountCents * depositPercent / 100);
  const fee = percentFee + depositFlatFee;
  return {
    fee,
    totalToPay: amountCents + fee,
  };
}

/**
 * Calculate withdrawal fee and net amount
 * Returns amounts in cents
 */
export function calculateWithdrawalFee(amountCents: number): {
  fee: number;
  netAmount: number;
} {
  const fee = PLATFORM_FEES.wallet.withdrawalFlatFee;
  return {
    fee,
    netAmount: amountCents - fee,
  };
}

/**
 * Calculate complete ticket sale breakdown
 * Shows exactly where every cent goes
 */
export function calculateTicketSaleBreakdown(ticketPriceCents: number): {
  ticketPrice: number;
  bookingFee: number;
  buyerTotal: number;
  ticketingCommission: number;
  platformFee: number;
  organizerNet: number;
  ziyawaTotal: number;
} {
  const bookingFee = calculateBookingFee(ticketPriceCents);
  const fees = calculateTicketingFees(ticketPriceCents);
  
  return {
    ticketPrice: ticketPriceCents,
    bookingFee,
    buyerTotal: ticketPriceCents + bookingFee,
    ticketingCommission: fees.ticketingCommission,
    platformFee: fees.platformFee,
    organizerNet: ticketPriceCents - fees.total,
    ziyawaTotal: bookingFee + fees.total,
  };
}

// User roles with display names (legacy)
export const USER_ROLES = {
  admin: 'Administrator',
  organizer: 'Event Organizer',
  artist: 'Artist',
  user: 'Groovist',
} as const
