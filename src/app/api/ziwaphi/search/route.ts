import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const today = new Date().toISOString().split('T')[0];
    
    // Extract query parameters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const city = searchParams.get('city');
    const province = searchParams.get('province');
    const isFree = searchParams.get('free') === 'true';
    const maxPrice = searchParams.get('maxPrice');
    const searchText = searchParams.get('q');
    const startDateOnly = startDate ? startDate.split('T')[0] : today;
    const effectiveStartDate = startDateOnly > today ? startDateOnly : today;
    
    // Build the query - using correct column names from Event interface
    let query = supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        event_date,
        start_time,
        venue,
        venue_address,
        location,
        cover_image,
        ticket_price,
        capacity,
        tickets_sold
      `)
      .eq('is_published', true)
      .in('state', ['published', 'locked'])
      .order('event_date', { ascending: true })
      .limit(10);
    
    // Always default to upcoming events, even when an older startDate is supplied
    query = query.gte('event_date', effectiveStartDate);
    
    if (endDate) {
      const endDateOnly = endDate.split('T')[0];
      query = query.lte('event_date', endDateOnly);
    }
    
    // Location filter (province)
    if (province) {
      query = query.eq('location', province);
    }
    
    // City search in venue or venue_address
    if (city) {
      query = query.or(`venue.ilike.%${city}%,venue_address.ilike.%${city}%`);
    }
    
    // Text search
    if (searchText) {
      query = query.or(`title.ilike.%${searchText}%,description.ilike.%${searchText}%,venue.ilike.%${searchText}%`);
    }
    
    // Price filters
    if (isFree) {
      query = query.eq('ticket_price', 0);
    } else if (maxPrice) {
      query = query.lte('ticket_price', parseInt(maxPrice));
    }
    
    const { data: events, error } = await query;
    
    if (error) {
      console.error('Ziwaphi search error:', error);
      return NextResponse.json({ error: 'Search failed', details: error.message }, { status: 500 });
    }
    
    // Process events to match expected format
    const processedEvents = (events || []).map(event => {
      return {
        id: event.id,
        title: event.title,
        date: event.event_date,
        time: event.start_time,
        venue: event.venue,
        city: event.venue_address || '',
        province: event.location,
        image_url: event.cover_image,
        category: null, // Events don't have category in current schema
        min_price: event.ticket_price || 0,
        max_price: event.ticket_price || 0,
        is_free: event.ticket_price === 0,
      };
    });
    
    return NextResponse.json({ 
      events: processedEvents,
      count: processedEvents.length,
    });
  } catch (error) {
    console.error('Ziwaphi search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
