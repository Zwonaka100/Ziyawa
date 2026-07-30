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
  Briefcase,
  Globe,
  GlobeLock,
  PauseCircle,
  PlayCircle,
  Trash2,
} from 'lucide-react'

type CrewAdminRow = {
  id: string
  profile_id: string
  business_name: string
  primary_category: string
  work_mode: string | null
  location: string
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

function titleCase(value: string | null | undefined) {
  if (!value) return 'Not set'
  return value
    .split('_')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ')
}

export default function AdminCrewPage() {
  const [crew, setCrew] = useState<CrewAdminRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [availability, setAvailability] = useState('all')
  const [visibility, setVisibility] = useState('all')

  const fetchCrew = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      if (availability !== 'all') params.set('availability', availability)
      if (visibility !== 'all') params.set('visibility', visibility)

      const response = await fetch(`/api/admin/crew?${params.toString()}`)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load crew profiles')
      }

      setCrew(payload.crew || [])
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to load crew profiles')
      setCrew([])
    } finally {
      setLoading(false)
    }
  }, [availability, query, visibility])

  useEffect(() => {
    void fetchCrew()
  }, [fetchCrew])

  const updateCrew = async (crewId: string, body: { isPublic?: boolean; isAvailable?: boolean }) => {
    const response = await fetch(`/api/admin/crew/${crewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to update crew profile')
    }
  }

  const handleTogglePublic = async (row: CrewAdminRow) => {
    try {
      await updateCrew(row.id, { isPublic: !row.is_public })
      toast.success(!row.is_public ? 'Crew profile is now public' : 'Crew profile hidden from directory')
      await fetchCrew()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update visibility')
    }
  }

  const handleToggleAvailability = async (row: CrewAdminRow) => {
    try {
      await updateCrew(row.id, { isAvailable: !row.is_available })
      toast.success(!row.is_available ? 'Crew profile resumed' : 'Crew profile paused')
      await fetchCrew()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update availability')
    }
  }

  const handleDelete = async (row: CrewAdminRow) => {
    const confirmed = window.confirm(
      `Remove ${row.business_name}'s crew profile? This will permanently remove their crew listing.`
    )

    if (!confirmed) return

    try {
      const response = await fetch(`/api/admin/crew/${row.id}`, { method: 'DELETE' })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to remove crew profile')
      }

      toast.success('Crew profile removed')
      await fetchCrew()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove crew profile')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Crew Management</h2>
        <p className="text-muted-foreground">Manage crew and service provider discovery, visibility, and moderation.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by business name, category, owner or email"
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
                <TableHead>Crew Profile</TableHead>
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
              ) : crew.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No crew profiles found.
                  </TableCell>
                </TableRow>
              ) : (
                crew.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{row.business_name}</p>
                        <p className="text-sm text-muted-foreground">{titleCase(row.primary_category)} • {row.location}</p>
                        <p className="text-xs text-muted-foreground">{titleCase(row.work_mode)} • {row.profile?.email || 'No email'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${row.is_available ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {row.is_available ? 'Available' : 'Paused'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${row.is_public ? 'bg-blue-100 text-blue-700' : 'bg-neutral-200 text-neutral-700'}`}>
                          {row.is_public ? 'Public' : 'Hidden'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{row.total_bookings || 0} bookings</p>
                        <p className="text-muted-foreground">⭐ {Number(row.average_rating || 0).toFixed(1)}</p>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(row.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/crew/${row.id}`}>
                              <Briefcase className="h-4 w-4 mr-2" />
                              View Public Profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/users/${row.profile_id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View User Profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleTogglePublic(row)}>
                            {row.is_public ? <GlobeLock className="h-4 w-4 mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
                            {row.is_public ? 'Hide from directory' : 'Show on directory'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleAvailability(row)}>
                            {row.is_available ? <PauseCircle className="h-4 w-4 mr-2" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                            {row.is_available ? 'Pause bookings' : 'Resume bookings'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(row)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove crew profile
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
