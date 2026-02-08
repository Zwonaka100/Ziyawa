'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Plus, 
  Trash2, 
  ExternalLink,
  Instagram,
  Youtube,
  Twitter,
  Facebook,
  Music2,
  Globe,
  Grip
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { ArtistSocialLink, SocialPlatform, SOCIAL_PLATFORM_LABELS } from '@/types/database';

interface ArtistSocialManagerProps {
  artistId: string;
  initialLinks: ArtistSocialLink[];
}

// Platform icons mapping
const platformIcons: Record<SocialPlatform, React.ReactNode> = {
  instagram: <Instagram className="h-5 w-5" />,
  tiktok: <Music2 className="h-5 w-5" />, // Using Music2 as TikTok proxy
  youtube: <Youtube className="h-5 w-5" />,
  twitter: <Twitter className="h-5 w-5" />,
  facebook: <Facebook className="h-5 w-5" />,
  spotify: <Music2 className="h-5 w-5" />,
  apple_music: <Music2 className="h-5 w-5" />,
  soundcloud: <Music2 className="h-5 w-5" />,
  bandcamp: <Music2 className="h-5 w-5" />,
  deezer: <Music2 className="h-5 w-5" />,
  website: <Globe className="h-5 w-5" />,
  linkedin: <Globe className="h-5 w-5" />,
  other: <Globe className="h-5 w-5" />,
};

// Platform colors for styling
const platformColors: Record<SocialPlatform, string> = {
  instagram: 'from-purple-500 to-pink-500',
  tiktok: 'from-neutral-800 to-neutral-900',
  youtube: 'from-red-500 to-red-600',
  twitter: 'from-blue-400 to-blue-500',
  facebook: 'from-blue-600 to-blue-700',
  spotify: 'from-green-500 to-green-600',
  apple_music: 'from-pink-500 to-red-500',
  soundcloud: 'from-orange-500 to-orange-600',
  bandcamp: 'from-cyan-500 to-blue-500',
  deezer: 'from-purple-600 to-pink-600',
  website: 'from-neutral-600 to-neutral-700',
  linkedin: 'from-blue-600 to-blue-800',
  other: 'from-neutral-500 to-neutral-600',
};

// URL templates for platforms
const platformUrlTemplates: Record<SocialPlatform, string> = {
  instagram: 'https://instagram.com/',
  tiktok: 'https://tiktok.com/@',
  youtube: 'https://youtube.com/@',
  twitter: 'https://twitter.com/',
  facebook: 'https://facebook.com/',
  spotify: 'https://open.spotify.com/artist/',
  apple_music: 'https://music.apple.com/artist/',
  soundcloud: 'https://soundcloud.com/',
  bandcamp: 'https://',
  deezer: 'https://www.deezer.com/artist/',
  website: '',
  linkedin: 'https://linkedin.com/in/',
  other: '',
};

export function ArtistSocialManager({ artistId, initialLinks }: ArtistSocialManagerProps) {
  const [links, setLinks] = useState<ArtistSocialLink[]>(initialLinks);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLink, setNewLink] = useState({
    platform: 'instagram' as SocialPlatform,
    url: '',
    username: '',
    is_primary: false,
  });
  const supabase = createClient();

  // Build full URL from username
  const buildUrl = (platform: SocialPlatform, usernameOrUrl: string): string => {
    // If it's already a URL, return it
    if (usernameOrUrl.startsWith('http')) return usernameOrUrl;
    
    const template = platformUrlTemplates[platform];
    return template + usernameOrUrl;
  };

  // Extract username from URL
  const extractUsername = (platform: SocialPlatform, url: string): string => {
    const template = platformUrlTemplates[platform];
    if (url.startsWith(template)) {
      return url.replace(template, '').split('/')[0].split('?')[0];
    }
    return url;
  };

  // Add social link
  const handleAddLink = async () => {
    if (!newLink.url && !newLink.username) return;

    const urlToUse = newLink.url || buildUrl(newLink.platform, newLink.username);
    const usernameToUse = newLink.username || extractUsername(newLink.platform, newLink.url);

    const { data, error } = await supabase
      .from('artist_social_links')
      .insert({
        artist_id: artistId,
        platform: newLink.platform,
        url: urlToUse,
        username: usernameToUse || null,
        is_primary: newLink.is_primary,
        display_order: links.length,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding social link:', error);
      alert('Failed to add social link');
      return;
    }

    setLinks(prev => [...prev, data]);
    setNewLink({
      platform: 'instagram',
      url: '',
      username: '',
      is_primary: false,
    });
    setIsAddingLink(false);
  };

  // Delete social link
  const handleDeleteLink = async (id: string) => {
    if (!confirm('Are you sure you want to remove this social link?')) return;

    const { error } = await supabase
      .from('artist_social_links')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting social link:', error);
      return;
    }

    setLinks(prev => prev.filter(l => l.id !== id));
  };

  // Toggle primary
  const handleTogglePrimary = async (id: string, isPrimary: boolean) => {
    // If setting as primary, unset others first
    if (isPrimary) {
      await supabase
        .from('artist_social_links')
        .update({ is_primary: false })
        .eq('artist_id', artistId);
    }

    const { error } = await supabase
      .from('artist_social_links')
      .update({ is_primary: isPrimary })
      .eq('id', id);

    if (error) {
      console.error('Error updating social link:', error);
      return;
    }

    setLinks(prev => prev.map(l => ({
      ...l,
      is_primary: l.id === id ? isPrimary : (isPrimary ? false : l.is_primary)
    })));
  };

  // Check if platform already exists
  const platformExists = (platform: SocialPlatform): boolean => {
    return links.some(l => l.platform === platform);
  };

  return (
    <div className="space-y-6">
      {/* Add Link Button */}
      <Dialog open={isAddingLink} onOpenChange={setIsAddingLink}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Social Link
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Social Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Platform */}
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select
                value={newLink.platform}
                onValueChange={(v) => setNewLink(prev => ({ ...prev, platform: v as SocialPlatform, url: '', username: '' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SOCIAL_PLATFORM_LABELS) as SocialPlatform[]).map((platform) => (
                    <SelectItem 
                      key={platform} 
                      value={platform}
                      disabled={platformExists(platform)}
                    >
                      <div className="flex items-center gap-2">
                        {platformIcons[platform]}
                        <span>{SOCIAL_PLATFORM_LABELS[platform]}</span>
                        {platformExists(platform) && (
                          <span className="text-xs text-neutral-400">(added)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Username or URL */}
            <div className="space-y-2">
              <Label>
                {newLink.platform === 'website' || newLink.platform === 'other' ? 'URL' : 'Username or URL'}
              </Label>
              <div className="flex gap-2">
                {newLink.platform !== 'website' && newLink.platform !== 'other' && (
                  <div className="flex items-center px-3 bg-neutral-100 rounded-l-md text-sm text-neutral-500">
                    @
                  </div>
                )}
                <Input
                  placeholder={
                    newLink.platform === 'website' 
                      ? 'https://yourwebsite.com' 
                      : 'username'
                  }
                  value={newLink.username || newLink.url}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.startsWith('http')) {
                      setNewLink(prev => ({ ...prev, url: value, username: '' }));
                    } else {
                      setNewLink(prev => ({ ...prev, username: value, url: '' }));
                    }
                  }}
                  className={newLink.platform !== 'website' && newLink.platform !== 'other' ? 'rounded-l-none' : ''}
                />
              </div>
              {newLink.platform !== 'website' && newLink.platform !== 'other' && (
                <p className="text-xs text-neutral-500">
                  Your profile will link to: {buildUrl(newLink.platform, newLink.username || 'username')}
                </p>
              )}
            </div>

            {/* Primary toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="primary">Primary Link</Label>
                <p className="text-xs text-neutral-500">Show prominently on your profile</p>
              </div>
              <Switch
                id="primary"
                checked={newLink.is_primary}
                onCheckedChange={(v) => setNewLink(prev => ({ ...prev, is_primary: v }))}
              />
            </div>

            <Button 
              onClick={handleAddLink} 
              className="w-full"
              disabled={!newLink.url && !newLink.username}
            >
              Add Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Links List */}
      {links.length > 0 ? (
        <div className="space-y-3">
          {links.map((link) => (
            <div 
              key={link.id} 
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-neutral-200 group"
            >
              {/* Drag handle */}
              <div className="text-neutral-300 cursor-grab">
                <Grip className="h-5 w-5" />
              </div>

              {/* Platform icon */}
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${platformColors[link.platform]} flex items-center justify-center text-white`}>
                {platformIcons[link.platform]}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-900">{SOCIAL_PLATFORM_LABELS[link.platform]}</span>
                  {link.is_primary && (
                    <span className="px-2 py-0.5 bg-black text-white text-xs rounded-full">Primary</span>
                  )}
                </div>
                <p className="text-sm text-neutral-500 truncate">
                  {link.username ? `@${link.username}` : link.url}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleTogglePrimary(link.id, !link.is_primary)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    link.is_primary 
                      ? 'border-black bg-black text-white' 
                      : 'border-neutral-300 text-neutral-600 hover:border-neutral-400'
                  }`}
                >
                  {link.is_primary ? 'Primary' : 'Set as Primary'}
                </button>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-neutral-400 hover:text-neutral-600"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={() => handleDeleteLink(link.id)}
                  className="p-2 text-neutral-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-neutral-200">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
            <Globe className="h-8 w-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-1">No social links yet</h3>
          <p className="text-neutral-500 mb-4">Connect your social media to let fans and organisers find you</p>
          <Button onClick={() => setIsAddingLink(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Link
          </Button>
        </div>
      )}

      {/* Tips */}
      <div className="p-4 bg-neutral-100 rounded-xl">
        <h4 className="font-medium text-neutral-900 mb-2">💡 Pro Tips</h4>
        <ul className="text-sm text-neutral-600 space-y-1">
          <li>• Set your most active platform as "Primary" - it will be shown first</li>
          <li>• Add your Spotify/Apple Music links so fans can stream your music</li>
          <li>• Instagram and TikTok help organisers see your audience engagement</li>
        </ul>
      </div>
    </div>
  );
}
