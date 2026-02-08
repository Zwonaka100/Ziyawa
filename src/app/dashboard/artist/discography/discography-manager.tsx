'use client';

import { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { 
  Plus, 
  Trash2, 
  Music2,
  Calendar,
  ExternalLink,
  Upload,
  Disc3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArtistDiscography, ReleaseType, RELEASE_TYPE_LABELS } from '@/types/database';

interface DiscographyManagerProps {
  artistId: string;
  initialReleases: ArtistDiscography[];
}

export function DiscographyManager({ artistId, initialReleases }: DiscographyManagerProps) {
  const [releases, setReleases] = useState<ArtistDiscography[]>(initialReleases);
  const [isAddingRelease, setIsAddingRelease] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newRelease, setNewRelease] = useState({
    title: '',
    release_type: 'single' as ReleaseType,
    release_date: '',
    cover_art_url: '',
    spotify_url: '',
    apple_music_url: '',
    youtube_music_url: '',
    soundcloud_url: '',
    bandcamp_url: '',
  });
  const supabase = createClient();

  // Handle cover art upload
  const handleCoverUpload = async (file: File) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `artists/${artistId}/releases/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      setNewRelease(prev => ({ ...prev, cover_art_url: publicUrl }));
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload cover art');
    } finally {
      setUploading(false);
    }
  };

  // Add release
  const handleAddRelease = async () => {
    if (!newRelease.title) return;

    const { data, error } = await supabase
      .from('artist_discography')
      .insert({
        artist_id: artistId,
        title: newRelease.title,
        release_type: newRelease.release_type,
        release_date: newRelease.release_date || null,
        cover_art_url: newRelease.cover_art_url || null,
        spotify_url: newRelease.spotify_url || null,
        apple_music_url: newRelease.apple_music_url || null,
        youtube_music_url: newRelease.youtube_music_url || null,
        soundcloud_url: newRelease.soundcloud_url || null,
        bandcamp_url: newRelease.bandcamp_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding release:', error);
      alert('Failed to add release');
      return;
    }

    setReleases(prev => [data, ...prev]);
    setNewRelease({
      title: '',
      release_type: 'single',
      release_date: '',
      cover_art_url: '',
      spotify_url: '',
      apple_music_url: '',
      youtube_music_url: '',
      soundcloud_url: '',
      bandcamp_url: '',
    });
    setIsAddingRelease(false);
  };

  // Delete release
  const handleDeleteRelease = async (id: string) => {
    if (!confirm('Are you sure you want to delete this release?')) return;

    const { error } = await supabase
      .from('artist_discography')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting release:', error);
      return;
    }

    setReleases(prev => prev.filter(r => r.id !== id));
  };

  // Format date
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'No date';
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get streaming links count
  const getStreamingLinksCount = (release: ArtistDiscography): number => {
    return [
      release.spotify_url,
      release.apple_music_url,
      release.youtube_music_url,
      release.soundcloud_url,
      release.bandcamp_url,
    ].filter(Boolean).length;
  };

  return (
    <div className="space-y-6">
      {/* Add Release Button */}
      <Dialog open={isAddingRelease} onOpenChange={setIsAddingRelease}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Release
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Music Release</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Cover Art */}
            <div className="space-y-2">
              <Label>Cover Art</Label>
              <div className="flex gap-4">
                <div className="w-24 h-24 rounded-lg bg-neutral-100 overflow-hidden flex items-center justify-center">
                  {newRelease.cover_art_url ? (
                    <Image
                      src={newRelease.cover_art_url}
                      alt="Cover"
                      width={96}
                      height={96}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <Disc3 className="h-8 w-8 text-neutral-300" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCoverUpload(file);
                    }}
                    className="hidden"
                    id="cover-upload"
                  />
                  <label htmlFor="cover-upload">
                    <Button variant="outline" size="sm" asChild>
                      <span className="cursor-pointer">
                        {uploading ? (
                          <span className="animate-pulse">Uploading...</span>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Cover
                          </>
                        )}
                      </span>
                    </Button>
                  </label>
                  <p className="text-xs text-neutral-500 mt-1">Square image recommended</p>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g., Summer Vibes"
                value={newRelease.title}
                onChange={(e) => setNewRelease(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Release Type</Label>
              <Select
                value={newRelease.release_type}
                onValueChange={(v) => setNewRelease(prev => ({ ...prev, release_type: v as ReleaseType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(RELEASE_TYPE_LABELS) as ReleaseType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {RELEASE_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Release Date */}
            <div className="space-y-2">
              <Label>Release Date</Label>
              <Input
                type="date"
                value={newRelease.release_date}
                onChange={(e) => setNewRelease(prev => ({ ...prev, release_date: e.target.value }))}
              />
            </div>

            {/* Streaming Links */}
            <div className="border-t pt-4">
              <Label className="text-base">Streaming Links</Label>
              <p className="text-xs text-neutral-500 mb-3">Add links so fans can listen to your music</p>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-sm font-normal text-neutral-600">Spotify</Label>
                  <Input
                    placeholder="https://open.spotify.com/track/..."
                    value={newRelease.spotify_url}
                    onChange={(e) => setNewRelease(prev => ({ ...prev, spotify_url: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-1">
                  <Label className="text-sm font-normal text-neutral-600">Apple Music</Label>
                  <Input
                    placeholder="https://music.apple.com/..."
                    value={newRelease.apple_music_url}
                    onChange={(e) => setNewRelease(prev => ({ ...prev, apple_music_url: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-normal text-neutral-600">YouTube Music</Label>
                  <Input
                    placeholder="https://music.youtube.com/..."
                    value={newRelease.youtube_music_url}
                    onChange={(e) => setNewRelease(prev => ({ ...prev, youtube_music_url: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-normal text-neutral-600">SoundCloud</Label>
                  <Input
                    placeholder="https://soundcloud.com/..."
                    value={newRelease.soundcloud_url}
                    onChange={(e) => setNewRelease(prev => ({ ...prev, soundcloud_url: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-normal text-neutral-600">Bandcamp</Label>
                  <Input
                    placeholder="https://yourname.bandcamp.com/..."
                    value={newRelease.bandcamp_url}
                    onChange={(e) => setNewRelease(prev => ({ ...prev, bandcamp_url: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <Button 
              onClick={handleAddRelease} 
              className="w-full"
              disabled={!newRelease.title || uploading}
            >
              Add Release
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Releases Grid */}
      {releases.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {releases.map((release) => (
            <div key={release.id} className="group bg-white rounded-xl overflow-hidden border border-neutral-200 hover:shadow-lg transition-shadow">
              {/* Cover */}
              <div className="aspect-square relative bg-neutral-100">
                {release.cover_art_url ? (
                  <Image
                    src={release.cover_art_url}
                    alt={release.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Disc3 className="h-16 w-16 text-neutral-300" />
                  </div>
                )}
                {/* Delete button */}
                <button
                  onClick={() => handleDeleteRelease(release.id)}
                  className="absolute top-2 right-2 p-2 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              {/* Info */}
              <div className="p-3">
                <h3 className="font-medium text-neutral-900 truncate">{release.title}</h3>
                <div className="flex items-center gap-2 text-sm text-neutral-500 mt-1">
                  <span className="px-2 py-0.5 bg-neutral-100 rounded text-xs">
                    {RELEASE_TYPE_LABELS[release.release_type]}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-neutral-400 mt-2">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(release.release_date)}</span>
                </div>
                {/* Streaming links indicators */}
                {getStreamingLinksCount(release) > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    {release.spotify_url && (
                      <a href={release.spotify_url} target="_blank" rel="noopener noreferrer" 
                         className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <Music2 className="h-3 w-3 text-white" />
                      </a>
                    )}
                    {release.apple_music_url && (
                      <a href={release.apple_music_url} target="_blank" rel="noopener noreferrer"
                         className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center">
                        <Music2 className="h-3 w-3 text-white" />
                      </a>
                    )}
                    {release.soundcloud_url && (
                      <a href={release.soundcloud_url} target="_blank" rel="noopener noreferrer"
                         className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                        <Music2 className="h-3 w-3 text-white" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-neutral-200">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
            <Disc3 className="h-8 w-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-1">No releases yet</h3>
          <p className="text-neutral-500 mb-4">Add your music to showcase your work</p>
          <Button onClick={() => setIsAddingRelease(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Release
          </Button>
        </div>
      )}

      {/* Tips */}
      <div className="p-4 bg-neutral-100 rounded-xl">
        <h4 className="font-medium text-neutral-900 mb-2">💡 Pro Tips</h4>
        <ul className="text-sm text-neutral-600 space-y-1">
          <li>• Add cover art to make your releases stand out</li>
          <li>• Link to streaming platforms so organisers can preview your music</li>
          <li>• Keep your discography up-to-date to show you're active</li>
        </ul>
      </div>
    </div>
  );
}
