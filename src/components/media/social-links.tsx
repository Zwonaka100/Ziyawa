'use client'

/**
 * Social Links Components
 * 
 * Form for adding/editing social media links
 * Display component with platform icons
 */

import { useState } from 'react'
import { 
  Instagram, 
  Twitter, 
  Facebook, 
  Youtube,
  Music2,
  Globe,
  Linkedin,
  Plus,
  Trash2,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validateSocialUrl, normalizeSocialUrl } from '@/lib/storage'
import { cn } from '@/lib/utils'

// Social platform definitions
export const SOCIAL_PLATFORMS = {
  instagram: { name: 'Instagram', icon: Instagram, color: '#E4405F', placeholder: 'https://instagram.com/username' },
  twitter: { name: 'X (Twitter)', icon: Twitter, color: '#000000', placeholder: 'https://x.com/username' },
  facebook: { name: 'Facebook', icon: Facebook, color: '#1877F2', placeholder: 'https://facebook.com/page' },
  youtube: { name: 'YouTube', icon: Youtube, color: '#FF0000', placeholder: 'https://youtube.com/@channel' },
  tiktok: { name: 'TikTok', icon: Music2, color: '#000000', placeholder: 'https://tiktok.com/@username' },
  linkedin: { name: 'LinkedIn', icon: Linkedin, color: '#0A66C2', placeholder: 'https://linkedin.com/in/username' },
  soundcloud: { name: 'SoundCloud', icon: Music2, color: '#FF5500', placeholder: 'https://soundcloud.com/artist' },
  spotify: { name: 'Spotify', icon: Music2, color: '#1DB954', placeholder: 'https://open.spotify.com/artist/...' },
  website: { name: 'Website', icon: Globe, color: '#000000', placeholder: 'https://yourwebsite.com' }
} as const

export type SocialPlatform = keyof typeof SOCIAL_PLATFORMS

export interface SocialLink {
  platform: SocialPlatform
  url: string
}

// =====================================================
// SOCIAL LINKS FORM
// =====================================================

interface SocialLinksFormProps {
  links: SocialLink[]
  onChange: (links: SocialLink[]) => void
  className?: string
}

export function SocialLinksForm({ links, onChange, className }: SocialLinksFormProps) {
  const [newPlatform, setNewPlatform] = useState<SocialPlatform | ''>('')
  const [newUrl, setNewUrl] = useState('')
  const [error, setError] = useState('')

  const availablePlatforms = Object.keys(SOCIAL_PLATFORMS).filter(
    p => !links.some(l => l.platform === p)
  ) as SocialPlatform[]

  const handleAdd = () => {
    setError('')

    if (!newPlatform) {
      setError('Select a platform')
      return
    }

    if (!newUrl.trim()) {
      setError('Enter your profile URL')
      return
    }

    const normalizedUrl = normalizeSocialUrl(newUrl)
    const validation = validateSocialUrl(normalizedUrl)

    if (!validation.valid) {
      setError(validation.error || 'Invalid URL')
      return
    }

    onChange([...links, { platform: newPlatform, url: normalizedUrl }])
    setNewPlatform('')
    setNewUrl('')
  }

  const handleRemove = (platform: SocialPlatform) => {
    onChange(links.filter(l => l.platform !== platform))
  }

  const handleUpdate = (platform: SocialPlatform, url: string) => {
    onChange(links.map(l => l.platform === platform ? { ...l, url: normalizeSocialUrl(url) } : l))
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Existing Links */}
      {links.map(link => {
        const platform = SOCIAL_PLATFORMS[link.platform]
        const Icon = platform.icon

        return (
          <div key={link.platform} className="flex items-center gap-3">
            <div 
              className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${platform.color}15` }}
            >
              <Icon className="h-5 w-5" style={{ color: platform.color }} />
            </div>
            
            <div className="flex-1">
              <Label className="text-xs text-gray-500">{platform.name}</Label>
              <Input
                value={link.url}
                onChange={(e) => handleUpdate(link.platform, e.target.value)}
                placeholder={platform.placeholder}
                className="mt-1"
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemove(link.platform)}
              className="flex-shrink-0 h-10 w-10 p-0 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      })}

      {/* Add New Link */}
      {availablePlatforms.length > 0 && (
        <div className="pt-4 border-t border-gray-100">
          <Label className="text-sm font-medium">Add social link</Label>
          
          <div className="mt-2 flex flex-wrap gap-2">
            {availablePlatforms.map(platformKey => {
              const platform = SOCIAL_PLATFORMS[platformKey]
              const Icon = platform.icon
              const isSelected = newPlatform === platformKey

              return (
                <button
                  key={platformKey}
                  type="button"
                  onClick={() => setNewPlatform(platformKey)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
                    isSelected 
                      ? 'border-black bg-gray-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <Icon className="h-4 w-4" style={{ color: platform.color }} />
                  <span className="text-sm">{platform.name}</span>
                </button>
              )
            })}
          </div>

          {newPlatform && (
            <div className="mt-3 flex gap-2">
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder={SOCIAL_PLATFORMS[newPlatform].placeholder}
                className="flex-1"
              />
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          )}

          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>
      )}

      {links.length === 0 && availablePlatforms.length === Object.keys(SOCIAL_PLATFORMS).length && (
        <p className="text-sm text-gray-500 text-center py-4">
          No social links added yet. Click a platform above to add one.
        </p>
      )}
    </div>
  )
}

// =====================================================
// SOCIAL LINKS DISPLAY
// =====================================================

interface SocialLinksDisplayProps {
  links: SocialLink[]
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
  className?: string
}

export function SocialLinksDisplay({ 
  links, 
  size = 'md', 
  showLabels = false,
  className 
}: SocialLinksDisplayProps) {
  if (links.length === 0) return null

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {links.map(link => {
        const platform = SOCIAL_PLATFORMS[link.platform]
        if (!platform) return null
        
        const Icon = platform.icon

        return (
          <a
            key={link.platform}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-2 rounded-lg transition-colors',
              showLabels 
                ? 'px-3 py-2 border border-gray-200 hover:border-gray-300'
                : cn(sizeClasses[size], 'justify-center hover:bg-gray-100')
            )}
            title={platform.name}
          >
            <Icon className={iconSizes[size]} style={{ color: platform.color }} />
            {showLabels && (
              <span className="text-sm">{platform.name}</span>
            )}
          </a>
        )
      })}
    </div>
  )
}

// =====================================================
// SOCIAL LINK ICON (Single)
// =====================================================

interface SocialLinkIconProps {
  platform: SocialPlatform
  url: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function SocialLinkIcon({ platform, url, size = 'md', className }: SocialLinkIconProps) {
  const platformData = SOCIAL_PLATFORMS[platform]
  if (!platformData) return null

  const Icon = platformData.icon
  
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-center justify-center rounded-lg transition-colors hover:bg-gray-100',
        sizeClasses[size],
        className
      )}
      title={platformData.name}
    >
      <Icon className={iconSizes[size]} style={{ color: platformData.color }} />
    </a>
  )
}
