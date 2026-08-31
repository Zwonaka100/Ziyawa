import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Ticket, Search, Shield, Star, CreditCard, Smartphone, Bell, Camera } from 'lucide-react'

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
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            For The Groovist
          </p>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Never Miss the Action</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Find the groove, grab your ticket, and pull up with the whole crew. Ziyawa keeps it simple —
            one place to see what&apos;s happening and get in the door.
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
                <h3 className="font-semibold mb-2">Find the Groove</h3>
                <p className="text-sm text-muted-foreground">
                  Filter by province, date, price or genre — or just ask Ziwaphi something like
                  &ldquo;amapiano in Joburg this weekend&rdquo; and let it do the digging.
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
                  Pay with your card via Paystack. Your money is held safely — if the event is cancelled, you get a full refund.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="h-6 w-6 text-neutral-700" />
                </div>
                <h3 className="font-semibold mb-2">Sort the Whole Crew</h3>
                <p className="text-sm text-muted-foreground">
                  Buy for everyone in one go and put each ticket in its owner&apos;s name. Everyone gets
                  their own QR code — no group chat admin at the door.
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
              { icon: Smartphone, title: 'Your Ticket Lives on Your Phone', desc: 'A QR code, straight after you pay. Show it at the door — nothing to print, nothing to lose.' },
              { icon: Bell, title: 'We Nudge You Before It Pops', desc: 'An email the day before and again on the day, so the one you were waiting for doesn\'t slip past you.' },
              { icon: Shield, title: 'Know Before You Book', desc: 'See the organizer\'s rating, reviews and past events before you spend a cent.' },
              { icon: Camera, title: 'See What Went Down', desc: 'Organizers post photos and clips after the event. Relive the one you were at — or see what you slept on.' },
              { icon: Ticket, title: 'All Your Tickets in One Place', desc: 'Every ticket, upcoming and past, sitting in your dashboard.' },
              { icon: Star, title: 'Rate & Review', desc: 'Tell everyone how it actually was. Help the next groovist pick right.' },
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
              { step: '1', title: 'Find the Groove', desc: 'Browse on Ziwaphi by location, genre or date — or just ask it what\'s happening.' },
              { step: '2', title: 'Grab Your Tickets', desc: 'Pick your ticket type, pay securely with your card via Paystack, and name each person you\'re buying for.' },
              { step: '3', title: 'Pull Up', desc: 'Show your QR code at the door. That\'s it — you\'re in.' },
              { step: '4', title: 'Relive It', desc: 'Rate the event, and check back for the photos and clips the organizer posts afterwards.' },
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
          <h2 className="text-2xl md:text-3xl font-bold mb-4">So, ziwaphi?</h2>
          <p className="text-neutral-400 max-w-xl mx-auto mb-8">
            Have a look at what&apos;s on. Creating an account is free.
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
