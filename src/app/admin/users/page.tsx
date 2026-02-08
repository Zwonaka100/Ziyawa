'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Edit, 
  Ban, 
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  Mail,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface User {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: string
  is_organizer: boolean
  is_admin: boolean
  admin_role: string | null
  is_suspended: boolean
  is_banned: boolean
  is_verified: boolean
  created_at: string
}

const ITEMS_PER_PAGE = 20

export default function AdminUsersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || 'all')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    fetchUsers()
  }, [page, roleFilter, statusFilter])

  const fetchUsers = async () => {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply role filter
    if (roleFilter === 'organizer') {
      query = query.eq('is_organizer', true)
    } else if (roleFilter === 'admin') {
      query = query.eq('is_admin', true)
    } else if (roleFilter === 'user') {
      query = query.eq('is_organizer', false).eq('is_admin', false)
    }

    // Apply status filter
    if (statusFilter === 'suspended') {
      query = query.eq('is_suspended', true)
    } else if (statusFilter === 'banned') {
      query = query.eq('is_banned', true)
    } else if (statusFilter === 'active') {
      query = query.eq('is_suspended', false).eq('is_banned', false)
    }

    // Apply search
    if (searchQuery) {
      query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
    }

    // Pagination
    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      toast.error('Failed to fetch users')
      console.error(error)
    } else {
      setUsers(data || [])
      setTotalCount(count || 0)
    }

    setLoading(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchUsers()
  }

  const handleSuspendUser = async (userId: string, suspend: boolean) => {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('profiles')
      .update({
        is_suspended: suspend,
        suspended_at: suspend ? new Date().toISOString() : null,
      })
      .eq('id', userId)

    if (error) {
      toast.error('Failed to update user')
    } else {
      toast.success(suspend ? 'User suspended' : 'User unsuspended')
      fetchUsers()
    }
  }

  const handleBanUser = async (userId: string, ban: boolean) => {
    if (ban && !confirm('Are you sure you want to permanently ban this user?')) {
      return
    }

    const supabase = createClient()
    
    const { error } = await supabase
      .from('profiles')
      .update({
        is_banned: ban,
        banned_at: ban ? new Date().toISOString() : null,
      })
      .eq('id', userId)

    if (error) {
      toast.error('Failed to update user')
    } else {
      toast.success(ban ? 'User banned' : 'User unbanned')
      fetchUsers()
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">Manage all platform users</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="organizer">Organizers</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span className="text-sm font-medium">
                              {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.is_admin && (
                          <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                            {user.admin_role || 'Admin'}
                          </span>
                        )}
                        {user.is_organizer && (
                          <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                            Organizer
                          </span>
                        )}
                        {!user.is_admin && !user.is_organizer && (
                          <span className="px-2 py-0.5 rounded text-xs bg-neutral-100 text-neutral-700">
                            User
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.is_banned ? (
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-4 w-4" />
                          Banned
                        </span>
                      ) : user.is_suspended ? (
                        <span className="flex items-center gap-1 text-orange-600">
                          <AlertTriangle className="h-4 w-4" />
                          Suspended
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          Active
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/users/${user.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/users/${user.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit User
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/communications/send?to=${user.id}`}>
                              <Mail className="h-4 w-4 mr-2" />
                              Send Email
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {!user.is_banned && (
                            <>
                              {user.is_suspended ? (
                                <DropdownMenuItem onClick={() => handleSuspendUser(user.id, false)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Unsuspend
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  onClick={() => handleSuspendUser(user.id, true)}
                                  className="text-orange-600"
                                >
                                  <AlertTriangle className="h-4 w-4 mr-2" />
                                  Suspend
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                          {user.is_banned ? (
                            <DropdownMenuItem onClick={() => handleBanUser(user.id, false)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Unban
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              onClick={() => handleBanUser(user.id, true)}
                              className="text-red-600"
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Ban User
                            </DropdownMenuItem>
                          )}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, totalCount)} of {totalCount} users
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
