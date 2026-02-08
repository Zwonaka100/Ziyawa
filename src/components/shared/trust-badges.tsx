'use client';

import { Star, Shield, CheckCircle, TrendingUp, Clock, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrustBadgeProps {
  type: 'artist' | 'organizer' | 'provider';
  isVerified?: boolean;
  isTrusted?: boolean;
  completionRate?: number;
  totalBookings?: number;
  rating?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function TrustBadge({ 
  type,
  isVerified, 
  isTrusted,
  completionRate,
  totalBookings = 0,
  rating = 0,
  size = 'md',
  showLabel = true,
  className 
}: TrustBadgeProps) {
  // Determine trust level
  const getTrustLevel = () => {
    if (isTrusted) return 'trusted';
    if (isVerified) return 'verified';
    if (totalBookings >= 5 && completionRate && completionRate >= 90) return 'reliable';
    if (totalBookings >= 1) return 'active';
    return 'new';
  };

  const level = getTrustLevel();

  const levelConfig = {
    trusted: {
      label: type === 'organizer' ? 'Trusted Organizer' : type === 'provider' ? 'Trusted Provider' : 'Trusted Artist',
      icon: Shield,
      bgColor: 'bg-black',
      textColor: 'text-white',
      description: '100% reliable track record',
    },
    verified: {
      label: 'Ziyawa Verified',
      icon: CheckCircle,
      bgColor: 'bg-neutral-900',
      textColor: 'text-white',
      description: 'Identity verified',
    },
    reliable: {
      label: 'Reliable',
      icon: TrendingUp,
      bgColor: 'bg-neutral-700',
      textColor: 'text-white',
      description: 'Strong track record',
    },
    active: {
      label: 'Active',
      icon: CheckCircle,
      bgColor: 'bg-neutral-200',
      textColor: 'text-neutral-700',
      description: 'Recently active',
    },
    new: {
      label: 'New',
      icon: Star,
      bgColor: 'bg-neutral-100',
      textColor: 'text-neutral-500',
      description: 'New to Ziyawa',
    },
  };

  const config = levelConfig[level];
  const Icon = config.icon;

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-4 w-4',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.bgColor,
        config.textColor,
        sizes[size],
        className
      )}
      title={config.description}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && <span>{config.label}</span>}
    </div>
  );
}

// Stats bar showing trust metrics
interface TrustStatsProps {
  completedBookings: number;
  totalBookings: number;
  rating: number;
  totalReviews: number;
  responseRate?: number;
  showUpRate?: number; // For artists
  paymentRate?: number; // For organizers
  type: 'artist' | 'organizer' | 'provider';
  className?: string;
}

export function TrustStats({
  completedBookings,
  totalBookings,
  rating,
  totalReviews,
  responseRate,
  showUpRate,
  paymentRate,
  type,
  className,
}: TrustStatsProps) {
  const completionRate = totalBookings > 0 
    ? Math.round((completedBookings / totalBookings) * 100) 
    : 0;

  const stats = [
    {
      label: type === 'organizer' ? 'Events Hosted' : 'Bookings',
      value: totalBookings.toString(),
      show: true,
    },
    {
      label: 'Completion Rate',
      value: `${completionRate}%`,
      icon: Percent,
      highlight: completionRate >= 95,
      show: totalBookings > 0,
    },
    {
      label: 'Rating',
      value: rating > 0 ? rating.toFixed(1) : '-',
      icon: Star,
      highlight: rating >= 4.5,
      subtext: totalReviews > 0 ? `(${totalReviews})` : undefined,
      show: true,
    },
    {
      label: 'Response Rate',
      value: responseRate ? `${responseRate}%` : '-',
      icon: Clock,
      show: !!responseRate,
    },
    {
      label: 'Show-up Rate',
      value: showUpRate ? `${showUpRate}%` : '-',
      highlight: showUpRate && showUpRate >= 95,
      show: type === 'artist' && !!showUpRate,
    },
    {
      label: 'Payment Rate',
      value: paymentRate ? `${paymentRate}%` : '-',
      highlight: paymentRate && paymentRate >= 95,
      show: type === 'organizer' && !!paymentRate,
    },
  ].filter(s => s.show);

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {stats.map((stat) => (
        <div key={stat.label} className="text-center">
          <div className={cn(
            'text-2xl font-bold',
            stat.highlight ? 'text-black' : 'text-neutral-700'
          )}>
            {stat.value}
            {stat.subtext && (
              <span className="text-sm font-normal text-neutral-500 ml-1">{stat.subtext}</span>
            )}
          </div>
          <div className="text-sm text-neutral-500">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

// Compact trust indicator for cards
interface TrustIndicatorProps {
  rating: number;
  totalReviews: number;
  completionRate?: number;
  isVerified?: boolean;
  className?: string;
}

export function TrustIndicator({ 
  rating, 
  totalReviews, 
  completionRate,
  isVerified,
  className 
}: TrustIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-3 text-sm', className)}>
      {/* Rating */}
      <div className="flex items-center gap-1">
        <Star className="h-4 w-4 text-yellow-500" fill="currentColor" />
        <span className="font-medium">{rating > 0 ? rating.toFixed(1) : 'New'}</span>
        {totalReviews > 0 && (
          <span className="text-neutral-500">({totalReviews})</span>
        )}
      </div>

      {/* Completion rate */}
      {completionRate !== undefined && completionRate > 0 && (
        <div className="flex items-center gap-1 text-neutral-600">
          <CheckCircle className={cn(
            'h-4 w-4',
            completionRate >= 95 ? 'text-green-600' : 'text-neutral-400'
          )} />
          <span>{completionRate}%</span>
        </div>
      )}

      {/* Verified badge */}
      {isVerified && (
        <div className="flex items-center gap-1 text-black">
          <Shield className="h-4 w-4" />
          <span className="text-xs font-medium">Verified</span>
        </div>
      )}
    </div>
  );
}

// Track record card for detailed view
interface TrackRecordCardProps {
  type: 'artist' | 'organizer' | 'provider';
  totalBookings: number;
  completedBookings: number;
  cancelledBookings?: number;
  totalEarned?: number;
  totalPaid?: number;
  rating: number;
  totalReviews: number;
  memberSince: string;
  isVerified?: boolean;
  className?: string;
}

export function TrackRecordCard({
  type,
  totalBookings,
  completedBookings,
  cancelledBookings = 0,
  totalEarned,
  totalPaid,
  rating,
  totalReviews,
  memberSince,
  isVerified,
  className,
}: TrackRecordCardProps) {
  const completionRate = totalBookings > 0 
    ? Math.round((completedBookings / totalBookings) * 100) 
    : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-ZA', {
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className={cn('bg-white border border-neutral-200 rounded-xl p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-neutral-900">Track Record</h3>
        {isVerified && (
          <TrustBadge type={type} isVerified={isVerified} size="sm" />
        )}
      </div>

      <div className="space-y-4">
        {/* Bookings/Events */}
        <div className="flex justify-between items-center py-2 border-b border-neutral-100">
          <span className="text-neutral-600">
            {type === 'organizer' ? 'Events Hosted' : 'Total Bookings'}
          </span>
          <span className="font-semibold text-neutral-900">{totalBookings}</span>
        </div>

        {/* Completed */}
        <div className="flex justify-between items-center py-2 border-b border-neutral-100">
          <span className="text-neutral-600">Completed</span>
          <span className="font-semibold text-neutral-900">{completedBookings}</span>
        </div>

        {/* Completion Rate */}
        <div className="flex justify-between items-center py-2 border-b border-neutral-100">
          <span className="text-neutral-600">Completion Rate</span>
          <span className={cn(
            'font-semibold',
            completionRate >= 95 ? 'text-green-600' : 
            completionRate >= 80 ? 'text-neutral-900' : 'text-orange-600'
          )}>
            {completionRate}%
          </span>
        </div>

        {/* Cancelled */}
        {cancelledBookings > 0 && (
          <div className="flex justify-between items-center py-2 border-b border-neutral-100">
            <span className="text-neutral-600">Cancelled</span>
            <span className="font-semibold text-red-600">{cancelledBookings}</span>
          </div>
        )}

        {/* Rating */}
        <div className="flex justify-between items-center py-2 border-b border-neutral-100">
          <span className="text-neutral-600">Rating</span>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" fill="currentColor" />
            <span className="font-semibold text-neutral-900">
              {rating > 0 ? rating.toFixed(1) : '-'}
            </span>
            <span className="text-neutral-500 text-sm">({totalReviews} reviews)</span>
          </div>
        </div>

        {/* Money earned/paid */}
        {(type === 'artist' || type === 'provider') && totalEarned !== undefined && (
          <div className="flex justify-between items-center py-2 border-b border-neutral-100">
            <span className="text-neutral-600">Earned via Ziyawa</span>
            <span className="font-semibold text-neutral-900">{formatCurrency(totalEarned)}</span>
          </div>
        )}

        {type === 'organizer' && totalPaid !== undefined && (
          <div className="flex justify-between items-center py-2 border-b border-neutral-100">
            <span className="text-neutral-600">Paid to Artists</span>
            <span className="font-semibold text-neutral-900">{formatCurrency(totalPaid)}</span>
          </div>
        )}

        {/* Member since */}
        <div className="flex justify-between items-center py-2">
          <span className="text-neutral-600">Member Since</span>
          <span className="font-semibold text-neutral-900">{formatDate(memberSince)}</span>
        </div>
      </div>

      {/* Trust message */}
      {totalBookings >= 10 && completionRate >= 95 && (
        <div className="mt-6 p-3 bg-neutral-50 rounded-lg border border-neutral-100">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-black" />
            <span className="font-medium text-neutral-900">
              {type === 'artist' && 'This artist has NEVER cancelled a show'}
              {type === 'organizer' && 'This organizer ALWAYS pays on time'}
              {type === 'provider' && 'This provider has a perfect track record'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
