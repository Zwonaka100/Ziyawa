'use client';

/**
 * ArtistMediaManager - Enhanced with Supabase Storage
 * 
 * Features:
 * - Profile & cover image upload with real storage
 * - Photo gallery with drag & drop
 * - YouTube/TikTok video embedding
 */

import { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { 
  Plus, 
  Trash2, 
  Star, 
  Image as ImageIcon, 
  Video, 
  ExternalLink,
  Upload,
  Loader2,
  Camera,
  Play
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
import { 
  uploadUserFile, 
  deleteFile as deleteStorageFile,
  getPathFromUrl,
  extractYouTubeId,
  extractTikTokId,
  getYouTubeThumbnail
} from '@/lib/storage';
import { ArtistMedia, MediaType, MEDIA_TYPE_LABELS } from '@/types/database';
import { cn } from '@/lib/utils';

interface ArtistMediaManagerProps {
  artistId: string;
  userId: string;
  initialMedia: ArtistMedia[];
  profileImage?: string | null;
  coverImage?: string | null;
}

export function ArtistMediaManager({ 
  artistId, 
  userId,
  initialMedia,
  profileImage,
  coverImage
}: ArtistMediaManagerProps) {
  const [media, setMedia] = useState<ArtistMedia[]>(initialMedia);
  const [isAddingMedia, setIsAddingMedia] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(profileImage);
  const [currentCover, setCurrentCover] = useState(coverImage);
  const [newMedia, setNewMedia] = useState({
    media_type: 'image' as MediaType,
    url: '',
    title: '',
    description: '',
    is_featured: false,
  });
  const supabase = createClient();

  // Handle profile image upload
  const handleProfileUpload = async (file: File) => {
    setUploadingProfile(true);
    try {
      const result = await uploadUserFile(file, 'artists', userId, 'profile');
      
      if (!result.success) {
        alert(result.error || 'Failed to upload profile image');
        return;
      }

      // Update artist record
      const { error } = await supabase
        .from('artists')
        .update({ profile_image: result.url })
        .eq('id', artistId);

      if (error) {
        console.error('Error updating artist:', error);
        alert('Failed to update profile image');
        return;
      }

      setCurrentProfile(result.url || null);
    } catch (error) {
      console.error('Profile upload error:', error);
      alert('Failed to upload profile image');
    } finally {
      setUploadingProfile(false);
    }
  };

  // Handle cover image upload
  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true);
    try {
      const result = await uploadUserFile(file, 'artists', userId, 'cover');
      
      if (!result.success) {
        alert(result.error || 'Failed to upload cover image');
        return;
      }

      // Find existing cover image media or create new
      const existingCover = media.find(m => m.is_cover_image);
      
      if (existingCover) {
        // Update existing
        const { error } = await supabase
          .from('artist_media')
          .update({ url: result.url })
          .eq('id', existingCover.id);
        
        if (!error) {
          setMedia(prev => prev.map(m => 
            m.id === existingCover.id ? { ...m, url: result.url! } : m
          ));
        }
      } else {
        // Create new cover image media
        const { data, error } = await supabase
          .from('artist_media')
          .insert({
            artist_id: artistId,
            media_type: 'image',
            url: result.url,
            is_cover_image: true,
            is_featured: false,
            is_profile_image: false,
            display_order: 0,
          })
          .select()
          .single();
        
        if (!error && data) {
          setMedia(prev => [data, ...prev]);
        }
      }

      setCurrentCover(result.url || null);
    } catch (error) {
      console.error('Cover upload error:', error);
      alert('Failed to upload cover image');
    } finally {
      setUploadingCover(false);
    }
  };

  // Handle gallery image upload using new storage utility
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadUserFile(file, 'artists', userId, 'gallery');

      if (!result.success) {
        alert(result.error || 'Failed to upload');
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

  // Add media to database
  const handleAddMedia = async () => {
    if (!newMedia.url) return;

    // For YouTube videos, extract the ID and get thumbnail
    let embedId: string | null = null;
    let thumbnailUrl: string | null = null;
    
    if (newMedia.media_type === 'youtube_video') {
      embedId = extractYouTubeId(newMedia.url);
      if (embedId) {
        thumbnailUrl = getYouTubeThumbnail(embedId);
      }
    }

    const { data, error } = await supabase
      .from('artist_media')
      .insert({
        artist_id: artistId,
        media_type: newMedia.media_type,
        url: newMedia.url,
        thumbnail_url: thumbnailUrl,
        embed_id: embedId,
        title: newMedia.title || null,
        description: newMedia.description || null,
        is_featured: newMedia.is_featured,
        is_profile_image: false,
        is_cover_image: false,
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
      is_featured: false,
    });
    setIsAddingMedia(false);
  };

  // Delete media - also delete from storage
  const handleDeleteMedia = async (id: string, url?: string) => {
    if (!confirm('Are you sure you want to delete this?')) return;

    // Delete from storage if it's our file
    if (url) {
      const storagePath = getPathFromUrl(url);
      if (storagePath) {
        await deleteStorageFile(storagePath);
      }
    }

    const { error } = await supabase
      .from('artist_media')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting media:', error);
      return;
    }

    setMedia(prev => prev.filter(m => m.id !== id));
  };

  // Toggle featured
  const handleToggleFeatured = async (id: string, isFeatured: boolean) => {
    const { error } = await supabase
      .from('artist_media')
      .update({ is_featured: isFeatured })
      .eq('id', id);

    if (error) {
      console.error('Error updating media:', error);
      return;
    }

    setMedia(prev => prev.map(m => m.id === id ? { ...m, is_featured: isFeatured } : m));
  };

  // Get thumbnail for display
  const getThumbnail = (item: ArtistMedia): string => {
    if (item.thumbnail_url) return item.thumbnail_url;
    if (item.embed_id) return getYouTubeThumbnail(item.embed_id, 'hq');
    return item.url;
  };

  const images = media.filter(m => m.media_type === 'image' && !m.is_cover_image);
  const videos = media.filter(m => m.media_type !== 'image');

  return (
    <div className="space-y-10">
      {/* Profile & Cover Images Section */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-neutral-900">Profile Images</h2>
        
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Profile Picture */}
          <div className="flex flex-col items-center gap-3">
            <div 
              className="relative w-32 h-32 rounded-full overflow-hidden bg-neutral-100 border-2 border-neutral-200 cursor-pointer group"
              onClick={() => document.getElementById('profile-upload')?.click()}
            >
              {currentProfile ? (
                <Image
                  src={currentProfile}
                  alt="Profile"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="h-8 w-8 text-neutral-400" />
                </div>
              )}
              <div className={cn(
                'absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity',
                uploadingProfile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}>
                {uploadingProfile ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
              <input
                id="profile-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProfileUpload(file);
                }}
              />
            </div>
            <span className="text-sm text-neutral-600">Profile Picture</span>
          </div>

          {/* Cover Image */}
          <div className="flex-1 w-full">
            <div 
              className="relative aspect-[3/1] rounded-xl overflow-hidden bg-neutral-100 border-2 border-dashed border-neutral-300 cursor-pointer group hover:border-neutral-400 transition-colors"
              onClick={() => document.getElementById('cover-upload')?.click()}
            >
              {currentCover ? (
                <Image
                  src={currentCover}
                  alt="Cover"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Upload className="h-8 w-8 text-neutral-400 mb-2" />
                  <p className="text-sm text-neutral-500">Click to upload cover image</p>
                  <p className="text-xs text-neutral-400">Recommended: 1500 x 500px</p>
                </div>
              )}
              <div className={cn(
                'absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity',
                uploadingCover ? 'opacity-100' : currentCover ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'
              )}>
                {uploadingCover ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : (
                  <Camera className="h-8 w-8 text-white" />
                )}
              </div>
              <input
                id="cover-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCoverUpload(file);
                }}
              />
            </div>
            <p className="text-sm text-neutral-500 mt-2">Cover/Banner Image</p>
          </div>
        </div>
      </div>

      {/* Gallery Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Photo Gallery ({images.length})
          </h2>
        </div>
        
      {/* Add Media Button */}
      <Dialog open={isAddingMedia} onOpenChange={setIsAddingMedia}>
        <DialogTrigger asChild>
          <Button className="mb-4">
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
                  <SelectItem value="instagram_post">Instagram Post</SelectItem>
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
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-neutral-400" />
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
                 newMedia.media_type === 'youtube_video' ? 'YouTube URL' :
                 newMedia.media_type === 'tiktok_video' ? 'TikTok URL' :
                 'Instagram URL'}
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
                placeholder="e.g., Live at Rocking the Daisies"
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

            {/* Featured Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="featured">Feature this media</Label>
              <Switch
                id="featured"
                checked={newMedia.is_featured}
                onCheckedChange={(v) => setNewMedia(prev => ({ ...prev, is_featured: v }))}
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

      {/* Images Section */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Photos ({images.length})
        </h2>
        {images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((item) => (
              <div key={item.id} className="relative group aspect-square rounded-lg overflow-hidden bg-neutral-100">
                <Image
                  src={item.url}
                  alt={item.title || 'Media'}
                  fill
                  className="object-cover"
                />
                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                  {item.is_featured && (
                    <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs rounded">Featured</span>
                  )}
                  {item.is_profile_image && (
                    <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded">Profile</span>
                  )}
                  {item.is_cover_image && (
                    <span className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded">Cover</span>
                  )}
                </div>
                {/* Actions overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleToggleFeatured(item.id, !item.is_featured)}
                    className={`p-2 rounded-full ${item.is_featured ? 'bg-yellow-500' : 'bg-white/20'} hover:bg-yellow-500 transition-colors`}
                    title={item.is_featured ? 'Remove from featured' : 'Add to featured'}
                  >
                    <Star className="h-4 w-4 text-white" fill={item.is_featured ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={() => handleDeleteMedia(item.id, item.url)}
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
            <p className="text-sm text-neutral-400">Add photos to showcase your performances</p>
          </div>
        )}
      </div>
      </div>

      {/* Videos Section */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <Video className="h-5 w-5" />
          Videos ({videos.length})
        </h2>
        {videos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.map((item) => (
              <div key={item.id} className="relative group rounded-lg overflow-hidden bg-neutral-100">
                <div className="aspect-video relative">
                  <Image
                    src={getThumbnail(item)}
                    alt={item.title || 'Video'}
                    fill
                    className="object-cover"
                  />
                  {/* Play icon */}
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
                        title="Open in new tab"
                        aria-label="Open video in new tab"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => handleDeleteMedia(item.id, item.url)}
                        className="p-1.5 text-neutral-400 hover:text-red-500"
                        title="Delete video"
                        aria-label="Delete video"
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
            <p className="text-neutral-500">No videos yet</p>
            <p className="text-sm text-neutral-400">Add YouTube or TikTok videos</p>
          </div>
        )}
      </div>
    </div>
  );
}
