/**
 * NOTIFICATION PREFERENCES API
 * GET /api/notifications/preferences - Get user preferences
 * PATCH /api/notifications/preferences - Update preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get preferences (should auto-create via trigger)
    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Preferences fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    // Return defaults if no preferences exist
    if (!preferences) {
      return NextResponse.json({
        preferences: {
          user_id: user.id,
          email_enabled: true,
          push_enabled: true,
          booking_notifications: true,
          payment_notifications: true,
          event_notifications: true,
          message_notifications: true,
          review_notifications: true,
          system_notifications: true,
          marketing_notifications: false,
        }
      });
    }

    return NextResponse.json({ preferences });

  } catch (error) {
    console.error('Preferences API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const allowedFields = [
      'email_enabled',
      'push_enabled',
      'booking_notifications',
      'payment_notifications',
      'event_notifications',
      'message_notifications',
      'review_notifications',
      'system_notifications',
      'marketing_notifications',
    ];

    // Filter to only allowed fields
    const updates: Record<string, boolean> = {};
    for (const field of allowedFields) {
      if (typeof body[field] === 'boolean') {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Upsert preferences
    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Preferences update error:', error);
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({ preferences });

  } catch (error) {
    console.error('Preferences update error:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
