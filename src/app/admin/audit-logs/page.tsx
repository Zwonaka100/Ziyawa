'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Search, 
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Shield,
  Calendar,
  User,
  Settings,
  Mail
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type AuditLog = {
  id: string
  action: string
  entity_type: string
  entity_id: string
  details: Record<string, any>
  ip_address: string
  created_at: string
  admin: {
    full_name: string
    email: string
  } | null
}

const entityIcons: Record<string, any> = {
  user: User,
  event: Calendar,
  report: Shield,
  ticket: Mail,
  setting: Settings,
}

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  ban: 'bg-red-100 text-red-800',
  suspend: 'bg-orange-100 text-orange-800',
  warn: 'bg-yellow-100 text-yellow-800',
  publish: 'bg-green-100 text-green-800',
  unpublish: 'bg-gray-100 text-gray-800',
  email: 'bg-purple-100 text-purple-800',
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [entityFilter, setEntityFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 20

  const supabase = createClient()

  useEffect(() => {
    fetchLogs()
  }, [page, actionFilter, entityFilter])

  const fetchLogs = async () => {
    setLoading(true)
    
    let query = supabase
      .from('admin_audit_logs')
      .select(`
        *,
        admin:profiles!admin_audit_logs_admin_id_fkey(full_name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (actionFilter !== 'all') {
      query = query.ilike('action', `%${actionFilter}%`)
    }
    if (entityFilter !== 'all') {
      query = query.eq('entity_type', entityFilter)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching logs:', error)
    } else {
      setLogs(data || [])
      setTotalCount(count || 0)
    }
    setLoading(false)
  }

  const filteredLogs = logs.filter(log => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.entity_type.toLowerCase().includes(searchLower) ||
      log.admin?.full_name?.toLowerCase().includes(searchLower) ||
      log.admin?.email?.toLowerCase().includes(searchLower)
    )
  })

  const totalPages = Math.ceil(totalCount / pageSize)

  const getActionColor = (action: string) => {
    for (const [key, color] of Object.entries(actionColors)) {
      if (action.toLowerCase().includes(key)) {
        return color
      }
    }
    return 'bg-gray-100 text-gray-800'
  }

  const formatDetails = (details: Record<string, any>) => {
    if (!details) return null
    const entries = Object.entries(details).slice(0, 3)
    return entries.map(([key, value]) => (
      <span key={key} className="text-xs text-muted-foreground">
        {key}: {typeof value === 'object' ? JSON.stringify(value).slice(0, 50) : String(value).slice(0, 50)}
      </span>
    ))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Audit Logs</h2>
          <p className="text-muted-foreground">Track all admin actions on the platform</p>
        </div>
        <Button variant="outline" onClick={fetchLogs}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="ban">Ban</SelectItem>
                <SelectItem value="suspend">Suspend</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="publish">Publish</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="report">Report</SelectItem>
                <SelectItem value="ticket">Ticket</SelectItem>
                <SelectItem value="setting">Setting</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log ({totalCount} total)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => {
                const EntityIcon = entityIcons[log.entity_type] || Shield
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-neutral-50"
                  >
                    <div className="p-2 bg-neutral-100 rounded-lg">
                      <EntityIcon className="h-5 w-5 text-neutral-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getActionColor(log.action)}>
                          {log.action}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          on {log.entity_type}
                        </span>
                        {log.entity_id && (
                          <span className="text-xs font-mono bg-neutral-100 px-2 py-0.5 rounded">
                            {log.entity_id.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-col gap-0.5">
                        {formatDetails(log.details)}
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          By: {log.admin?.full_name || log.admin?.email || 'System'}
                        </span>
                        {log.ip_address && (
                          <span>IP: {log.ip_address}</span>
                        )}
                        <span>
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
