/**
 * ZIWAPHI KNOWLEDGE BASE
 * 100% Free - No AI API costs
 * All FAQ and support content is hardcoded
 */

export interface FAQItem {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
  category: 'tickets' | 'organizers' | 'artists' | 'vendors' | 'payments' | 'account' | 'general';
  links?: { text: string; href: string }[];
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: 'search_events' | 'faq' | 'link';
  query?: string;
  href?: string;
}

// =====================================================
// FAQ KNOWLEDGE BASE
// =====================================================

export const FAQ_DATABASE: FAQItem[] = [
  // TICKETS
  {
    id: 'buy-tickets',
    question: 'How do I buy tickets?',
    keywords: ['buy', 'purchase', 'ticket', 'tickets', 'get tickets', 'book', 'booking'],
    answer: `To buy tickets on Ziyawa:

1. **Find an event** - Browse events on the homepage or use Ziwaphi to search
2. **Select your tickets** - Choose the ticket type and quantity
3. **Pay securely** - We use Paystack for secure payments (card, EFT, or wallet)
4. **Get your QR code** - Your ticket with QR code will be in "My Tickets"

Your ticket is valid once you show the QR code at the venue! 🎫`,
    category: 'tickets',
    links: [
      { text: 'Browse Events', href: '/' },
      { text: 'My Tickets', href: '/dashboard/tickets' }
    ]
  },
  {
    id: 'refund-ticket',
    question: 'Can I get a refund on my ticket?',
    keywords: ['refund', 'money back', 'cancel ticket', 'return', 'cancelled', 'cancellation'],
    answer: `Refund policy depends on the event:

**If the event is cancelled:**
- You get a **full refund** automatically to your Ziyawa wallet
- You can withdraw to your bank account

**If you can't attend:**
- Refunds depend on the organizer's policy
- Check the event page for refund terms
- Contact the organizer through the event page

**Need help?** Create a support ticket and we'll assist you.`,
    category: 'tickets',
    links: [
      { text: 'My Tickets', href: '/dashboard/tickets' },
      { text: 'Contact Support', href: '/support' }
    ]
  },
  {
    id: 'ticket-qr',
    question: 'Where is my ticket QR code?',
    keywords: ['qr', 'qr code', 'where ticket', 'find ticket', 'show ticket', 'scan'],
    answer: `Your ticket QR code is in **My Tickets**:

1. Click your profile icon
2. Select "My Tickets"
3. Find your event
4. Show the QR code at the venue

**Pro tip:** Take a screenshot in case you have no signal at the venue! 📱`,
    category: 'tickets',
    links: [
      { text: 'My Tickets', href: '/dashboard/tickets' }
    ]
  },

  // ORGANIZERS
  {
    id: 'become-organizer',
    question: 'How do I become an event organizer?',
    keywords: ['become organizer', 'host event', 'create event', 'start organizing', 'organizer', 'organize'],
    answer: `To become an organizer on Ziyawa:

1. Go to your **Profile** settings
2. Enable "I organize events"
3. Complete your organizer profile (company name, logo, etc.)
4. Start creating events!

**What you get:**
- Create and manage events
- Sell tickets with real-time tracking
- Book artists and vendors (crew)
- Get payouts after successful events

There's a small platform fee on ticket sales (7-10%), but creating events is **FREE**! 🎉`,
    category: 'organizers',
    links: [
      { text: 'Profile Settings', href: '/profile' },
      { text: 'Organizer Dashboard', href: '/dashboard/organizer' }
    ]
  },
  {
    id: 'organizer-fees',
    question: 'What are the fees for organizers?',
    keywords: ['organizer fee', 'platform fee', 'commission', 'how much', 'percentage', 'cost'],
    answer: `**Ziyawa's transparent fees:**

| Fee Type | Amount |
|----------|--------|
| Platform fee | 7% of ticket sales |
| Payment processing | ~2.9% (Paystack) |
| Payouts | FREE |

**Example:** R100 ticket
- You receive: ~R90
- Ziyawa + Paystack: ~R10

Payouts are released **48 hours after** your event completes successfully. 💰`,
    category: 'organizers',
    links: [
      { text: 'Create Event', href: '/dashboard/organizer/events/new' }
    ]
  },
  {
    id: 'book-artist',
    question: 'How do I book an artist for my event?',
    keywords: ['book artist', 'hire artist', 'get artist', 'artist booking', 'dj', 'performer'],
    answer: `To book an artist:

1. Go to the **Artists** page
2. Browse or search for artists
3. View their profile to see rates and availability
4. Click **"Book for Event"**
5. Select your event and send a booking request
6. Once they accept, confirm with payment

The payment is held safely until the event is complete. This protects both you and the artist! 🎤`,
    category: 'organizers',
    links: [
      { text: 'Browse Artists', href: '/artists' },
      { text: 'My Events', href: '/dashboard/organizer' }
    ]
  },

  // ARTISTS
  {
    id: 'become-artist',
    question: 'How do I become an artist on Ziyawa?',
    keywords: ['become artist', 'register artist', 'artist profile', 'performer', 'dj', 'musician'],
    answer: `To register as an artist:

1. Go to your **Profile** settings
2. Enable "I'm an artist/performer"
3. Complete your artist setup:
   - Add your bio and genres
   - Upload photos and videos
   - Set your booking rate
   - Add your social links

Once set up, organizers can find and book you! 🎵`,
    category: 'artists',
    links: [
      { text: 'Profile Settings', href: '/profile' },
      { text: 'Artist Setup', href: '/dashboard/artist/setup' }
    ]
  },
  {
    id: 'artist-payment',
    question: 'When do artists get paid?',
    keywords: ['artist payment', 'get paid', 'payout', 'when paid', 'artist money'],
    answer: `Artist payments work like this:

1. **Organizer books you** - Payment is held securely
2. **You perform** - Event happens successfully
3. **Payment released** - Within 48 hours of event completion
4. **Withdraw** - Transfer to your bank account

**Payment protection:** The money is held in escrow, so you're guaranteed payment once you perform! 💰`,
    category: 'artists',
    links: [
      { text: 'Artist Dashboard', href: '/dashboard/artist' },
      { text: 'Wallet', href: '/wallet' }
    ]
  },

  // VENDORS / CREW
  {
    id: 'become-vendor',
    question: 'How do I offer services on Ziyawa?',
    keywords: ['become vendor', 'offer services', 'crew', 'provider', 'sound', 'lighting', 'catering'],
    answer: `To become a service provider (Crew):

1. Go to your **Profile** settings
2. Enable "I provide event services"
3. Complete your provider setup:
   - Add your services (sound, lighting, catering, etc.)
   - Set your rates
   - Upload portfolio photos
   - Add service areas

Organizers will find you when planning events! 🔧`,
    category: 'vendors',
    links: [
      { text: 'Profile Settings', href: '/profile' },
      { text: 'Provider Setup', href: '/dashboard/provider/setup' }
    ]
  },

  // PAYMENTS & WALLET
  {
    id: 'wallet-withdraw',
    question: 'How do I withdraw money from my wallet?',
    keywords: ['withdraw', 'cash out', 'bank', 'transfer', 'get money', 'payout'],
    answer: `To withdraw from your Ziyawa wallet:

1. Go to **Wallet** in your profile menu
2. Click **"Withdraw"**
3. Enter the amount
4. Confirm your bank details
5. Submit the request

**Processing time:** 1-3 business days to reach your bank account.

**Note:** Make sure your bank details are correct in your profile! 🏦`,
    category: 'payments',
    links: [
      { text: 'Wallet', href: '/wallet' },
      { text: 'Profile Settings', href: '/profile' }
    ]
  },
  {
    id: 'payment-methods',
    question: 'What payment methods are accepted?',
    keywords: ['payment', 'pay', 'card', 'eft', 'bank', 'visa', 'mastercard', 'how to pay'],
    answer: `Ziyawa accepts these payment methods via Paystack:

✅ **Credit/Debit Cards** - Visa, Mastercard
✅ **Bank Transfer** - Instant EFT
✅ **Ziyawa Wallet** - Use your wallet balance

All payments are processed securely through Paystack, one of Africa's leading payment providers. 🔒`,
    category: 'payments',
    links: [
      { text: 'Wallet', href: '/wallet' }
    ]
  },

  // ACCOUNT
  {
    id: 'edit-profile',
    question: 'How do I edit my profile?',
    keywords: ['edit profile', 'change profile', 'update profile', 'profile settings', 'avatar', 'picture'],
    answer: `To edit your profile:

1. Click your **profile icon** in the top right
2. Select **"Profile"**
3. Update your information:
   - Name and bio
   - Profile picture
   - Phone number
   - Bank details (for payouts)
4. Click **Save**

Your profile is what others see when booking you! 👤`,
    category: 'account',
    links: [
      { text: 'Edit Profile', href: '/profile' }
    ]
  },
  {
    id: 'reset-password',
    question: 'How do I reset my password?',
    keywords: ['reset password', 'forgot password', 'change password', 'can\'t login', 'password'],
    answer: `To reset your password:

1. Go to the **Sign In** page
2. Click **"Forgot password?"**
3. Enter your email address
4. Check your inbox for the reset link
5. Create a new password

**Tip:** Use a strong password with letters, numbers, and symbols! 🔐`,
    category: 'account',
    links: [
      { text: 'Sign In', href: '/auth/signin' },
      { text: 'Reset Password', href: '/auth/reset-password' }
    ]
  },

  // GENERAL
  {
    id: 'contact-support',
    question: 'How do I contact support?',
    keywords: ['contact', 'support', 'help', 'problem', 'issue', 'complaint', 'assistance'],
    answer: `Need help? Here's how to reach us:

1. **Support Tickets** - Create a ticket for detailed issues
2. **Messages** - If it's about a booking, message the other party first

For urgent issues, create a support ticket and mark it as high priority. Our team typically responds within 24 hours.

We're here to help! 💬`,
    category: 'general',
    links: [
      { text: 'Create Support Ticket', href: '/support' }
    ]
  },
  {
    id: 'report-issue',
    question: 'How do I report a problem with an event or user?',
    keywords: ['report', 'problem', 'issue', 'scam', 'fraud', 'fake', 'dispute'],
    answer: `To report an issue:

1. Go to the **Support** page
2. Click **"Create New Ticket"**
3. Select the appropriate category
4. Describe the issue in detail
5. Submit your report

For disputes about payments or bookings, our team will review the evidence and mediate a fair resolution.

We take reports seriously! 🛡️`,
    category: 'general',
    links: [
      { text: 'Report Issue', href: '/support' }
    ]
  }
];

// =====================================================
// QUICK ACTIONS & SUGGESTIONS
// =====================================================

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'this-weekend',
    label: "What's happening this weekend?",
    icon: '🎉',
    action: 'search_events',
    query: 'events this weekend'
  },
  {
    id: 'free-events',
    label: 'Find free events',
    icon: '🆓',
    action: 'search_events',
    query: 'free events'
  },
  {
    id: 'buy-tickets',
    label: 'How do I buy tickets?',
    icon: '🎫',
    action: 'faq',
    query: 'buy-tickets'
  },
  {
    id: 'become-artist',
    label: 'Become an artist',
    icon: '🎤',
    action: 'faq',
    query: 'become-artist'
  },
  {
    id: 'support',
    label: 'Get support',
    icon: '💬',
    action: 'link',
    href: '/support'
  }
];

// =====================================================
// GREETING MESSAGES
// =====================================================

export const GREETINGS = [
  "Hey! 👋 I'm Ziwaphi, your event discovery assistant. Ask me anything about events in South Africa or how to use Ziyawa!",
  "Sawubona! 🙌 I'm Ziwaphi. Need help finding events or have questions about Ziyawa? I'm here to help!",
  "Heita! 🎉 Welcome to Ziwaphi. I can help you discover events, buy tickets, or answer questions about the platform.",
];

export function getRandomGreeting(): string {
  return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
}

// =====================================================
// FAQ SEARCH
// =====================================================

export function searchFAQ(query: string): FAQItem | null {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Direct ID match
  const directMatch = FAQ_DATABASE.find(faq => faq.id === normalizedQuery);
  if (directMatch) return directMatch;
  
  // Keyword match - find the FAQ with the most keyword matches
  let bestMatch: FAQItem | null = null;
  let bestScore = 0;
  
  for (const faq of FAQ_DATABASE) {
    let score = 0;
    
    // Check keywords
    for (const keyword of faq.keywords) {
      if (normalizedQuery.includes(keyword.toLowerCase())) {
        score += 2; // Keywords are worth more
      }
    }
    
    // Check question
    const questionWords = faq.question.toLowerCase().split(' ');
    for (const word of questionWords) {
      if (word.length > 3 && normalizedQuery.includes(word)) {
        score += 1;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = faq;
    }
  }
  
  // Only return if we have a reasonable match
  return bestScore >= 2 ? bestMatch : null;
}

// =====================================================
// SOUTH AFRICAN LOCATIONS
// =====================================================

export const SA_CITIES = [
  // Gauteng
  { name: 'Johannesburg', aliases: ['jhb', 'joburg', 'jozi', 'egoli'], province: 'gauteng' },
  { name: 'Pretoria', aliases: ['pta', 'tshwane'], province: 'gauteng' },
  { name: 'Sandton', aliases: [], province: 'gauteng' },
  { name: 'Soweto', aliases: [], province: 'gauteng' },
  { name: 'Midrand', aliases: [], province: 'gauteng' },
  
  // Western Cape
  { name: 'Cape Town', aliases: ['cpt', 'mother city', 'kaapstad'], province: 'western_cape' },
  { name: 'Stellenbosch', aliases: ['stellies'], province: 'western_cape' },
  { name: 'Paarl', aliases: [], province: 'western_cape' },
  
  // KwaZulu-Natal
  { name: 'Durban', aliases: ['dbn', 'ethekwini', 'durbs'], province: 'kwazulu_natal' },
  { name: 'Pietermaritzburg', aliases: ['pmb', 'maritzburg'], province: 'kwazulu_natal' },
  { name: 'Umhlanga', aliases: [], province: 'kwazulu_natal' },
  
  // Eastern Cape
  { name: 'Port Elizabeth', aliases: ['pe', 'gqeberha'], province: 'eastern_cape' },
  { name: 'East London', aliases: ['el'], province: 'eastern_cape' },
  
  // Free State
  { name: 'Bloemfontein', aliases: ['bloem'], province: 'free_state' },
  
  // Mpumalanga
  { name: 'Nelspruit', aliases: ['mbombela'], province: 'mpumalanga' },
  
  // Limpopo
  { name: 'Polokwane', aliases: ['pietersburg'], province: 'limpopo' },
  
  // North West
  { name: 'Rustenburg', aliases: [], province: 'north_west' },
  
  // Northern Cape
  { name: 'Kimberley', aliases: [], province: 'northern_cape' },
];

export const PROVINCE_MAP: Record<string, string> = {
  'gauteng': 'gauteng',
  'gp': 'gauteng',
  'western cape': 'western_cape',
  'wc': 'western_cape',
  'kwazulu-natal': 'kwazulu_natal',
  'kwazulu natal': 'kwazulu_natal',
  'kzn': 'kwazulu_natal',
  'eastern cape': 'eastern_cape',
  'ec': 'eastern_cape',
  'free state': 'free_state',
  'fs': 'free_state',
  'mpumalanga': 'mpumalanga',
  'mp': 'mpumalanga',
  'limpopo': 'limpopo',
  'lp': 'limpopo',
  'north west': 'north_west',
  'nw': 'north_west',
  'northern cape': 'northern_cape',
  'nc': 'northern_cape',
};

// =====================================================
// EVENT CATEGORIES
// =====================================================

export const EVENT_CATEGORIES = [
  { name: 'Amapiano', keywords: ['amapiano', 'piano', 'yanos'] },
  { name: 'Hip Hop', keywords: ['hip hop', 'hiphop', 'rap', 'hip-hop'] },
  { name: 'House', keywords: ['house', 'deep house', 'afro house'] },
  { name: 'Jazz', keywords: ['jazz', 'smooth jazz'] },
  { name: 'Afrobeats', keywords: ['afrobeats', 'afro beats', 'afrobeat'] },
  { name: 'Gqom', keywords: ['gqom', 'durban gqom'] },
  { name: 'Kwaito', keywords: ['kwaito'] },
  { name: 'R&B', keywords: ['rnb', 'r&b', 'r and b', 'rhythm and blues'] },
  { name: 'Gospel', keywords: ['gospel', 'worship', 'christian'] },
  { name: 'Maskandi', keywords: ['maskandi', 'isicathamiya'] },
  { name: 'Festival', keywords: ['festival', 'fest'] },
  { name: 'Concert', keywords: ['concert', 'show', 'live'] },
  { name: 'Day Party', keywords: ['day party', 'day session', 'sundowner', 'brunch'] },
  { name: 'Club', keywords: ['club', 'nightclub', 'nightlife'] },
  { name: 'Comedy', keywords: ['comedy', 'stand up', 'standup', 'comedian'] },
  { name: 'Other', keywords: [] },
];
