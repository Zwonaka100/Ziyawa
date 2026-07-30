'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  MoreHorizontal,
  Eye,
  Loader2,
  Mic2,
  Globe,
  GlobeLock,
  PauseCircle,
  PlayCircle,
  Trash2,
} from 'lucide-react'

type ArtistAdminRow = {
  id: string
  profile_id: string
  stage_name: string
  genre: string
  location: string
  base_price: number
  is_available: boolean
  is_public: boolean
  total_bookings: number
  average_rating: number
  created_at: string
  profile?: {
    full_name: string | null
    email: string
    is_suspended: boolean
    is_banned: boolean
  } | null
}

export default function AdminArtistsPage() {
  const [artists, setArtists] = useState<ArtistAdminRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [availability, setAvailability] = useState('all')
  const [visibility, setVisibility] = useState('all')

  const fetchArtists = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      if (availability !== 'all') params.set('availability', availability)
      if (visibility !== 'all') params.set('visibility', visibility)

      const response = await fetch(`/api/admin/artists?${params.toString()}`)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load artists')
      }

      setArtists(payload.artists || [])
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to load artists')
      setArtists([])
    } finally {
      setLoading(false)
    }
  }, [availability, query, visibility])

  useEffect(() => {
    void fetchArtists()
  }, [fetchArtists])

  const updateArtist = async (artistId: string, body: { isPublic?: boolean; isAvailable?: boolean }) => {
    const response = await fetch(`/api/admin/artists/${artistId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to update artist profile')
    }
  }

  const handleTogglePublic = async (artist: ArtistAdminRow) => {
    try {
      await updateArtist(artist.id, { isPublic: !artist.is_public })
      toast.success(!artist.is_public ? 'Artist profile is now public' : 'Artist profile hidden from directory')
      await fetchArtists()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update visibility')
    }
  }

  const handleToggleAvailability = async (artist: ArtistAdminRow) => {
    try {
      await updateArtist(artist.id, { isAvailable: !artist.is_available })
      toast.success(!artist.is_available ? 'Artist bookings resumed' : 'Artist bookings paused')
      await fetchArtists()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update availability')
    }
  }

  const handleDelete = async (artist: ArtistAdminRow) => {
    const confirmed = window.confirm(
      `Remove ${artist.stage_name}'s artist profile? This will permanently remove their artist listing.`
    )

    if (!confirmed) return

    try {
      const response = await fetch(`/api/admin/artists/${artist.id}`, { method: 'DELETE' })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to remove artist profile')
      }

      toast.success('Artist profile removed')
      await fetchArtists()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove artist profile')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Artist Management</h2>
        <p className="text-muted-foreground">Manage artist discovery visibility, availability, and profile moderation.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by stage name, genre, name or email"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={availability} onValueChange={setAvailability}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Availability</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Visibility</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artist</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stats</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : artists.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No artist profiles found.
                  </TableCell>
                </TableRow>
              ) : (
                artists.map((artist) => (
                  <TableRow key={artist.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{artist.stage_name}</p>
                        <p className="text-sm text-muted-foreground">{artist.genre} • {artist.location}</p>
                        <p className="text-xs text-muted-foreground">{artist.profile?.full_name || 'No owner name'} • {artist.profile?.email || 'No email'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${artist.is_available ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {artist.is_available ? 'Available' : 'Paused'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${artist.is_public ? 'bg-blue-100 text-blue-700' : 'bg-neutral-200 text-neutral-700'}`}>
                          {artist.is_public ? 'Public' : 'Hidden'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{artist.total_bookings || 0} bookings</p>
                        <p className="text-muted-foreground">⭐ {Number(artist.average_rating || 0).toFixed(1)}</p>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(artist.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/artists/${artist.id}`}>
                              <Mic2 className="h-4 w-4 mr-2" />
                              View Public Profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/users/${artist.profile_id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View User Profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleTogglePublic(artist)}>
                            {artist.is_public ? <GlobeLock className="h-4 w-4 mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
                            {artist.is_public ? 'Hide from directory' : 'Show on directory'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleAvailability(artist)}>
                            {artist.is_available ? <PauseCircle className="h-4 w-4 mr-2" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                            {artist.is_available ? 'Pause bookings' : 'Resume bookings'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(artist)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove artist profile
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
