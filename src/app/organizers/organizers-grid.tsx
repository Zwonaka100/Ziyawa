'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Star, 
  MapPin, 
  Calendar, 
  Users,
  CheckCircle,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PROVINCES } from '@/lib/constants';

interface Organizer {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  location: string | null;
  company_name: string | null;
  bio: string | null;
  total_events_hosted: number;
  organizer_rating: number;
  total_organizer_reviews: number;
  payment_completion_rate: number;
  verified_at: string | null;
  upcoming_events: number;
}

interface OrganizersGridProps {
  organizers: Organizer[];
}

export function OrganizersGrid({ organizers }: OrganizersGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [sortBy, setSortBy] = useState<'events' | 'rating'>('events');

  // Filter organizers
  const filteredOrganizers = organizers.filter(o => {
    const matchesSearch = 
      (o.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       o.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesLocation = selectedLocation === 'all' || 
      o.location?.toLowerCase().includes(selectedLocation.toLowerCase());

    return (searchQuery === '' || matchesSearch) && matchesLocation;
  });

  // Sort organizers
  const sortedOrganizers = [...filteredOrganizers].sort((a, b) => {
    if (sortBy === 'events') {
      return b.total_events_hosted - a.total_events_hosted;
    }
    return b.organizer_rating - a.organizer_rating;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Search organizers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {Object.entries(PROVINCES).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'events' | 'rating')}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="events">Most Events</SelectItem>
            <SelectItem value="rating">Highest Rated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-neutral-500">
        {sortedOrganizers.length} organizer{sortedOrganizers.length !== 1 ? 's' : ''} found
      </p>

      {/* Grid */}
      {sortedOrganizers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedOrganizers.map((organizer) => (
            <Link key={organizer.id} href={`/organizers/${organizer.id}`}>
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-shadow h-full">
                {/* Header */}
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
                      {organizer.avatar_url ? (
                        <Image
                          src={organizer.avatar_url}
                          alt={organizer.company_name || organizer.full_name || ''}
                          width={64}
                          height={64}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Users className="h-8 w-8 text-neutral-300" />
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-neutral-900 truncate">
                          {organizer.company_name || organizer.full_name || 'Organizer'}
                        </h3>
                        {organizer.verified_at && (
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                      {organizer.location && (
                        <p className="text-sm text-neutral-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {organizer.location}
                        </p>
                      )}
                      {/* Rating */}
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium text-sm">
                          {organizer.organizer_rating > 0 ? organizer.organizer_rating.toFixed(1) : 'New'}
                        </span>
                        <span className="text-xs text-neutral-400">
                          ({organizer.total_organizer_reviews} reviews)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bio preview */}
                  {organizer.bio && (
                    <p className="text-sm text-neutral-600 mt-4 line-clamp-2">
                      {organizer.bio}
                    </p>
                  )}
                </div>

                {/* Stats footer */}
                <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-between text-sm">
                  <div className="flex items-center gap-1 text-neutral-600">
                    <Calendar className="h-4 w-4" />
                    <span>{organizer.total_events_hosted} events</span>
                  </div>
                  {organizer.upcoming_events > 0 && (
                    <span className="text-green-600 font-medium">
                      {organizer.upcoming_events} upcoming
                    </span>
                  )}
                  <div className="text-neutral-500">
                    {organizer.payment_completion_rate}% paid
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-neutral-200">
          <Users className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-1">No organizers found</h3>
          <p className="text-neutral-500">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
