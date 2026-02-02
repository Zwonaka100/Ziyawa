import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Music, Users, Ticket } from 'lucide-react'
import { TypewriterHero } from '@/components/home/typewriter-hero'

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 bg-gradient-to-br from-primary/10 via-background to-background">
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

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How Ziyawa Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">For Organizers</h3>
                <p className="text-muted-foreground">
                  Create events, book artists, and manage everything in one place. 
                  Reach thousands of groovists across South Africa.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Music className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">For Artists</h3>
                <p className="text-muted-foreground">
                  Showcase your talent, get discovered, and accept bookings. 
                  Set your rates and grow your career.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Ticket className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">For Groovists</h3>
                <p className="text-muted-foreground">
                  Discover events near you, buy tickets, and never miss the action. 
                  Ziwaphi? We&apos;ll tell you!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-muted/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Join the Movement?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Whether you&apos;re an event organizer, an artist, or someone who loves a good groove – 
            Ziyawa is your home.
          </p>
          <Link href="/auth/signup">
            <Button size="lg">
              Get Started for Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-primary">100+</p>
              <p className="text-muted-foreground">Events</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-primary">50+</p>
              <p className="text-muted-foreground">Artists</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-primary">9</p>
              <p className="text-muted-foreground">Provinces</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-primary">1000s</p>
              <p className="text-muted-foreground">Groovists</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
