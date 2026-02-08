/**
 * ZIWAPHI QUERY PARSER
 * 100% Free - No AI API costs
 * Pattern matching for natural language event discovery
 */

import { SA_CITIES, PROVINCE_MAP, EVENT_CATEGORIES } from './knowledge-base';

export interface ParsedQuery {
  intent: 'search_events' | 'faq' | 'greeting' | 'unknown';
  searchParams: {
    dateRange?: {
      start: Date;
      end: Date;
      label: string;
    };
    location?: {
      city?: string;
      province?: string;
    };
    category?: string;
    priceRange?: {
      min?: number;
      max?: number;
      isFree?: boolean;
    };
    searchText?: string;
  };
  faqId?: string;
  confidence: number;
}

// =====================================================
// DATE PARSING
// =====================================================

const DATE_PATTERNS = [
  // Today/Tonight
  { pattern: /\b(today|tonight)\b/i, getRange: () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return { start: today, end, label: 'today' };
  }},
  
  // Tomorrow
  { pattern: /\b(tomorrow)\b/i, getRange: () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const end = new Date(tomorrow);
    end.setHours(23, 59, 59, 999);
    return { start: tomorrow, end, label: 'tomorrow' };
  }},
  
  // This weekend
  { pattern: /\b(this weekend|weekend)\b/i, getRange: () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const saturday = new Date(now);
    saturday.setDate(now.getDate() + (6 - dayOfWeek));
    saturday.setHours(0, 0, 0, 0);
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    sunday.setHours(23, 59, 59, 999);
    return { start: saturday, end: sunday, label: 'this weekend' };
  }},
  
  // Next weekend
  { pattern: /\b(next weekend)\b/i, getRange: () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const nextSaturday = new Date(now);
    nextSaturday.setDate(now.getDate() + (6 - dayOfWeek) + 7);
    nextSaturday.setHours(0, 0, 0, 0);
    const nextSunday = new Date(nextSaturday);
    nextSunday.setDate(nextSaturday.getDate() + 1);
    nextSunday.setHours(23, 59, 59, 999);
    return { start: nextSaturday, end: nextSunday, label: 'next weekend' };
  }},
  
  // This week
  { pattern: /\b(this week)\b/i, getRange: () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(now);
    const dayOfWeek = now.getDay();
    endOfWeek.setDate(now.getDate() + (7 - dayOfWeek));
    endOfWeek.setHours(23, 59, 59, 999);
    return { start: now, end: endOfWeek, label: 'this week' };
  }},
  
  // Next week
  { pattern: /\b(next week)\b/i, getRange: () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + (8 - dayOfWeek));
    nextMonday.setHours(0, 0, 0, 0);
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    nextSunday.setHours(23, 59, 59, 999);
    return { start: nextMonday, end: nextSunday, label: 'next week' };
  }},
  
  // This month
  { pattern: /\b(this month)\b/i, getRange: () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start: now, end: endOfMonth, label: 'this month' };
  }},
  
  // Next month
  { pattern: /\b(next month)\b/i, getRange: () => {
    const now = new Date();
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    startOfNextMonth.setHours(0, 0, 0, 0);
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
    return { start: startOfNextMonth, end: endOfNextMonth, label: 'next month' };
  }},
  
  // Specific months
  { pattern: /\b(january|jan)\b/i, getRange: () => getMonthRange(0) },
  { pattern: /\b(february|feb)\b/i, getRange: () => getMonthRange(1) },
  { pattern: /\b(march|mar)\b/i, getRange: () => getMonthRange(2) },
  { pattern: /\b(april|apr)\b/i, getRange: () => getMonthRange(3) },
  { pattern: /\b(may)\b/i, getRange: () => getMonthRange(4) },
  { pattern: /\b(june|jun)\b/i, getRange: () => getMonthRange(5) },
  { pattern: /\b(july|jul)\b/i, getRange: () => getMonthRange(6) },
  { pattern: /\b(august|aug)\b/i, getRange: () => getMonthRange(7) },
  { pattern: /\b(september|sep|sept)\b/i, getRange: () => getMonthRange(8) },
  { pattern: /\b(october|oct)\b/i, getRange: () => getMonthRange(9) },
  { pattern: /\b(november|nov)\b/i, getRange: () => getMonthRange(10) },
  { pattern: /\b(december|dec)\b/i, getRange: () => getMonthRange(11) },
];

function getMonthRange(month: number): { start: Date; end: Date; label: string } {
  const now = new Date();
  let year = now.getFullYear();
  
  // If the month has passed this year, use next year
  if (month < now.getMonth()) {
    year++;
  }
  
  const start = new Date(year, month, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(year, month + 1, 0);
  end.setHours(23, 59, 59, 999);
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  return { start, end, label: monthNames[month] };
}

function parseDate(query: string): { start: Date; end: Date; label: string } | undefined {
  const lowerQuery = query.toLowerCase();
  
  for (const datePattern of DATE_PATTERNS) {
    if (datePattern.pattern.test(lowerQuery)) {
      return datePattern.getRange();
    }
  }
  
  return undefined;
}

// =====================================================
// LOCATION PARSING
// =====================================================

function parseLocation(query: string): { city?: string; province?: string } | undefined {
  const lowerQuery = query.toLowerCase();
  
  // Check for city names and aliases
  for (const city of SA_CITIES) {
    if (lowerQuery.includes(city.name.toLowerCase())) {
      return { city: city.name, province: city.province };
    }
    
    for (const alias of city.aliases) {
      if (lowerQuery.includes(alias.toLowerCase())) {
        return { city: city.name, province: city.province };
      }
    }
  }
  
  // Check for province names
  for (const [key, value] of Object.entries(PROVINCE_MAP)) {
    if (lowerQuery.includes(key)) {
      return { province: value };
    }
  }
  
  return undefined;
}

// =====================================================
// CATEGORY PARSING
// =====================================================

function parseCategory(query: string): string | undefined {
  const lowerQuery = query.toLowerCase();
  
  for (const category of EVENT_CATEGORIES) {
    // Check category name
    if (lowerQuery.includes(category.name.toLowerCase())) {
      return category.name;
    }
    
    // Check keywords
    for (const keyword of category.keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        return category.name;
      }
    }
  }
  
  return undefined;
}

// =====================================================
// PRICE PARSING
// =====================================================

function parsePrice(query: string): { min?: number; max?: number; isFree?: boolean } | undefined {
  const lowerQuery = query.toLowerCase();
  
  // Free events
  if (/\b(free|no cover|free entry|no charge)\b/i.test(lowerQuery)) {
    return { isFree: true, max: 0 };
  }
  
  // Under X amount
  const underMatch = lowerQuery.match(/under\s*r?\s*(\d+)/i);
  if (underMatch) {
    return { max: parseInt(underMatch[1]) };
  }
  
  // Less than X
  const lessMatch = lowerQuery.match(/less than\s*r?\s*(\d+)/i);
  if (lessMatch) {
    return { max: parseInt(lessMatch[1]) };
  }
  
  // Below X
  const belowMatch = lowerQuery.match(/below\s*r?\s*(\d+)/i);
  if (belowMatch) {
    return { max: parseInt(belowMatch[1]) };
  }
  
  // Cheap/budget
  if (/\b(cheap|budget|affordable)\b/i.test(lowerQuery)) {
    return { max: 100 };
  }
  
  return undefined;
}

// =====================================================
// INTENT DETECTION
// =====================================================

const GREETING_PATTERNS = [
  /^(hi|hello|hey|howzit|heita|sawubona|molo|hola|yo|sup)/i,
  /^(good morning|good afternoon|good evening)/i,
  /^(what'?s up|whats good)/i,
];

const FAQ_PATTERNS = [
  { pattern: /how (do|can|to) i (buy|purchase|get) ticket/i, faqId: 'buy-tickets' },
  { pattern: /refund|money back|cancel.*ticket/i, faqId: 'refund-ticket' },
  { pattern: /where.*ticket|qr code|find.*ticket/i, faqId: 'ticket-qr' },
  { pattern: /become.*organizer|host.*event|create.*event/i, faqId: 'become-organizer' },
  { pattern: /organizer fee|platform fee|commission|how much.*charge/i, faqId: 'organizer-fees' },
  { pattern: /book.*artist|hire.*artist|get.*dj/i, faqId: 'book-artist' },
  { pattern: /become.*artist|register.*artist|artist.*profile/i, faqId: 'become-artist' },
  { pattern: /artist.*paid|artist.*payment|when.*paid/i, faqId: 'artist-payment' },
  { pattern: /become.*vendor|offer.*service|crew|provider/i, faqId: 'become-vendor' },
  { pattern: /withdraw|cash out|transfer.*bank|payout/i, faqId: 'wallet-withdraw' },
  { pattern: /payment method|how.*pay|accept.*card/i, faqId: 'payment-methods' },
  { pattern: /edit.*profile|change.*profile|update.*profile/i, faqId: 'edit-profile' },
  { pattern: /reset.*password|forgot.*password|change.*password/i, faqId: 'reset-password' },
  { pattern: /contact.*support|help|get.*assistance/i, faqId: 'contact-support' },
  { pattern: /report|problem|issue|scam|fraud/i, faqId: 'report-issue' },
];

const EVENT_SEARCH_PATTERNS = [
  /\b(event|events|happening|going on|show|shows|concert|concerts|party|parties|festival|festivals)\b/i,
  /\b(what'?s|whats|what is) (happening|on|popping|going)/i,
  /\b(find|search|looking for|show me|any)\b/i,
  /\b(near me|around|in|at)\b.*\b(johannesburg|cape town|durban|pretoria|joburg|jhb|cpt|dbn)/i,
  /\b(this weekend|today|tonight|tomorrow|next week)\b/i,
  /\b(amapiano|hip hop|house|jazz|afrobeats|gqom|kwaito|gospel|festival|concert)\b/i,
];

function detectIntent(query: string): 'search_events' | 'faq' | 'greeting' | 'unknown' {
  const trimmedQuery = query.trim();
  
  // Check for greetings
  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(trimmedQuery)) {
      return 'greeting';
    }
  }
  
  // Check for FAQ patterns
  for (const faqPattern of FAQ_PATTERNS) {
    if (faqPattern.pattern.test(trimmedQuery)) {
      return 'faq';
    }
  }
  
  // Check for event search patterns
  for (const pattern of EVENT_SEARCH_PATTERNS) {
    if (pattern.test(trimmedQuery)) {
      return 'search_events';
    }
  }
  
  // Default to search if we can extract any meaningful info
  const hasDate = parseDate(trimmedQuery);
  const hasLocation = parseLocation(trimmedQuery);
  const hasCategory = parseCategory(trimmedQuery);
  const hasPrice = parsePrice(trimmedQuery);
  
  if (hasDate || hasLocation || hasCategory || hasPrice) {
    return 'search_events';
  }
  
  return 'unknown';
}

function detectFaqId(query: string): string | undefined {
  const trimmedQuery = query.trim();
  
  for (const faqPattern of FAQ_PATTERNS) {
    if (faqPattern.pattern.test(trimmedQuery)) {
      return faqPattern.faqId;
    }
  }
  
  return undefined;
}

// =====================================================
// MAIN PARSER
// =====================================================

export function parseQuery(query: string): ParsedQuery {
  const intent = detectIntent(query);
  
  const result: ParsedQuery = {
    intent,
    searchParams: {},
    confidence: 0.5,
  };
  
  if (intent === 'greeting') {
    result.confidence = 0.9;
    return result;
  }
  
  if (intent === 'faq') {
    result.faqId = detectFaqId(query);
    result.confidence = result.faqId ? 0.85 : 0.5;
    return result;
  }
  
  // Parse search parameters
  const dateRange = parseDate(query);
  const location = parseLocation(query);
  const category = parseCategory(query);
  const priceRange = parsePrice(query);
  
  if (dateRange) {
    result.searchParams.dateRange = dateRange;
    result.confidence += 0.15;
  }
  
  if (location) {
    result.searchParams.location = location;
    result.confidence += 0.15;
  }
  
  if (category) {
    result.searchParams.category = category;
    result.confidence += 0.1;
  }
  
  if (priceRange) {
    result.searchParams.priceRange = priceRange;
    result.confidence += 0.1;
  }
  
  // Extract any remaining text as search text
  let searchText = query;
  
  // Remove matched patterns to get clean search text
  searchText = searchText.replace(/\b(this weekend|next weekend|today|tonight|tomorrow|this week|next week|this month|next month)\b/gi, '');
  searchText = searchText.replace(/\b(free|under|less than|below|cheap|budget|affordable)\s*r?\s*\d*/gi, '');
  searchText = searchText.replace(/\b(event|events|happening|show|shows|find|search|looking for|show me|any|what's|whats|in|at|near|around)\b/gi, '');
  
  // Remove location and category names
  for (const city of SA_CITIES) {
    searchText = searchText.replace(new RegExp(`\\b${city.name}\\b`, 'gi'), '');
    for (const alias of city.aliases) {
      searchText = searchText.replace(new RegExp(`\\b${alias}\\b`, 'gi'), '');
    }
  }
  
  for (const cat of EVENT_CATEGORIES) {
    searchText = searchText.replace(new RegExp(`\\b${cat.name}\\b`, 'gi'), '');
    for (const keyword of cat.keywords) {
      searchText = searchText.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), '');
    }
  }
  
  searchText = searchText.replace(/\s+/g, ' ').trim();
  
  if (searchText.length > 2) {
    result.searchParams.searchText = searchText;
  }
  
  // Cap confidence at 0.95
  result.confidence = Math.min(result.confidence, 0.95);
  
  return result;
}
