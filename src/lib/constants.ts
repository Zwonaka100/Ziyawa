/**
 * Constants used throughout the Ziyawa app
 * Based on Phase 0 Foundational Design
 */

const DEFAULT_SITE_URL = 'https://www.ziyawa.com'

export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : DEFAULT_SITE_URL)

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
    color: 'bg-emerald-100 text-emerald-800',
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
    color: 'bg-emerald-100 text-emerald-800',
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
    color: 'bg-emerald-100 text-emerald-800',
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
    // The booking fee (paid by the buyer, added to the ticket price) is
    // calculated, not looked up — see calculateBookingFee below. Tiers used to
    // cap it at R10, which a percentage-based gateway cost outgrows: a R5,000
    // ticket cost R168 to process against a R10 fee.
    bookingFee: {
      // Guaranteed margin per ticket on top of the real gateway cost, in rands.
      // Zero by design: the fee covers the cost and rounds up, nothing more.
      smallWinRands: 0,
      // Floor for cheap and free tickets, in cents.
      minimumFeeCents: 500,
      // Round the fee up to a whole rand. Rounding up can only strengthen the
      // guarantee, never weaken it.
      roundToCents: 100,
    },
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
  // Paystack South Africa's real pricing, confirmed against a live charge on
  // this account: R250.00 cost R9.49, which is exactly (2.9% + R1) x 1.15 VAT.
  //
  // There is NO fee cap in South Africa — the cap people remember is Nigeria's,
  // in naira. The booking fee formula below relies on that being true, so if
  // this block ever changes, re-run the guarantee test in
  // tests/smoke/booking-fee.test.mjs.
  paystack: {
    localCardPercent: 2.9,
    // The card type is unknown when the booking fee is displayed, so the fee is
    // sized on this, the more expensive of the two.
    internationalCardPercent: 3.1,
    flatFeeCents: 100, // R1, ex VAT, per transaction
    vatPercent: 15, // added on top of both the percentage and the flat fee
    transferFeeCents: 300, // R3 ex VAT per bank transfer, charged even when it fails
  },
} as const

// =====================================================
// FEE CALCULATION HELPERS
// =====================================================

/**
 * What Paystack actually costs us to process a charge, in cents.
 *
 * `rate` defaults to the INTERNATIONAL card rate on purpose. We show the buyer
 * a booking fee before we know what card they will use, so the one number we
 * display has to cover the more expensive case. Sizing on the local rate leaves
 * every international sale underwater, and the shortfall scales with the ticket
 * price — R11.60 on a R5,000 ticket, R46.82 on a R20,000 one.
 */
export function paystackCostCents(
  chargedCents: number,
  rate: number = PLATFORM_FEES.paystack.internationalCardPercent
): number {
  const vat = 1 + PLATFORM_FEES.paystack.vatPercent / 100;
  return (rate / 100) * vat * chargedCents + PLATFORM_FEES.paystack.flatFeeCents * vat;
}

/**
 * Calculate the buyer's booking fee for a ticket price (both in cents).
 *
 * The fee must cover what Paystack charges us on the FULL amount the buyer
 * pays — which includes the fee itself. That circularity is why this is solved
 * rather than guessed:
 *
 *   fee - cost(price + fee) >= win
 *   fee - r(price + fee) - flat >= win
 *   fee >= (r*price + flat + win) / (1 - r)
 *
 * The booking fee is never refunded, so this is also what guarantees a refund
 * or a cancelled event can never cost Ziyawa money: the gateway fee is gone the
 * moment the charge succeeds, and the retained booking fee has already covered
 * it at every price.
 *
 * Signature is unchanged from the tier lookup it replaces — cents in, cents
 * out — so every caller keeps working.
 */
export function calculateBookingFee(ticketPriceCents: number): number {
  const { smallWinRands, minimumFeeCents, roundToCents } = PLATFORM_FEES.ticketing.bookingFee;
  const vat = 1 + PLATFORM_FEES.paystack.vatPercent / 100;

  const rate = (PLATFORM_FEES.paystack.internationalCardPercent / 100) * vat;
  const flatCents = PLATFORM_FEES.paystack.flatFeeCents * vat;
  const winCents = smallWinRands * 100;

  const rawCents = (rate * ticketPriceCents + flatCents + winCents) / (1 - rate);
  const roundedCents = Math.ceil(rawCents / roundToCents) * roundToCents;

  return Math.max(roundedCents, minimumFeeCents);
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
