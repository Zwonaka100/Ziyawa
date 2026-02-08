'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Search, 
  MapPin, 
  Star, 
  Briefcase,
  Loader2,
  Users
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { 
  type PublicProvider, 
  type ServiceCategory, 
  type SaProvince,
  SERVICE_CATEGORY_LABELS 
} from '@/types/database'

// Province labels
const PROVINCE_LABELS: Record<SaProvince, string> = {
  gauteng: 'Gauteng',
  western_cape: 'Western Cape',
  kwazulu_natal: 'KwaZulu-Natal',
  eastern_cape: 'Eastern Cape',
  free_state: 'Free State',
  mpumalanga: 'Mpumalanga',
  limpopo: 'Limpopo',
  north_west: 'North West',
  northern_cape: 'Northern Cape',
}

// Category icons/colors
const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  sound_lighting: 'bg-yellow-100 text-yellow-700',
  staging_av: 'bg-blue-100 text-blue-700',
  event_staff: 'bg-green-100 text-green-700',
  venue_hire: 'bg-purple-100 text-purple-700',
  catering: 'bg-red-100 text-red-700',
  music_licensing: 'bg-indigo-100 text-indigo-700',
  photography_video: 'bg-pink-100 text-pink-700',
  decor_design: 'bg-orange-100 text-orange-700',
  transport: 'bg-cyan-100 text-cyan-700',
  mc_hosts: 'bg-emerald-100 text-emerald-700',
  equipment_rental: 'bg-slate-100 text-slate-700',
  marketing: 'bg-violet-100 text-violet-700',
  other: 'bg-gray-100 text-gray-700',
}

export default function CrewPage() {
  const [providers, setProviders] = useState<PublicProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all')
  const [selectedProvince, setSelectedProvince] = useState<SaProvince | 'all'>('all')

  useEffect(() => {
    fetchProviders()
  }, [selectedCategory, selectedProvince])

  const fetchProviders = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      let query = supabase
        .from('v_public_providers')
        .select('*')
        .eq('is_available', true)
        .order('completed_bookings', { ascending: false })

      if (selectedCategory !== 'all') {
        query = query.eq('primary_category', selectedCategory)
      }

      if (selectedProvince !== 'all') {
        query = query.eq('location', selectedProvince)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching providers:', error)
        // If view doesn't exist yet (migration not run), show empty
        setProviders([])
      } else {
        setProviders(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
      setProviders([])
    } finally {
      setLoading(false)
    }
  }

  // Filter by search query
  const filteredProviders = providers.filter(provider => 
    provider.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    provider.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const categories = Object.entries(SERVICE_CATEGORY_LABELS) as [ServiceCategory, string][]

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Find Your Crew</h1>
        <p className="text-muted-foreground text-lg">
          Discover service providers to make your event unforgettable
        </p>
      </div>

      {/* Search & Filters */}
      <div className="mb-8 space-y-4">
        {/* Search and Filter Row */}
        <div className="flex flex-col md:flex-row gap-4 max-w-4xl mx-auto">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Dropdown */}
          <Select 
            value={selectedCategory} 
            onValueChange={(v) => setSelectedCategory(v as ServiceCategory | 'all')}
          >
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Province Dropdown */}
          <Select 
            value={selectedProvince} 
            onValueChange={(v) => setSelectedProvince(v as SaProvince | 'all')}
          >
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="All Provinces" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Provinces</SelectItem>
              {Object.entries(PROVINCE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredProviders.length === 0 ? (
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No providers found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedCategory !== 'all' || selectedProvince !== 'all'
                ? 'Try adjusting your filters'
                : 'Be the first to join the crew!'}
            </p>
            <Link href="/profile">
              <Button>Become a Provider</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {filteredProviders.length} provider{filteredProviders.length !== 1 ? 's' : ''} found
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <Link key={provider.id} href={`/crew/${provider.id}`}>
                <Card className="hover:border-orange-500 transition-all hover:shadow-lg cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={provider.profile_image || undefined} />
                        <AvatarFallback className="text-xl bg-orange-100 text-orange-600">
                          {provider.business_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{provider.business_name}</CardTitle>
                        <Badge 
                          variant="outline" 
                          className={`mt-1 ${CATEGORY_COLORS[provider.primary_category]}`}
                        >
                          {SERVICE_CATEGORY_LABELS[provider.primary_category]}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {provider.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {provider.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {PROVINCE_LABELS[provider.location]}
                      </span>
                      
                      {provider.average_rating > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          {provider.average_rating.toFixed(1)}
                        </span>
                      )}
                      
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {provider.service_count} service{provider.service_count !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {provider.completed_bookings > 0 && (
                      <p className="text-xs text-green-600 mt-2">
                        {provider.completed_bookings} job{provider.completed_bookings !== 1 ? 's' : ''} completed
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
