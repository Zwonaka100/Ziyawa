'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PROVINCES } from '@/lib/constants'
import { X } from 'lucide-react'

interface EventsFilterProps {
  currentLocation?: string
  currentDate?: string
}

export function EventsFilter({ currentLocation, currentDate }: EventsFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    
    router.push(`/ziwaphi?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push('/ziwaphi')
  }

  const hasFilters = currentLocation || currentDate

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-8">
      {/* Location Filter */}
      <Select 
        value={currentLocation || 'all'} 
        onValueChange={(value) => updateFilter('location', value)}
      >
        <SelectTrigger className="w-full sm:w-[200px]">
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

      {/* Date Filter */}
      <Input
        id="event-date-filter"
        name="date"
        type="date"
        className="w-full sm:w-[200px]"
        value={currentDate || ''}
        onChange={(e) => updateFilter('date', e.target.value || null)}
        min={new Date().toISOString().split('T')[0]}
        autoComplete="off"
      />

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
