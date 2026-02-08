'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, CheckCircle, DollarSign, Music, ExternalLink } from 'lucide-react';
import { ArtistPortfolio, ProviderPortfolio, PortfolioMedia, MediaType } from '@/types/database';
import { cn } from '@/lib/utils';
import { MediaGallery } from './media-gallery';

interface PortfolioItemProps {
  type: 'artist' | 'provider';
  portfolio: ArtistPortfolio | ProviderPortfolio;
  media?: PortfolioMedia[];
  className?: string;
}

export function PortfolioCard({ type, portfolio, media, className }: PortfolioItemProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const artistPortfolio = type === 'artist' ? portfolio as ArtistPortfolio : null;
  const providerPortfolio = type === 'provider' ? portfolio as ProviderPortfolio : null;

  // Get highlight image
  const highlightImage = media?.find(m => m.is_highlight) || media?.[0];

  return (
    <div className={cn('bg-white border border-neutral-200 rounded-xl overflow-hidden', className)}>
      {/* Image */}
      {highlightImage && (
        <div className="relative aspect-video bg-neutral-100">
          <Image
            src={highlightImage.url}
            alt={portfolio.event_name}
            fill
            className="object-cover"
          />
          {/* Verified badge overlay */}
          {portfolio.is_verified && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/80 text-white text-xs rounded-full">
              <CheckCircle className="h-3 w-3" />
              <span>Verified via Ziyawa</span>
            </div>
          )}
        </div>
      )}

      <div className="p-5">
        {/* Event name */}
        <h3 className="font-semibold text-lg text-neutral-900 mb-2">
          {portfolio.event_name}
        </h3>

        {/* Meta info */}
        <div className="flex flex-wrap gap-3 text-sm text-neutral-600 mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(portfolio.event_date)}</span>
          </div>
          {artistPortfolio?.venue_location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{artistPortfolio.venue_location}</span>
            </div>
          )}
          {artistPortfolio?.performance_type && (
            <div className="flex items-center gap-1">
              <Music className="h-4 w-4" />
              <span className="capitalize">{artistPortfolio.performance_type}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {(portfolio.description || artistPortfolio?.highlights) && (
          <p className="text-sm text-neutral-600 mb-4">
            {portfolio.description || artistPortfolio?.highlights}
          </p>
        )}

        {/* Provider service description */}
        {providerPortfolio?.service_description && (
          <p className="text-sm text-neutral-600 mb-4">
            {providerPortfolio.service_description}
          </p>
        )}

        {/* Verified info */}
        {portfolio.is_verified && (
          <div className="flex flex-wrap gap-2 mb-4">
            {portfolio.paid_via_ziyawa && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                <DollarSign className="h-3 w-3" />
                Paid via Ziyawa
              </span>
            )}
            {artistPortfolio?.organizer_confirmed && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                <CheckCircle className="h-3 w-3" />
                Organizer confirmed
              </span>
            )}
            {providerPortfolio?.client_confirmed && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                <CheckCircle className="h-3 w-3" />
                Client confirmed
              </span>
            )}
          </div>
        )}

        {/* Image gallery (if more than 1 image) */}
        {media && media.length > 1 && (
          <div className="mt-4">
            <MediaGallery
              media={media.slice(0, 4).map(m => ({
                id: m.id,
                media_type: m.media_type,
                url: m.url,
                thumbnail_url: m.thumbnail_url,
                title: m.title,
              }))}
              columns={4}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Portfolio grid
interface PortfolioGridProps {
  type: 'artist' | 'provider';
  items: (ArtistPortfolio | ProviderPortfolio)[];
  mediaMap?: Record<string, PortfolioMedia[]>; // portfolio_id -> media[]
  showVerifiedOnly?: boolean;
  className?: string;
}

export function PortfolioGrid({ 
  type, 
  items, 
  mediaMap,
  showVerifiedOnly = false,
  className 
}: PortfolioGridProps) {
  const filteredItems = showVerifiedOnly 
    ? items.filter(item => item.is_verified) 
    : items;

  if (filteredItems.length === 0) {
    return (
      <div className="text-center py-12 bg-neutral-50 rounded-xl">
        <Music className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
        <p className="text-neutral-600">No portfolio items yet</p>
        <p className="text-sm text-neutral-500">
          {type === 'artist' 
            ? 'Completed bookings will appear here'
            : 'Completed jobs will appear here'}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-6 md:grid-cols-2', className)}>
      {filteredItems.map((item) => (
        <PortfolioCard
          key={item.id}
          type={type}
          portfolio={item}
          media={mediaMap?.[item.id]}
        />
      ))}
    </div>
  );
}

// Compact portfolio item for lists
interface PortfolioListItemProps {
  type: 'artist' | 'provider';
  portfolio: ArtistPortfolio | ProviderPortfolio;
  className?: string;
}

export function PortfolioListItem({ type, portfolio, className }: PortfolioListItemProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const artistPortfolio = type === 'artist' ? portfolio as ArtistPortfolio : null;
  const providerPortfolio = type === 'provider' ? portfolio as ProviderPortfolio : null;

  return (
    <div className={cn(
      'flex items-center gap-4 p-4 border-b border-neutral-100 last:border-0',
      className
    )}>
      {/* Verified indicator */}
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
        portfolio.is_verified ? 'bg-green-100' : 'bg-neutral-100'
      )}>
        {portfolio.is_verified ? (
          <CheckCircle className="h-5 w-5 text-green-600" />
        ) : (
          <Music className="h-5 w-5 text-neutral-400" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-neutral-900 truncate">{portfolio.event_name}</p>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <span>{formatDate(portfolio.event_date)}</span>
          {artistPortfolio?.performance_type && (
            <>
              <span>•</span>
              <span className="capitalize">{artistPortfolio.performance_type}</span>
            </>
          )}
          {providerPortfolio?.service_description && (
            <>
              <span>•</span>
              <span className="truncate">{providerPortfolio.service_description}</span>
            </>
          )}
        </div>
      </div>

      {/* Status badge */}
      {portfolio.is_verified && (
        <span className="text-xs text-green-600 font-medium">Verified</span>
      )}
    </div>
  );
}

// Stats summary for portfolio
interface PortfolioStatsProps {
  totalGigs: number;
  verifiedGigs: number;
  totalEarned?: number;
  type: 'artist' | 'provider';
  className?: string;
}

export function PortfolioStats({ 
  totalGigs, 
  verifiedGigs, 
  totalEarned,
  type,
  className 
}: PortfolioStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={cn('grid grid-cols-3 gap-4', className)}>
      <div className="text-center p-4 bg-neutral-50 rounded-xl">
        <p className="text-2xl font-bold text-neutral-900">{totalGigs}</p>
        <p className="text-sm text-neutral-500">
          {type === 'artist' ? 'Total Gigs' : 'Total Jobs'}
        </p>
      </div>
      <div className="text-center p-4 bg-green-50 rounded-xl">
        <p className="text-2xl font-bold text-green-700">{verifiedGigs}</p>
        <p className="text-sm text-green-600">Verified</p>
      </div>
      {totalEarned !== undefined && (
        <div className="text-center p-4 bg-neutral-50 rounded-xl">
          <p className="text-2xl font-bold text-neutral-900">{formatCurrency(totalEarned)}</p>
          <p className="text-sm text-neutral-500">Earned via Ziyawa</p>
        </div>
      )}
    </div>
  );
}
