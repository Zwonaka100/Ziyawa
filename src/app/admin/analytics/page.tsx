import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  Calendar, 
  DollarSign,
  TrendingUp,
  MapPin,
  Star
} from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'

export const metadata = {
  title: 'Analytics | Admin | Ziyawa',
}

export default async function AdminAnalyticsPage() {
  const supabase = await createClient()

  // Fetch analytics data
  const [
    { count: totalUsers },
    { count: totalOrganizers },
    { count: totalArtists },
    { count: totalEvents },
    { count: publishedEvents },
    { count: completedEvents },
    { data: ticketsSold },
    { data: eventsByProvince },
    { data: topOrganizers },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_organizer', true),
    supabase.from('artists').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('state', 'completed'),
    supabase.from('tickets').select('id'),
    supabase.from('events').select('location'),
    supabase.from('profiles')
      .select('id, full_name, events_hosted')
      .eq('is_organizer', true)
      .order('events_hosted', { ascending: false })
      .limit(10),
  ])

  // Calculate province distribution
  const provinceCount: Record<string, number> = {}
  eventsByProvince?.forEach((e) => {
    const province = e.location || 'Unknown'
    provinceCount[province] = (provinceCount[province] || 0) + 1
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Analytics & Reports</h2>
        <p className="text-muted-foreground">Platform statistics and insights</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold">{totalUsers || 0}</p>
              </div>
              <Users className="h-10 w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Organizers</p>
                <p className="text-3xl font-bold">{totalOrganizers || 0}</p>
              </div>
              <Users className="h-10 w-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Artists</p>
                <p className="text-3xl font-bold">{totalArtists || 0}</p>
              </div>
              <Star className="h-10 w-10 text-pink-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tickets Sold</p>
                <p className="text-3xl font-bold">{ticketsSold?.length || 0}</p>
              </div>
              <DollarSign className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Stats */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Event Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
                <span>Total Events</span>
                <span className="font-bold">{totalEvents || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span>Published Events</span>
                <span className="font-bold text-green-600">{publishedEvents || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span>Completed Events</span>
                <span className="font-bold text-blue-600">{completedEvents || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <span>Draft Events</span>
                <span className="font-bold text-yellow-600">{(totalEvents || 0) - (publishedEvents || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Events by Province
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(provinceCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 9)
                .map(([province, count]) => (
                  <div key={province} className="flex items-center justify-between">
                    <span className="capitalize">{province.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-neutral-200 rounded-full h-2">
                        <div 
                          className="bg-primary rounded-full h-2" 
                          style={{ width: `${(count / (totalEvents || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="font-medium w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              {Object.keys(provinceCount).length === 0 && (
                <p className="text-muted-foreground text-center py-4">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Organizers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Organizers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topOrganizers?.map((organizer, index) => (
              <div key={organizer.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </span>
                  <span className="font-medium">{organizer.full_name || 'Unknown'}</span>
                </div>
                <span className="text-muted-foreground">
                  {organizer.events_hosted || 0} events
                </span>
              </div>
            ))}
            {(!topOrganizers || topOrganizers.length === 0) && (
              <p className="text-muted-foreground text-center py-4">No organizers yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
