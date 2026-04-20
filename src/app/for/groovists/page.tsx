import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Ticket, Search, Shield, Star, CreditCard, Smartphone } from 'lucide-react'

export const metadata: Metadata = {
  title: 'For Groovists',
  description: 'Find events, buy tickets securely, and never miss the action. Ziyawa makes it easy to discover what\'s happening near you across South Africa.',
}

export default function ForGroovistsPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-20 md:py-28 bg-neutral-50">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Never Miss the Action</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Find events near you, buy tickets securely, and keep up with South Africa&apos;s vibrant entertainment scene — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/ziwaphi">
              <Button size="lg">Browse Events</Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="lg" variant="outline">Create Free Account</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">What You Get</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-6 w-6 text-neutral-700" />
                </div>
                <h3 className="font-semibold mb-2">Discover Events</h3>
                <p className="text-sm text-muted-foreground">
                  Search by province, date, price range, or keyword. Filter for exactly what you&apos;re looking for.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="h-6 w-6 text-neutral-700" />
                </div>
                <h3 className="font-semibold mb-2">Secure Payments</h3>
                <p className="text-sm text-muted-foreground">
                  Pay with your card via Paystack. Your money is held in escrow — if the event is cancelled, you get a full refund.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="h-6 w-6 text-neutral-700" />
                </div>
                <h3 className="font-semibold mb-2">Digital Tickets</h3>
                <p className="text-sm text-muted-foreground">
                  Get your ticket with a unique QR code. Show it at the door — no printing needed.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* More Features */}
      <section className="py-16 md:py-20 bg-neutral-50">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Why Groovists Love Ziyawa</h2>
          <div className="space-y-6">
            {[
              { icon: Shield, title: 'Verified Organizers', desc: 'See real reviews and track records before you buy. Know who you\'re supporting.' },
              { icon: Star, title: 'Rate & Review', desc: 'After the event, share your experience. Help the community find great events.' },
              { icon: Ticket, title: 'All Your Tickets in One Place', desc: 'Access all your upcoming and past tickets from your dashboard. Never lose a ticket again.' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4">
                <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-5 w-5 text-neutral-700" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="space-y-8">
            {[
              { step: '1', title: 'Find an Event', desc: 'Use Ziwaphi to browse events by location, genre, or date.' },
              { step: '2', title: 'Buy Your Ticket', desc: 'Select your ticket type, pay securely with Paystack, and get your digital ticket instantly.' },
              { step: '3', title: 'Show Up & Enjoy', desc: 'Show your QR code at the door. That\'s it — you\'re in.' },
              { step: '4', title: 'Leave a Review', desc: 'After the event, rate the experience and help fellow groovists find great events.' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="w-8 h-8 bg-neutral-900 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-neutral-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Find Your Next Event?</h2>
          <p className="text-neutral-400 max-w-xl mx-auto mb-8">
            Join groovists discovering events across South Africa.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/ziwaphi">
              <Button size="lg" variant="secondary">Browse Events</Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="lg" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-black">
                Sign Up Free
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
