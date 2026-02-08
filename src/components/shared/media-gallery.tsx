'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play, X, ChevronLeft, ChevronRight, Expand } from 'lucide-react';
import { MediaType, getYouTubeEmbedUrl, extractYouTubeId, getYouTubeThumbnail } from '@/types/database';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface MediaItem {
  id: string;
  media_type: MediaType;
  url: string;
  thumbnail_url?: string | null;
  title?: string | null;
  description?: string | null;
  embed_id?: string | null;
  is_featured?: boolean;
}

interface MediaGalleryProps {
  media: MediaItem[];
  columns?: 2 | 3 | 4;
  showTitles?: boolean;
  className?: string;
}

export function MediaGallery({ media, columns = 3, showTitles = false, className }: MediaGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!media || media.length === 0) return null;

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  };

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);

  const goNext = () => setCurrentIndex((i) => (i + 1) % media.length);
  const goPrev = () => setCurrentIndex((i) => (i - 1 + media.length) % media.length);

  const isVideo = (type: MediaType) => 
    ['youtube_video', 'tiktok_video', 'instagram_reel', 'facebook_video', 'video_url'].includes(type);

  const getThumbnail = (item: MediaItem): string => {
    if (item.thumbnail_url) return item.thumbnail_url;
    if (item.media_type === 'youtube_video' && item.embed_id) {
      return getYouTubeThumbnail(item.embed_id);
    }
    if (item.media_type === 'youtube_video') {
      const videoId = extractYouTubeId(item.url);
      if (videoId) return getYouTubeThumbnail(videoId);
    }
    return item.url;
  };

  return (
    <>
      <div className={cn('grid gap-2', gridCols[columns], className)}>
        {media.map((item, index) => (
          <div
            key={item.id}
            className="relative aspect-square rounded-lg overflow-hidden bg-neutral-100 cursor-pointer group"
            onClick={() => openLightbox(index)}
          >
            <Image
              src={getThumbnail(item)}
              alt={item.title || 'Media'}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
            {/* Video play overlay */}
            {isVideo(item.media_type) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="h-6 w-6 text-neutral-900 ml-1" fill="currentColor" />
                </div>
              </div>
            )}
            {/* Expand icon on hover */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors opacity-0 group-hover:opacity-100">
              {!isVideo(item.media_type) && (
                <Expand className="h-6 w-6 text-white drop-shadow-lg" />
              )}
            </div>
            {/* Featured badge */}
            {item.is_featured && (
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white text-xs rounded">
                Featured
              </div>
            )}
            {/* Title */}
            {showTitles && item.title && (
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white text-sm truncate">{item.title}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
          >
            <X className="h-8 w-8" />
          </button>

          {/* Navigation */}
          {media.length > 1 && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-4 p-2 text-white/70 hover:text-white transition-colors z-10"
              >
                <ChevronLeft className="h-10 w-10" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
              >
                <ChevronRight className="h-10 w-10" />
              </button>
            </>
          )}

          {/* Content */}
          <div className="max-w-5xl max-h-[90vh] w-full mx-4">
            {isVideo(media[currentIndex].media_type) ? (
              <VideoEmbed
                url={media[currentIndex].url}
                embedId={media[currentIndex].embed_id}
                type={media[currentIndex].media_type}
                className="w-full aspect-video"
              />
            ) : (
              <div className="relative w-full h-[80vh]">
                <Image
                  src={media[currentIndex].url}
                  alt={media[currentIndex].title || 'Media'}
                  fill
                  className="object-contain"
                />
              </div>
            )}
            {/* Caption */}
            {(media[currentIndex].title || media[currentIndex].description) && (
              <div className="mt-4 text-center">
                {media[currentIndex].title && (
                  <h3 className="text-white text-lg font-medium">{media[currentIndex].title}</h3>
                )}
                {media[currentIndex].description && (
                  <p className="text-white/70 text-sm mt-1">{media[currentIndex].description}</p>
                )}
              </div>
            )}
          </div>

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {currentIndex + 1} / {media.length}
          </div>
        </div>
      )}
    </>
  );
}

// Single video embed component
interface VideoEmbedProps {
  url: string;
  embedId?: string | null;
  type: MediaType;
  title?: string;
  className?: string;
  autoplay?: boolean;
}

export function VideoEmbed({ url, embedId, type, title, className, autoplay = false }: VideoEmbedProps) {
  const getEmbedUrl = (): string => {
    if (type === 'youtube_video') {
      const videoId = embedId || extractYouTubeId(url);
      if (videoId) {
        return `${getYouTubeEmbedUrl(videoId)}${autoplay ? '?autoplay=1' : ''}`;
      }
    }
    // For other video types, return the URL directly
    return url;
  };

  if (type === 'youtube_video') {
    return (
      <div className={cn('relative rounded-lg overflow-hidden bg-black', className)}>
        <iframe
          src={getEmbedUrl()}
          title={title || 'Video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full aspect-video"
        />
      </div>
    );
  }

  // For TikTok, Instagram, etc. - show as link with thumbnail
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'block relative rounded-lg overflow-hidden bg-neutral-100 group',
        className
      )}
    >
      <div className="aspect-video flex items-center justify-center bg-neutral-900">
        <div className="text-center">
          <Play className="h-12 w-12 text-white mx-auto mb-2" />
          <p className="text-white text-sm">Watch on {type.replace('_', ' ')}</p>
        </div>
      </div>
    </a>
  );
}

// Video carousel for multiple videos
interface VideoCarouselProps {
  videos: MediaItem[];
  className?: string;
}

export function VideoCarousel({ videos, className }: VideoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!videos || videos.length === 0) return null;

  const goNext = () => setCurrentIndex((i) => (i + 1) % videos.length);
  const goPrev = () => setCurrentIndex((i) => (i - 1 + videos.length) % videos.length);

  return (
    <div className={cn('relative', className)}>
      <VideoEmbed
        url={videos[currentIndex].url}
        embedId={videos[currentIndex].embed_id}
        type={videos[currentIndex].media_type}
        title={videos[currentIndex].title || undefined}
        className="w-full"
      />

      {/* Video title */}
      {videos[currentIndex].title && (
        <p className="mt-2 text-sm text-neutral-600">{videos[currentIndex].title}</p>
      )}

      {/* Navigation */}
      {videos.length > 1 && (
        <div className="flex items-center justify-between mt-3">
          <Button variant="outline" size="sm" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-neutral-500">
            {currentIndex + 1} / {videos.length}
          </span>
          <Button variant="outline" size="sm" onClick={goNext}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Thumbnail strip */}
      {videos.length > 1 && videos.length <= 6 && (
        <div className="flex gap-2 mt-3 overflow-x-auto">
          {videos.map((video, index) => {
            const thumb = video.thumbnail_url || 
              (video.embed_id ? getYouTubeThumbnail(video.embed_id) : null) ||
              (extractYouTubeId(video.url) ? getYouTubeThumbnail(extractYouTubeId(video.url)!) : null);
            
            return (
              <button
                key={video.id}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  'relative w-20 h-12 rounded overflow-hidden flex-shrink-0 border-2 transition-colors',
                  index === currentIndex ? 'border-black' : 'border-transparent opacity-70 hover:opacity-100'
                )}
              >
                {thumb ? (
                  <Image src={thumb} alt="" fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-neutral-200 flex items-center justify-center">
                    <Play className="h-4 w-4 text-neutral-400" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
