import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft, 
  Mail, 
  Calendar, 
  MapPin, 
  Shield, 
  AlertTriangle,
  Ban,
  Edit,
  Eye,
  Ticket,
  Star,
  DollarSign
} from 'lucide-react'
import { format } from 'date-fns'
import { UserActions } from './user-actions'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch user details
  const { data: user, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !user) {
    notFound()
  }

  // Fetch related data in parallel
  const [
    { data: events },
    { data: tickets },
    { data: warnings },
    { data: reports },
    { data: artistProfile },
  ] = await Promise.all([
    supabase.from('events').select('id, title, event_date, is_published').eq('organizer_id', id).order('created_at', { ascending: false }).limit(10),
    supabase.from('tickets').select('id, event_id, created_at, events(title)').eq('user_id', id).order('created_at', { ascending: false }).limit(10),
    supabase.from('user_warnings').select('*').eq('user_id', id).order('created_at', { ascending: false }),
    supabase.from('reports').select('*').eq('reported_id', id).order('created_at', { ascending: false }),
    supabase.from('artists').select('*').eq('profile_id', id).single(),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/users">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold">{user.full_name || 'No name'}</h2>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/users/${id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit User
            </Button>
          </Link>
          <Link href={`/admin/communications/send?to=${id}`}>
            <Button>
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Info Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 rounded-full bg-neutral-200 flex items-center justify-center text-3xl font-bold">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  user.full_name?.charAt(0) || user.email?.charAt(0) || '?'
                )}
              </div>
              <div className="flex-1 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{user.full_name || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{user.phone || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{user.location || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Joined</p>
                  <p className="font-medium">{format(new Date(user.created_at), 'PPP')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium">{format(new Date(user.updated_at), 'PPP')}</p>
                </div>
              </div>
            </div>

            {/* Roles & Status */}
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-medium mb-3">Roles & Status</h4>
              <div className="flex flex-wrap gap-2">
                {user.is_admin && (
                  <span className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-700 flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {user.admin_role || 'Admin'}
                  </span>
                )}
                {user.is_organizer && (
                  <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
                    Organizer
                  </span>
                )}
                {artistProfile && (
                  <span className="px-3 py-1 rounded-full text-sm bg-pink-100 text-pink-700">
                    Artist
                  </span>
                )}
                {user.is_verified && (
                  <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
                    Verified
                  </span>
                )}
                {user.is_suspended && (
                  <span className="px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-700 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Suspended
                  </span>
                )}
                {user.is_banned && (
                  <span className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-700 flex items-center gap-1">
                    <Ban className="h-3 w-3" />
                    Banned
                  </span>
                )}
              </div>
            </div>

            {/* Bio */}
            {user.bio && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium mb-2">Bio</h4>
                <p className="text-muted-foreground">{user.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <UserActions user={user} />
          </CardContent>
        </Card>
      </div>

      {/* Events (if organizer) */}
      {user.is_organizer && events && events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Events ({events.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.event_date), 'PPP')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      event.is_published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {event.is_published ? 'Published' : 'Draft'}
                    </span>
                    <Link href={`/admin/events/${event.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tickets */}
      {tickets && tickets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ticket Purchases ({tickets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tickets.map((ticket: any) => (
                <div key={ticket.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <div>
                    <p className="font-medium">{ticket.events?.title || 'Unknown Event'}</p>
                    <p className="text-sm text-muted-foreground">
                      Purchased {format(new Date(ticket.created_at), 'PPP')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">Warnings ({warnings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {warnings.map((warning: any) => (
                <div key={warning.id} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      warning.severity === 'severe' ? 'bg-red-100 text-red-700' :
                      warning.severity === 'moderate' ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {warning.severity}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(warning.created_at), 'PPP')}
                    </span>
                  </div>
                  <p className="font-medium">{warning.reason}</p>
                  {warning.description && (
                    <p className="text-sm text-muted-foreground mt-1">{warning.description}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports against user */}
      {reports && reports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Reports Against User ({reports.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reports.map((report: any) => (
                <Link key={report.id} href={`/admin/reports/${report.id}`}>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="capitalize font-medium">{report.reason}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        report.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                        report.status === 'resolved' ? 'bg-green-100 text-green-700' :
                        'bg-neutral-100 text-neutral-700'
                      }`}>
                        {report.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{report.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
