import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Music, Users, Ticket, ArrowRight, MapPin, Wrench, Star, Shield, CreditCard } from 'lucide-react'
import { TypewriterHero } from '@/components/home/typewriter-hero'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatCurrency } from '@/lib/helpers'
import Image from 'next/image'

export default async function HomePage() {
  const supabase = await createClient()

  // Fetch upcoming events (limit 6) - check both state and is_published for compatibility
  const { data: events } = await supabase
    .from('events')
    .select(`
      id,
      title,
      event_date,
      venue,
      location,
      ticket_price,
      cover_image,
      profiles:organizer_id (
        full_name
      )
    `)
    .or('state.in.(published,locked),is_published.eq.true')
    .gte('event_date', new Date().toISOString().split('T')[0])
    .order('event_date', { ascending: true })
    .limit(6)

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 bg-neutral-50">
        <div className="container mx-auto px-4 text-center">
          <TypewriterHero />
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link href="/ziwaphi">
              <Button size="lg" className="w-full sm:w-auto">
                <Calendar className="mr-2 h-5 w-5" />
                Find Events
              </Button>
            </Link>
            <Link href="/artists">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                <Music className="mr-2 h-5 w-5" />
                Browse Artists
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Upcoming Events Section */}
      {events && events.length > 0 && (
        <section className="py-16 md:py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-bold">Upcoming Events</h2>
              <Link href="/ziwaphi" className="text-sm font-medium flex items-center gap-1 hover:underline">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                    <div className="aspect-[16/9] relative bg-neutral-100">
                      {event.cover_image ? (
                        <Image
                          src={event.cover_image}
                          alt={event.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Calendar className="h-12 w-12 text-neutral-300" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded text-sm font-medium">
                        {event.ticket_price === 0 ? 'FREE' : formatCurrency(event.ticket_price)}
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg line-clamp-1">{event.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDate(event.event_date)}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {event.venue}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {events.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No upcoming events yet. Be the first to create one!</p>
                <Link href="/dashboard/organizer/events/new">
                  <Button className="mt-4">Create Event</Button>
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* How Ziyawa Works Section */}
      <section className="py-16 md:py-20 bg-neutral-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">How Ziyawa Works</h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            A platform connecting South Africa&apos;s event ecosystem - organizers, artists, vendors, and fans.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Organizers</h3>
                <p className="text-sm text-muted-foreground">
                  Create events, sell tickets, book artists and vendors. Manage everything from one dashboard.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center mb-4">
                  <Music className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Artists</h3>
                <p className="text-sm text-muted-foreground">
                  Build your profile, showcase your work, and get booked by organizers across SA.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center mb-4">
                  <Wrench className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Crew & Vendors</h3>
                <p className="text-sm text-muted-foreground">
                  Sound, lighting, catering, security - list your services and get hired for events.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center mb-4">
                  <Ticket className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Groovists</h3>
                <p className="text-sm text-muted-foreground">
                  Find events near you, buy tickets securely, and never miss the action.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Why Ziyawa?</h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-neutral-700" />
              </div>
              <h3 className="font-semibold mb-2">Trust & Transparency</h3>
              <p className="text-sm text-muted-foreground">
                Verified organizers, reviews from real attendees, and clear track records.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-6 w-6 text-neutral-700" />
              </div>
              <h3 className="font-semibold mb-2">Secure Payments</h3>
              <p className="text-sm text-muted-foreground">
                Powered by Paystack. Your money is safe - artists and vendors get paid on time.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-6 w-6 text-neutral-700" />
              </div>
              <h3 className="font-semibold mb-2">Built for SA</h3>
              <p className="text-sm text-muted-foreground">
                Made for South African events - from Amapiano sessions to jazz festivals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-neutral-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-neutral-400 max-w-xl mx-auto mb-8">
            Join Ziyawa today - whether you&apos;re hosting events, performing, providing services, or just looking for a good time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" variant="secondary">
                Create Free Account
              </Button>
            </Link>
            <Link href="/ziwaphi">
              <Button size="lg" variant="outline" className="border-neutral-600 text-white hover:bg-neutral-800">
                Browse Events
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Coverage Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Across All 9 Provinces</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            From Johannesburg to Cape Town, Durban to Pretoria - find and create events anywhere in South Africa.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            {['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape'].map((province) => (
              <span key={province} className="px-4 py-2 bg-neutral-100 rounded-full text-neutral-700">
                {province}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
