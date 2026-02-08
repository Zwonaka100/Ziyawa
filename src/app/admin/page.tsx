import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  MessageSquare,
  TrendingUp,
  UserPlus,
  CalendarPlus
} from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Admin Dashboard | Ziyawa',
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Fetch all stats in parallel
  const [
    { count: totalUsers },
    { count: totalOrganizers },
    { count: totalArtists },
    { count: totalEvents },
    { count: publishedEvents },
    { count: pendingReports },
    { count: openTickets },
    { data: recentUsers },
    { data: recentEvents },
    { data: recentReports },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_organizer', true),
    supabase.from('artists').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('support_tickets').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
    supabase.from('profiles').select('id, full_name, email, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('events').select('id, title, created_at, is_published').order('created_at', { ascending: false }).limit(5),
    supabase.from('reports').select('id, reported_type, reason, status, created_at').order('created_at', { ascending: false }).limit(5),
  ])

  const stats = [
    { name: 'Total Users', value: totalUsers || 0, icon: Users, href: '/admin/users', color: 'text-blue-600' },
    { name: 'Organizers', value: totalOrganizers || 0, icon: Users, href: '/admin/users?role=organizer', color: 'text-purple-600' },
    { name: 'Artists', value: totalArtists || 0, icon: Users, href: '/admin/users?role=artist', color: 'text-pink-600' },
    { name: 'Total Events', value: totalEvents || 0, icon: Calendar, href: '/admin/events', color: 'text-green-600' },
    { name: 'Published Events', value: publishedEvents || 0, icon: Calendar, href: '/admin/events?status=published', color: 'text-emerald-600' },
    { name: 'Pending Reports', value: pendingReports || 0, icon: AlertTriangle, href: '/admin/reports', color: 'text-orange-600' },
    { name: 'Open Tickets', value: openTickets || 0, icon: MessageSquare, href: '/admin/support', color: 'text-yellow-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold">Welcome to Admin Dashboard</h2>
        <p className="text-muted-foreground">Here&apos;s what&apos;s happening on Ziyawa today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.name}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-10 w-10 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Recent Users</CardTitle>
            <UserPlus className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentUsers?.map((user) => (
                <Link 
                  key={user.id} 
                  href={`/admin/users/${user.id}`}
                  className="flex items-center justify-between py-2 hover:bg-neutral-50 rounded px-2 -mx-2"
                >
                  <div>
                    <p className="font-medium text-sm">{user.full_name || 'No name'}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </Link>
              ))}
              {(!recentUsers || recentUsers.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No users yet</p>
              )}
            </div>
            <Link 
              href="/admin/users"
              className="block text-center text-sm text-primary hover:underline mt-4"
            >
              View all users →
            </Link>
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Recent Events</CardTitle>
            <CalendarPlus className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentEvents?.map((event) => (
                <Link 
                  key={event.id} 
                  href={`/admin/events/${event.id}`}
                  className="flex items-center justify-between py-2 hover:bg-neutral-50 rounded px-2 -mx-2"
                >
                  <div>
                    <p className="font-medium text-sm line-clamp-1">{event.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      event.is_published 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {event.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.created_at).toLocaleDateString()}
                  </p>
                </Link>
              ))}
              {(!recentEvents || recentEvents.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No events yet</p>
              )}
            </div>
            <Link 
              href="/admin/events"
              className="block text-center text-sm text-primary hover:underline mt-4"
            >
              View all events →
            </Link>
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Recent Reports</CardTitle>
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentReports?.map((report) => (
                <Link 
                  key={report.id} 
                  href={`/admin/reports/${report.id}`}
                  className="flex items-center justify-between py-2 hover:bg-neutral-50 rounded px-2 -mx-2"
                >
                  <div>
                    <p className="font-medium text-sm capitalize">{report.reported_type} - {report.reason}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      report.status === 'pending' 
                        ? 'bg-orange-100 text-orange-700' 
                        : report.status === 'resolved'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-neutral-100 text-neutral-700'
                    }`}>
                      {report.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(report.created_at).toLocaleDateString()}
                  </p>
                </Link>
              ))}
              {(!recentReports || recentReports.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No reports yet</p>
              )}
            </div>
            <Link 
              href="/admin/reports"
              className="block text-center text-sm text-primary hover:underline mt-4"
            >
              View all reports →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/users">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
                Manage Users
              </button>
            </Link>
            <Link href="/admin/events">
              <button className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800">
                Manage Events
              </button>
            </Link>
            <Link href="/admin/reports?status=pending">
              <button className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700">
                Review Reports ({pendingReports || 0})
              </button>
            </Link>
            <Link href="/admin/support?status=open">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Open Tickets ({openTickets || 0})
              </button>
            </Link>
            <Link href="/admin/communications/send">
              <button className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-50">
                Send Email
              </button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
