import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/events/search - Search and filter events
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Extract search parameters
    const query = searchParams.get('q') || '';
    const location = searchParams.get('location') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const priceMin = searchParams.get('priceMin') || '';
    const priceMax = searchParams.get('priceMax') || '';
    const category = searchParams.get('category') || '';
    const isFree = searchParams.get('isFree') === 'true';
    const sortBy = searchParams.get('sortBy') || 'date'; // date, price-low, price-high, popular
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');

    const offset = (page - 1) * limit;

    // Build the query
    let dbQuery = supabase
      .from('events')
      .select(`
        *,
        profiles:organizer_id (
          id,
          full_name,
          avatar_url
        ),
        event_rating_summaries (
          average_rating,
          total_reviews
        )
      `, { count: 'exact' });

    // Text search - search in title, description, venue
    if (query) {
      dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%,venue.ilike.%${query}%`);
    }

    // Location filter
    if (location) {
      dbQuery = dbQuery.eq('location', location);
    }

    // Date filters
    if (dateFrom) {
      dbQuery = dbQuery.gte('event_date', dateFrom);
    }
    // Note: No default date filter - show all events (past and future)

    if (dateTo) {
      dbQuery = dbQuery.lte('event_date', dateTo);
    }

    // Price filters
    if (isFree) {
      dbQuery = dbQuery.eq('ticket_price', 0);
    } else {
      if (priceMin) {
        dbQuery = dbQuery.gte('ticket_price', parseFloat(priceMin));
      }
      if (priceMax) {
        dbQuery = dbQuery.lte('ticket_price', parseFloat(priceMax));
      }
    }

    // Category filter (stored in description or we could add a category column)
    if (category) {
      dbQuery = dbQuery.ilike('description', `%${category}%`);
    }

    // Sorting
    switch (sortBy) {
      case 'price-low':
        dbQuery = dbQuery.order('ticket_price', { ascending: true });
        break;
      case 'price-high':
        dbQuery = dbQuery.order('ticket_price', { ascending: false });
        break;
      case 'popular':
        dbQuery = dbQuery.order('tickets_sold', { ascending: false });
        break;
      case 'date':
      default:
        dbQuery = dbQuery.order('event_date', { ascending: true });
    }

    // Pagination
    dbQuery = dbQuery.range(offset, offset + limit - 1);

    const { data: events, error, count } = await dbQuery;

    // If RLS causes recursion error, retry without joins
    if (error && error.message?.includes('infinite recursion')) {
      console.warn('RLS recursion detected, retrying without joins');
      let fallbackQuery = supabase
        .from('events')
        .select('*', { count: 'exact' })
        .eq('is_published', true);

      if (query) {
        fallbackQuery = fallbackQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%,venue.ilike.%${query}%`);
      }
      if (location) {
        fallbackQuery = fallbackQuery.eq('location', location);
      }
      if (dateFrom) {
        fallbackQuery = fallbackQuery.gte('event_date', dateFrom);
      }
      if (dateTo) {
        fallbackQuery = fallbackQuery.lte('event_date', dateTo);
      }

      fallbackQuery = fallbackQuery.order('event_date', { ascending: true }).range(offset, offset + limit - 1);
      const { data: fallbackEvents, count: fallbackCount } = await fallbackQuery;

      return NextResponse.json({
        events: fallbackEvents || [],
        pagination: { page, limit, total: fallbackCount || 0, totalPages: Math.ceil((fallbackCount || 0) / limit) },
        filters: { locations: [], priceRange: { min: 0, max: 1000 } }
      });
    }

    if (error) throw error;

    // Get unique locations for filter options (all events)
    const { data: locations } = await supabase
      .from('events')
      .select('location');

    const uniqueLocations = [...new Set(locations?.map(e => e.location) || [])];

    // Get price range for filter (all events)
    const { data: priceRange } = await supabase
      .from('events')
      .select('ticket_price')
      .order('ticket_price', { ascending: true });

    const prices = priceRange?.map(e => e.ticket_price) || [];
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 1000;

    return NextResponse.json({
      events: events || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      filters: {
        locations: uniqueLocations,
        priceRange: { min: minPrice, max: maxPrice }
      }
    });
  } catch (error) {
    console.error('Error searching events:', error);
    return NextResponse.json(
      { error: 'Failed to search events' },
      { status: 500 }
    );
  }
}
