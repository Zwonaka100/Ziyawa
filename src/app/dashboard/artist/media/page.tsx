import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ArtistMediaManager } from './media-manager';

export const metadata = {
  title: 'Media Gallery | Artist Dashboard | Ziyawa',
  description: 'Manage your photos and videos',
};

export default async function ArtistMediaPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/signin?redirect=/dashboard/artist/media');
  }

  // Get artist profile
  const { data: artist } = await supabase
    .from('artists')
    .select('*')
    .eq('profile_id', user.id)
    .single();

  if (!artist) {
    redirect('/profile');
  }

  // Get media
  const { data: media } = await supabase
    .from('artist_media')
    .select('*')
    .eq('artist_id', artist.id)
    .order('display_order');

  // Find cover image from media
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coverMedia = (media || []).find((m: any) => m.is_cover_image);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">Media Gallery</h1>
      <p className="text-neutral-600 mb-8">Add photos and videos to showcase your talent</p>
      
      <ArtistMediaManager 
        artistId={artist.id}
        userId={user.id}
        initialMedia={media || []}
        profileImage={artist.profile_image}
        coverImage={coverMedia?.url || null}
      />
    </div>
  );
}
