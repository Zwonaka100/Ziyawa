'use client'

/**
 * VideoEmbed Component
 * 
 * Embeds YouTube, TikTok, and other video platforms.
 * Handles URL parsing and responsive embedding.
 */

import { useState } from 'react'
import { Play, ExternalLink, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { extractYouTubeId, extractTikTokId, getYouTubeEmbedUrl, getYouTubeThumbnail } from '@/lib/storage'
import { cn } from '@/lib/utils'

interface VideoEmbedProps {
  url: string
  title?: string
  className?: string
}

interface VideoInputProps {
  onAdd: (url: string, platform: string) => void
  className?: string
}

interface VideoGridProps {
  videos: Array<{ url: string; title?: string; platform?: string }>
  onDelete?: (url: string) => void
  editable?: boolean
  className?: string
}

/**
 * Single Video Embed Display
 */
export function VideoEmbed({ url, title, className }: VideoEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  
  // Detect platform
  const youtubeId = extractYouTubeId(url)
  const tiktokId = extractTikTokId(url)

  if (youtubeId) {
    return (
      <div className={cn('relative aspect-video rounded-lg overflow-hidden bg-black', className)}>
        {!isPlaying ? (
          // Thumbnail with play button
          <div 
            className="absolute inset-0 cursor-pointer group"
            onClick={() => setIsPlaying(true)}
          >
            <img
              src={getYouTubeThumbnail(youtubeId, 'hq')}
              alt={title || 'Video thumbnail'}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="h-8 w-8 text-white ml-1" fill="white" />
              </div>
            </div>
          </div>
        ) : (
          // YouTube embed
          <iframe
            src={`${getYouTubeEmbedUrl(youtubeId)}?autoplay=1`}
            title={title || 'YouTube video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        )}
      </div>
    )
  }

  if (tiktokId) {
    return (
      <div className={cn('relative rounded-lg overflow-hidden bg-black', className)}>
        <blockquote 
          className="tiktok-embed" 
          cite={url}
          data-video-id={tiktokId}
        >
          <a href={url} target="_blank" rel="noopener noreferrer">
            View on TikTok
          </a>
        </blockquote>
        <script async src="https://www.tiktok.com/embed.js"></script>
      </div>
    )
  }

  // Fallback - external link
  return (
    <a 
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-center gap-2 p-4 rounded-lg border border-gray-200',
        'hover:border-gray-300 transition-colors',
        className
      )}
    >
      <Play className="h-5 w-5 text-gray-500" />
      <span className="flex-1 truncate text-sm">{title || url}</span>
      <ExternalLink className="h-4 w-4 text-gray-400" />
    </a>
  )
}

/**
 * Video URL Input Form
 */
export function VideoInput({ onAdd, className }: VideoInputProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!url.trim()) {
      setError('Please enter a video URL')
      return
    }

    // Detect platform
    const youtubeId = extractYouTubeId(url)
    const tiktokId = extractTikTokId(url)

    if (!youtubeId && !tiktokId) {
      setError('Only YouTube and TikTok links are supported')
      return
    }

    const platform = youtubeId ? 'youtube' : 'tiktok'
    onAdd(url.trim(), platform)
    setUrl('')
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-2', className)}>
      <div className="flex gap-2">
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste YouTube or TikTok link..."
          className="flex-1"
        />
        <Button type="submit">
          Add Video
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      <p className="text-xs text-gray-500">
        Supports YouTube and TikTok video links
      </p>
    </form>
  )
}

/**
 * Video Grid Display
 */
export function VideoGrid({ videos, onDelete, editable = false, className }: VideoGridProps) {
  if (videos.length === 0) {
    return (
      <div className={cn('text-center py-12 text-gray-500', className)}>
        <Play className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No videos yet</p>
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}>
      {videos.map((video, index) => (
        <div key={video.url || index} className="relative group">
          <VideoEmbed url={video.url} title={video.title} />
          
          {editable && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'absolute top-2 right-2 h-8 w-8 p-0 z-10',
                'bg-white/90 hover:bg-red-500 hover:text-white',
                'opacity-0 group-hover:opacity-100 transition-opacity'
              )}
              onClick={() => onDelete(video.url)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
