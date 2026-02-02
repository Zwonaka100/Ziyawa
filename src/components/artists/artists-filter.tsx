'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { PROVINCES, GENRES } from '@/lib/constants'
import { X } from 'lucide-react'

interface ArtistsFilterProps {
  currentGenre?: string
  currentLocation?: string
}

export function ArtistsFilter({ currentGenre, currentLocation }: ArtistsFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    
    router.push(`/artists?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push('/artists')
  }

  const hasFilters = currentGenre || currentLocation

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-8">
      {/* Genre Filter */}
      <Select 
        value={currentGenre || 'all'} 
        onValueChange={(value) => updateFilter('genre', value)}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All Genres" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Genres</SelectItem>
          {GENRES.map((genre) => (
            <SelectItem key={genre} value={genre}>
              {genre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Location Filter */}
      <Select 
        value={currentLocation || 'all'} 
        onValueChange={(value) => updateFilter('location', value)}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All Locations" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Provinces</SelectItem>
          {Object.entries(PROVINCES).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  )
}
