import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { EventMediaManager } from './event-media-manager';
import { ArrowLeft } from 'lucide-react';

interface EventMediaPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EventMediaPage({ params }: EventMediaPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Get event
  const { data: event } = await supabase
    .from('events')
    .select('id, title, cover_image, organizer_id')
    .eq('id', id)
    .single();

  if (!event) notFound();

  // Check ownership
  if (event.organizer_id !== user.id) {
    redirect('/dashboard/organizer');
  }

  // Get existing media
  const { data: media } = await supabase
    .from('event_media')
    .select('*')
    .eq('event_id', id)
    .order('display_order', { ascending: true });

  return (
    <div className="min-h-screen bg-neutral-50">
      <DashboardHeader 
        title="Event Media" 
        subtitle={event.title}
      />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link 
          href={`/dashboard/organizer/events/${id}/edit`} 
          className="inline-flex items-center text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Edit Event
        </Link>
        
        <EventMediaManager 
          eventId={event.id}
          eventTitle={event.title}
          coverImage={event.cover_image}
          initialMedia={media || []} 
        />
      </main>
    </div>
  );
}
