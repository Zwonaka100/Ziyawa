'use client';

import { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { 
  uploadEventFile, 
  deleteFile, 
  getPathFromUrl,
  type UploadResult 
} from '@/lib/storage';
import { 
  Plus, 
  Trash2, 
  Star, 
  Image as ImageIcon, 
  Video, 
  ExternalLink,
  Upload,
  Ticket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { EventMedia, MediaType, MEDIA_TYPE_LABELS, extractYouTubeId, getYouTubeThumbnail } from '@/types/database';

interface EventMediaManagerProps {
  eventId: string;
  eventTitle: string;
  coverImage?: string | null;
  initialMedia: EventMedia[];
}

export function EventMediaManager({ 
  eventId, 
  eventTitle,
  coverImage: initialCoverImage,
  initialMedia 
}: EventMediaManagerProps) {
  const [media, setMedia] = useState<EventMedia[]>(initialMedia);
  const [coverImage, setCoverImage] = useState(initialCoverImage || '');
  const [isAddingMedia, setIsAddingMedia] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [newMedia, setNewMedia] = useState({
    media_type: 'image' as MediaType,
    url: '',
    title: '',
    description: '',
    is_primary_poster: false,
    is_gallery: true,
  });
  const supabase = createClient();

  // Handle poster/cover image upload
  const handlePosterUpload = async (file: File) => {
    setUploadingPoster(true);
    try {
      const result: UploadResult = await uploadEventFile(file, eventId, 'poster');
      
      if (!result.success || !result.url) {
        alert(result.error || 'Failed to upload poster');
        return;
      }

      // Update event's cover_image
      const { error: eventError } = await supabase
        .from('events')
        .update({ cover_image: result.url })
        .eq('id', eventId);

      if (eventError) {
        console.error('Error updating event:', eventError);
        alert('Failed to save poster');
        return;
      }

      // Also save to event_media as primary poster
      const { data, error } = await supabase
        .from('event_media')
        .insert({
          event_id: eventId,
          media_type: 'image',
          url: result.url,
          is_primary_poster: true,
          is_gallery: false,
          display_order: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving to event_media:', error);
      } else {
        setMedia(prev => [...prev, data]);
      }

      setCoverImage(result.url);
    } catch (error) {
      console.error('Poster upload error:', error);
      alert('Failed to upload poster');
    } finally {
      setUploadingPoster(false);
    }
  };

  // Handle file upload for gallery
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const result: UploadResult = await uploadEventFile(file, eventId, 'gallery');
      
      if (!result.success || !result.url) {
        alert(result.error || 'Failed to upload file');
        return;
      }

      setNewMedia(prev => ({ ...prev, url: result.url! }));
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  // Add media
  const handleAddMedia = async () => {
    if (!newMedia.url) return;

    let embedId: string | null = null;
    let thumbnailUrl: string | null = null;
    
    if (newMedia.media_type === 'youtube_video') {
      embedId = extractYouTubeId(newMedia.url);
      if (embedId) {
        thumbnailUrl = getYouTubeThumbnail(embedId);
      }
    }

    const { data, error } = await supabase
      .from('event_media')
      .insert({
        event_id: eventId,
        media_type: newMedia.media_type,
        url: newMedia.url,
        thumbnail_url: thumbnailUrl,
        embed_id: embedId,
        title: newMedia.title || null,
        description: newMedia.description || null,
        is_primary_poster: newMedia.is_primary_poster,
        is_gallery: newMedia.is_gallery,
        display_order: media.length,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding media:', error);
      alert('Failed to add media');
      return;
    }

    setMedia(prev => [...prev, data]);
    setNewMedia({
      media_type: 'image',
      url: '',
      title: '',
      description: '',
      is_primary_poster: false,
      is_gallery: true,
    });
    setIsAddingMedia(false);
  };

  // Delete media
  const handleDeleteMedia = async (id: string) => {
    if (!confirm('Are you sure you want to delete this media?')) return;

    // Find the media item to get its URL
    const mediaItem = media.find(m => m.id === id);

    const { error } = await supabase
      .from('event_media')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting media:', error);
      return;
    }

    // Also delete from storage if it's our upload
    if (mediaItem?.url) {
      const path = getPathFromUrl(mediaItem.url);
      if (path) {
        await deleteFile(path);
      }
    }

    // Update cover image state if this was the poster
    if (mediaItem?.is_primary_poster) {
      setCoverImage('');
      // Clear event's cover_image
      await supabase
        .from('events')
        .update({ cover_image: null })
        .eq('id', eventId);
    }

    setMedia(prev => prev.filter(m => m.id !== id));
  };

  // Toggle primary poster
  const handleSetPrimaryPoster = async (id: string) => {
    // Unset all other primary posters
    await supabase
      .from('event_media')
      .update({ is_primary_poster: false })
      .eq('event_id', eventId);

    // Set this as primary
    const { error } = await supabase
      .from('event_media')
      .update({ is_primary_poster: true })
      .eq('id', id);

    if (error) {
      console.error('Error updating media:', error);
      return;
    }

    const mediaItem = media.find(m => m.id === id);
    if (mediaItem) {
      // Update event's cover_image
      await supabase
        .from('events')
        .update({ cover_image: mediaItem.url })
        .eq('id', eventId);
      
      setCoverImage(mediaItem.url);
    }

    setMedia(prev => prev.map(m => ({ 
      ...m, 
      is_primary_poster: m.id === id 
    })));
  };

  // Get thumbnail for display
  const getThumbnail = (item: EventMedia): string => {
    if (item.thumbnail_url) return item.thumbnail_url;
    if (item.embed_id) return getYouTubeThumbnail(item.embed_id);
    return item.url;
  };

  const galleryImages = media.filter(m => m.media_type === 'image' && m.is_gallery);
  const promoVideos = media.filter(m => m.media_type !== 'image');
  const poster = media.find(m => m.is_primary_poster);

  return (
    <div className="space-y-8">
      {/* Event Poster Section */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h2 className="font-semibold text-neutral-900">Event Poster</h2>
          <p className="text-sm text-neutral-500">The main image for your event - appears on listings and tickets</p>
        </div>
        <div className="p-6">
          <div className="flex gap-6">
            {/* Poster Preview */}
            <div className="relative aspect-[3/4] w-48 rounded-lg overflow-hidden bg-neutral-100 border-2 border-dashed border-neutral-200">
              {coverImage ? (
                <Image
                  src={coverImage}
                  alt={eventTitle}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <Ticket className="h-12 w-12 text-neutral-300 mb-2" />
                  <span className="text-sm text-neutral-400">No poster yet</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePosterUpload(file);
                }}
                className="hidden"
                id="poster-upload"
              />
              <label
                htmlFor="poster-upload"
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploadingPoster ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                ) : (
                  <div className="text-center text-white">
                    <Upload className="h-6 w-6 mx-auto mb-1" />
                    <span className="text-sm">Upload Poster</span>
                  </div>
                )}
              </label>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-neutral-900 mb-2">Poster Tips</h3>
              <ul className="text-sm text-neutral-500 space-y-1">
                <li>• Recommended size: 800x1200px (3:4 ratio)</li>
                <li>• Include event name and date</li>
                <li>• High contrast text for readability</li>
                <li>• JPEG or PNG format, max 10MB</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Event Gallery</h2>
            <p className="text-sm text-neutral-500">Additional photos and promo videos</p>
          </div>
          <Dialog open={isAddingMedia} onOpenChange={setIsAddingMedia}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Media
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Media</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Media Type */}
                <div className="space-y-2">
                  <Label>Media Type</Label>
                  <Select
                    value={newMedia.media_type}
                    onValueChange={(v) => setNewMedia(prev => ({ ...prev, media_type: v as MediaType, url: '' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="youtube_video">YouTube Video</SelectItem>
                      <SelectItem value="tiktok_video">TikTok Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* File Upload (for images) */}
                {newMedia.media_type === 'image' && (
                  <div className="space-y-2">
                    <Label>Upload Image</Label>
                    <div className="border-2 border-dashed border-neutral-200 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                        className="hidden"
                        id="media-upload"
                      />
                      <label htmlFor="media-upload" className="cursor-pointer">
                        {uploading ? (
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto" />
                        ) : newMedia.url ? (
                          <div className="relative w-32 h-32 mx-auto">
                            <Image src={newMedia.url} alt="Preview" fill className="object-cover rounded-lg" />
                          </div>
                        ) : (
                          <>
                            <Upload className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
                            <p className="text-sm text-neutral-500">Click to upload</p>
                          </>
                        )}
                      </label>
                    </div>
                    <p className="text-xs text-neutral-500">Or paste an image URL below</p>
                  </div>
                )}

                {/* URL Input */}
                <div className="space-y-2">
                  <Label>
                    {newMedia.media_type === 'image' ? 'Image URL' : 
                     newMedia.media_type === 'youtube_video' ? 'YouTube URL' : 'TikTok URL'}
                  </Label>
                  <Input
                    placeholder={
                      newMedia.media_type === 'youtube_video' 
                        ? 'https://www.youtube.com/watch?v=...' 
                        : 'https://...'
                    }
                    value={newMedia.url}
                    onChange={(e) => setNewMedia(prev => ({ ...prev, url: e.target.value }))}
                  />
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label>Title (optional)</Label>
                  <Input
                    placeholder="e.g., Venue exterior shot"
                    value={newMedia.title}
                    onChange={(e) => setNewMedia(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    placeholder="Add a description..."
                    value={newMedia.description}
                    onChange={(e) => setNewMedia(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                  />
                </div>

                <Button 
                  onClick={handleAddMedia} 
                  className="w-full"
                  disabled={!newMedia.url || uploading}
                >
                  Add Media
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Gallery Images */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Photos ({galleryImages.length})
          </h3>
          {galleryImages.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {galleryImages.map((item) => (
                <div key={item.id} className="relative group aspect-square rounded-lg overflow-hidden bg-neutral-100">
                  <Image
                    src={item.url}
                    alt={item.title || 'Gallery'}
                    fill
                    className="object-cover"
                  />
                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleSetPrimaryPoster(item.id)}
                      className={`p-2 rounded-full ${item.is_primary_poster ? 'bg-yellow-500' : 'bg-white/20'} hover:bg-yellow-500 transition-colors`}
                      title="Set as poster"
                    >
                      <Star className="h-4 w-4 text-white" fill={item.is_primary_poster ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => handleDeleteMedia(item.id)}
                      className="p-2 rounded-full bg-white/20 hover:bg-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-neutral-50 rounded-xl">
              <ImageIcon className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500">No photos yet</p>
              <p className="text-sm text-neutral-400">Add photos of the venue or past events</p>
            </div>
          )}
        </div>

        {/* Promo Videos */}
        <div>
          <h3 className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-2">
            <Video className="h-4 w-4" />
            Promo Videos ({promoVideos.length})
          </h3>
          {promoVideos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {promoVideos.map((item) => (
                <div key={item.id} className="relative group rounded-lg overflow-hidden bg-neutral-100">
                  <div className="aspect-video relative">
                    <Image
                      src={getThumbnail(item)}
                      alt={item.title || 'Video'}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-black/70 flex items-center justify-center">
                        <Video className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-neutral-900 truncate">{item.title || 'Untitled'}</p>
                        <p className="text-sm text-neutral-500">{MEDIA_TYPE_LABELS[item.media_type]}</p>
                      </div>
                      <div className="flex gap-1">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-neutral-400 hover:text-neutral-600"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => handleDeleteMedia(item.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-neutral-50 rounded-xl">
              <Video className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500">No promo videos yet</p>
              <p className="text-sm text-neutral-400">Add YouTube or TikTok videos to promote your event</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
