'use client';

import { 
  Instagram, 
  Youtube, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Globe, 
  Music, 
  Link,
  ExternalLink
} from 'lucide-react';
import { SocialPlatform } from '@/types/database';
import { cn } from '@/lib/utils';

interface SocialLink {
  platform: SocialPlatform;
  url: string;
  username?: string | null;
  follower_count?: number | null;
}

interface SocialLinksRowProps {
  links: SocialLink[];
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

const platformColors: Record<SocialPlatform, string> = {
  instagram: 'hover:text-pink-500',
  youtube: 'hover:text-red-500',
  tiktok: 'hover:text-black',
  facebook: 'hover:text-blue-600',
  twitter: 'hover:text-sky-500',
  linkedin: 'hover:text-blue-700',
  spotify: 'hover:text-green-500',
  apple_music: 'hover:text-pink-600',
  soundcloud: 'hover:text-orange-500',
  bandcamp: 'hover:text-cyan-500',
  deezer: 'hover:text-purple-500',
  website: 'hover:text-neutral-900',
  other: 'hover:text-neutral-700',
};

const platformIcons: Record<SocialPlatform, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music, // Using Music as placeholder
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  spotify: Music,
  apple_music: Music,
  soundcloud: Music,
  bandcamp: Music,
  deezer: Music,
  website: Globe,
  other: Link,
};

const platformLabels: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  twitter: 'X',
  linkedin: 'LinkedIn',
  spotify: 'Spotify',
  apple_music: 'Apple Music',
  soundcloud: 'SoundCloud',
  bandcamp: 'Bandcamp',
  deezer: 'Deezer',
  website: 'Website',
  other: 'Link',
};

export function SocialLinksRow({ links, size = 'md', showLabels = false, className }: SocialLinksRowProps) {
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const buttonSizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  };

  if (!links || links.length === 0) return null;

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {links.map((link) => {
        const Icon = platformIcons[link.platform];
        return (
          <a
            key={link.platform}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-1.5 rounded-full bg-neutral-100 text-neutral-500 transition-colors',
              buttonSizes[size],
              platformColors[link.platform],
              showLabels && 'px-3'
            )}
            title={link.username ? `@${link.username}` : platformLabels[link.platform]}
          >
            <Icon className={iconSizes[size]} />
            {showLabels && (
              <span className="text-sm font-medium">
                {link.username ? `@${link.username}` : platformLabels[link.platform]}
              </span>
            )}
          </a>
        );
      })}
    </div>
  );
}

// Full social link card with stats
interface SocialLinkCardProps {
  link: SocialLink;
  className?: string;
}

export function SocialLinkCard({ link, className }: SocialLinkCardProps) {
  const Icon = platformIcons[link.platform];
  
  const formatFollowers = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border border-neutral-200 bg-white hover:border-neutral-300 transition-colors group',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'p-2 rounded-full bg-neutral-100 text-neutral-500 transition-colors',
          platformColors[link.platform]
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium text-neutral-900">{platformLabels[link.platform]}</p>
          {link.username && (
            <p className="text-sm text-neutral-500">@{link.username}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {link.follower_count && (
          <span className="text-sm text-neutral-500">
            {formatFollowers(link.follower_count)} followers
          </span>
        )}
        <ExternalLink className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600" />
      </div>
    </a>
  );
}

// Stacked list of social links
interface SocialLinksListProps {
  links: SocialLink[];
  className?: string;
}

export function SocialLinksList({ links, className }: SocialLinksListProps) {
  if (!links || links.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {links.map((link) => (
        <SocialLinkCard key={link.platform} link={link} />
      ))}
    </div>
  );
}
