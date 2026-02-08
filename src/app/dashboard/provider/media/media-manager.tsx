'use client';

import { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { 
  uploadUserFile, 
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
  Camera,
  User
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
import { ProviderMedia, MediaType, MEDIA_TYPE_LABELS, extractYouTubeId, getYouTubeThumbnail } from '@/types/database';

interface ProviderMediaManagerProps {
  providerId: string;
  userId: string;
  profileImage?: string | null;
  coverImage?: string | null;
  initialMedia: ProviderMedia[];
}

export function ProviderMediaManager({ 
  providerId, 
  userId,
  profileImage: initialProfileImage,
  coverImage: initialCoverImage,
  initialMedia 
}: ProviderMediaManagerProps) {
  const [media, setMedia] = useState<ProviderMedia[]>(initialMedia);
  const [profileImage, setProfileImage] = useState(initialProfileImage || '');
  const [coverImage, setCoverImage] = useState(initialCoverImage || '');
  const [isAddingMedia, setIsAddingMedia] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [newMedia, setNewMedia] = useState({
    media_type: 'image' as MediaType,
    url: '',
    title: '',
    description: '',
    is_featured: false,
    is_logo: false,
    is_cover_image: false,
  });
  const supabase = createClient();

  // Handle profile image upload
  const handleProfileUpload = async (file: File) => {
    setUploadingProfile(true);
    try {
      const result: UploadResult = await uploadUserFile(file, 'providers', userId, 'profile');
      
      if (!result.success || !result.url) {
        alert(result.error || 'Failed to upload profile image');
        return;
      }

      // Update in database
      const { error } = await supabase
        .from('providers')
        .update({ profile_image: result.url })
        .eq('id', providerId);

      if (error) {
        console.error('Database update error:', error);
        alert('Failed to save profile image');
        return;
      }

      setProfileImage(result.url);
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
      const result: UploadResult = await uploadUserFile(file, 'providers', userId, 'cover');
      
      if (!result.success || !result.url) {
        alert(result.error || 'Failed to upload cover image');
        return;
      }

      // Save to provider_media with is_cover_image flag
      const { data, error } = await supabase
        .from('provider_media')
        .insert({
          provider_id: providerId,
          media_type: 'image',
          url: result.url,
          is_cover_image: true,
          is_featured: false,
          is_logo: false,
          display_order: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Database save error:', error);
        alert('Failed to save cover image');
        return;
      }

      setCoverImage(result.url);
      setMedia(prev => [...prev, data]);
    } catch (error) {
      console.error('Cover upload error:', error);
      alert('Failed to upload cover image');
    } finally {
      setUploadingCover(false);
    }
  };

  // Handle file upload for gallery
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const result: UploadResult = await uploadUserFile(file, 'providers', userId, 'gallery');
      
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
      .from('provider_media')
      .insert({
        provider_id: providerId,
        media_type: newMedia.media_type,
        url: newMedia.url,
        thumbnail_url: thumbnailUrl,
        embed_id: embedId,
        title: newMedia.title || null,
        description: newMedia.description || null,
        is_featured: newMedia.is_featured,
        is_logo: newMedia.is_logo,
        is_cover_image: newMedia.is_cover_image,
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
      is_logo: false,
      is_cover_image: false,
    });
    setIsAddingMedia(false);
  };

  // Delete media
  const handleDeleteMedia = async (id: string) => {
    if (!confirm('Are you sure you want to delete this media?')) return;

    // Find the media item to get its URL
    const mediaItem = media.find(m => m.id === id);
    
    // Delete from database
    const { error } = await supabase
      .from('provider_media')
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

    // Update cover image state if needed
    if (mediaItem?.is_cover_image) {
      setCoverImage('');
    }

    setMedia(prev => prev.filter(m => m.id !== id));
  };

  // Toggle featured
  const handleToggleFeatured = async (id: string, isFeatured: boolean) => {
    const { error } = await supabase
      .from('provider_media')
      .update({ is_featured: isFeatured })
      .eq('id', id);

    if (error) {
      console.error('Error updating media:', error);
      return;
    }

    setMedia(prev => prev.map(m => m.id === id ? { ...m, is_featured: isFeatured } : m));
  };

  // Get thumbnail for display
  const getThumbnail = (item: ProviderMedia): string => {
    if (item.thumbnail_url) return item.thumbnail_url;
    if (item.embed_id) return getYouTubeThumbnail(item.embed_id);
    return item.url;
  };

  const images = media.filter(m => m.media_type === 'image' && !m.is_cover_image);
  const videos = media.filter(m => m.media_type !== 'image');

  return (
    <div className="space-y-8">
      {/* Profile & Cover Images Section */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h2 className="font-semibold text-neutral-900">Profile & Cover Images</h2>
          <p className="text-sm text-neutral-500">These images appear on your public profile</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Image */}
          <div>
            <Label className="text-sm font-medium text-neutral-700 mb-2 block">
              Profile Picture
            </Label>
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-neutral-100 border-2 border-neutral-200">
                {profileImage ? (
                  <Image
                    src={profileImage}
                    alt="Profile"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="h-12 w-12 text-neutral-300" />
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProfileUpload(file);
                }}
                className="hidden"
                id="profile-upload"
              />
              <label
                htmlFor="profile-upload"
                className="absolute bottom-0 right-0 p-2 bg-black text-white rounded-full cursor-pointer hover:bg-neutral-800 transition-colors"
              >
                {uploadingProfile ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </label>
            </div>
            <p className="text-xs text-neutral-500 mt-2">Recommended: 400x400px</p>
          </div>

          {/* Cover Image */}
          <div>
            <Label className="text-sm font-medium text-neutral-700 mb-2 block">
              Cover Image
            </Label>
            <div className="relative aspect-[3/1] rounded-lg overflow-hidden bg-neutral-100 border-2 border-dashed border-neutral-200">
              {coverImage ? (
                <Image
                  src={coverImage}
                  alt="Cover"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-neutral-300 mb-2" />
                  <span className="text-sm text-neutral-400">No cover image</span>
                </div>
              )}
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
              <label
                htmlFor="cover-upload"
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploadingCover ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                ) : (
                  <div className="text-center text-white">
                    <Upload className="h-6 w-6 mx-auto mb-1" />
                    <span className="text-sm">Upload Cover</span>
                  </div>
                )}
              </label>
            </div>
            <p className="text-xs text-neutral-500 mt-2">Recommended: 1200x400px</p>
          </div>
        </div>
      </div>

      {/* Gallery Section */}
      <div>
        {/* Add Media Button */}
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
                placeholder="e.g., Stage setup at Constitution Hill"
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

            {/* Toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="featured">Featured</Label>
                <Switch
                  id="featured"
                  checked={newMedia.is_featured}
                  onCheckedChange={(v) => setNewMedia(prev => ({ ...prev, is_featured: v }))}
                />
              </div>
              {newMedia.media_type === 'image' && (
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="logo">Use as Logo</Label>
                    <Switch
                      id="logo"
                      checked={newMedia.is_logo}
                      onCheckedChange={(v) => setNewMedia(prev => ({ ...prev, is_logo: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cover">Use as Cover Image</Label>
                    <Switch
                      id="cover"
                      checked={newMedia.is_cover_image}
                      onCheckedChange={(v) => setNewMedia(prev => ({ ...prev, is_cover_image: v }))}
                    />
                  </div>
                </>
              )}
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
                  {item.is_logo && (
                    <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded">Logo</span>
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
            <p className="text-sm text-neutral-400">Add photos of your work and equipment</p>
          </div>
        )}
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
            <p className="text-neutral-500">No videos yet</p>
            <p className="text-sm text-neutral-400">Add YouTube or TikTok videos of your work</p>
          </div>
        )}
      </div>
      </div> {/* End Gallery Section */}
    </div>
  );
}
