'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Search, 
  MapPin, 
  Calendar as CalendarIcon, 
  Filter, 
  X,
  SlidersHorizontal
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// South African provinces
const SA_PROVINCES = [
  { value: 'gauteng', label: 'Gauteng' },
  { value: 'western_cape', label: 'Western Cape' },
  { value: 'kwazulu_natal', label: 'KwaZulu-Natal' },
  { value: 'eastern_cape', label: 'Eastern Cape' },
  { value: 'free_state', label: 'Free State' },
  { value: 'limpopo', label: 'Limpopo' },
  { value: 'mpumalanga', label: 'Mpumalanga' },
  { value: 'north_west', label: 'North West' },
  { value: 'northern_cape', label: 'Northern Cape' },
];

const SORT_OPTIONS = [
  { value: 'date', label: 'Date (Soonest)' },
  { value: 'price-low', label: 'Price (Low to High)' },
  { value: 'price-high', label: 'Price (High to Low)' },
  { value: 'popular', label: 'Most Popular' },
];

interface SearchFiltersProps {
  onSearch?: (filters: SearchFilters) => void;
  className?: string;
  compact?: boolean;
}

export interface SearchFilters {
  q: string;
  location: string;
  dateFrom: string;
  dateTo: string;
  priceMin: string;
  priceMax: string;
  isFree: boolean;
  sortBy: string;
}

export function SearchFilters({ onSearch, className, compact = false }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize from URL params
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined
  );
  const [priceMin, setPriceMin] = useState(searchParams.get('priceMin') || '');
  const [priceMax, setPriceMax] = useState(searchParams.get('priceMax') || '');
  const [isFree, setIsFree] = useState(searchParams.get('isFree') === 'true');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'date');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Build URL with filters
  const buildSearchParams = () => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (location) params.set('location', location);
    if (dateFrom) params.set('dateFrom', format(dateFrom, 'yyyy-MM-dd'));
    if (dateTo) params.set('dateTo', format(dateTo, 'yyyy-MM-dd'));
    if (priceMin && !isFree) params.set('priceMin', priceMin);
    if (priceMax && !isFree) params.set('priceMax', priceMax);
    if (isFree) params.set('isFree', 'true');
    if (sortBy && sortBy !== 'date') params.set('sortBy', sortBy);
    return params.toString();
  };

  const handleSearch = () => {
    const params = buildSearchParams();
    router.push(`/ziwaphi${params ? '?' + params : ''}`);
    
    if (onSearch) {
      onSearch({
        q: query,
        location,
        dateFrom: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : '',
        dateTo: dateTo ? format(dateTo, 'yyyy-MM-dd') : '',
        priceMin: isFree ? '' : priceMin,
        priceMax: isFree ? '' : priceMax,
        isFree,
        sortBy,
      });
    }
  };

  const clearFilters = () => {
    setQuery('');
    setLocation('');
    setDateFrom(undefined);
    setDateTo(undefined);
    setPriceMin('');
    setPriceMax('');
    setIsFree(false);
    setSortBy('date');
    router.push('/ziwaphi');
  };

  const hasActiveFilters = query || location || dateFrom || dateTo || priceMin || priceMax || isFree || sortBy !== 'date';

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch} size="sm">
          Search
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search by event name, venue, or description..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 h-12 text-lg"
          />
        </div>
        
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger className="w-full sm:w-[200px] h-12">
            <MapPin className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Provinces" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Provinces</SelectItem>
            {SA_PROVINCES.map((province) => (
              <SelectItem key={province.value} value={province.value}>
                {province.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleSearch} className="h-12 px-8">
          <Search className="h-5 w-5 mr-2" />
          Search
        </Button>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-muted-foreground"
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          {showAdvanced ? 'Hide Filters' : 'More Filters'}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg border">
          {/* Date Range */}
          <div className="space-y-2">
            <Label>From Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  disabled={(date: Date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>To Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  disabled={(date: Date) => date < (dateFrom || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <Label>Price Range (R)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                disabled={isFree}
                className="w-full"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Max"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                disabled={isFree}
                className="w-full"
              />
            </div>
          </div>

          {/* Sort By */}
          <div className="space-y-2">
            <Label>Sort By</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Free Events Checkbox */}
          <div className="flex items-center space-x-2 sm:col-span-2 lg:col-span-4">
            <Checkbox
              id="free-events"
              checked={isFree}
              onCheckedChange={(checked) => setIsFree(checked === true)}
            />
            <label
              htmlFor="free-events"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Show only free events
            </label>
          </div>
        </div>
      )}

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {query && (
            <FilterTag label={`"${query}"`} onRemove={() => setQuery('')} />
          )}
          {location && (
            <FilterTag 
              label={SA_PROVINCES.find(p => p.value === location)?.label || location} 
              onRemove={() => setLocation('')} 
            />
          )}
          {dateFrom && (
            <FilterTag 
              label={`From: ${format(dateFrom, 'MMM d')}`} 
              onRemove={() => setDateFrom(undefined)} 
            />
          )}
          {dateTo && (
            <FilterTag 
              label={`To: ${format(dateTo, 'MMM d')}`} 
              onRemove={() => setDateTo(undefined)} 
            />
          )}
          {isFree && (
            <FilterTag label="Free Events" onRemove={() => setIsFree(false)} />
          )}
          {!isFree && (priceMin || priceMax) && (
            <FilterTag 
              label={`R${priceMin || '0'} - R${priceMax || '∞'}`} 
              onRemove={() => { setPriceMin(''); setPriceMax(''); }} 
            />
          )}
        </div>
      )}
    </div>
  );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-full text-sm">
      {label}
      <button
        onClick={onRemove}
        className="ml-1 hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

export default SearchFilters;
