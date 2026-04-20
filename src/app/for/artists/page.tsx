'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Music, Globe, MessageSquare, CreditCard, Star, TrendingUp } from 'lucide-react'
import { PLATFORM_FEES } from '@/lib/constants'
import { useAuth } from '@/components/providers/auth-provider'

function ArtistEarningsCalculator() {
  const [bookingAmount, setBookingAmount] = useState(5000)

  const amountCents = bookingAmount * 100
  const tier = PLATFORM_FEES.artistBooking.tiers.find(t => amountCents <= t.maxAmount)
  const percent = tier?.percent || 10
  const commission = Math.round(amountCents * percent / 100) / 100
  const youReceive = bookingAmount - commission

  return (
    <Card className="border-2">
      <CardContent className="pt-6 space-y-6">
        <div>
          <Label htmlFor="booking-amount" className="text-base font-semibold">Booking Amount (R)</Label>
          <Input
            id="booking-amount"
            type="number"
            min={0}
            max={1000000}
            value={bookingAmount}
            onChange={(e) => setBookingAmount(Math.max(0, Number(e.target.value)))}
            className="mt-2 text-lg"
          />
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="font-semibold">Breakdown</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Booking Amount</span>
              <span>R{bookingAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform Commission ({percent}%)</span>
              <span className="text-red-600">-R{commission.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-base">
              <span>You Receive</span>
              <span className="text-green-600">R{youReceive.toFixed(2)}</span>
            </div>
          </div>

          <div className="pt-3 border-t">
            <h4 className="font-semibold text-sm mb-2">Commission Tiers</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Under R20,000 → 20% commission</p>
              <p>R20,000 – R100,000 → 15% commission</p>
              <p>Over R100,000 → 10% commission</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ForArtistsPage() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-20 md:py-28 bg-neutral-50">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Get Booked. Get Paid.</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Build your profile, showcase your music, and get discovered by event organizers across South Africa.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={user ? '/dashboard/artist' : '/auth/signup'}>
              <Button size="lg">{user ? 'Go to Dashboard' : 'Join as an Artist'}</Button>
            </Link>
            <Link href="/artists">
              <Button size="lg" variant="outline">Browse Artists</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Built for Artists</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: Globe, title: 'Public Profile', desc: 'Showcase your stage name, genre, bio, pricing, and social links. Organizers find you through the Artist Directory.' },
              { icon: Music, title: 'Media Gallery', desc: 'Upload promo photos and link your YouTube videos. Let your work speak for itself.' },
              { icon: MessageSquare, title: 'Direct Messaging', desc: 'Chat directly with organizers to discuss booking details, setlists, and logistics.' },
              { icon: CreditCard, title: 'Secure Payments', desc: 'The organizer pays upfront when they book you. Funds are held in escrow and released to your wallet after the event is complete. No chasing invoices.' },
              { icon: Star, title: 'Reviews & Ratings', desc: 'Build your reputation with verified reviews from organizers you\'ve worked with.' },
              { icon: TrendingUp, title: 'Grow Your Career', desc: 'The more you perform, the more reviews you earn. A strong profile helps organizers find and trust you.' },
            ].map((item) => (
              <Card key={item.title} className="border-0 shadow-sm">
                <CardContent className="pt-6 text-center">
                  <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <item.icon className="h-6 w-6 text-neutral-700" />
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Earnings Calculator */}
      <section className="py-16 md:py-20 bg-neutral-50">
        <div className="container mx-auto px-4 max-w-xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Earnings Calculator</h2>
          <p className="text-muted-foreground text-center mb-8">
            See exactly what you take home. Bigger bookings = lower commission.
          </p>
          <ArtistEarningsCalculator />
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="space-y-8">
            {[
              { step: '1', title: 'Create Your Profile', desc: 'Sign up and set up your artist profile with your stage name, genre, pricing, and media.' },
              { step: '2', title: 'Get Discovered', desc: 'Organizers browse the Artist Directory and find you based on genre, location, and reviews.' },
              { step: '3', title: 'Accept Bookings', desc: 'Receive booking requests, negotiate terms, and confirm. The organizer pays upfront — funds are held in escrow until the event is done.' },
              { step: '4', title: 'Perform & Get Paid', desc: 'Do your thing. After the event, both you and the organizer confirm completion, and your earnings release to your Ziyawa wallet.' },
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
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Get Booked?</h2>
          <p className="text-neutral-400 max-w-xl mx-auto mb-8">
            {user ? 'Set up your artist profile and start receiving booking requests.' : 'Create your artist profile and start receiving booking requests.'}
          </p>
          <Link href={user ? '/dashboard/artist' : '/auth/signup'}>
            <Button size="lg" variant="secondary">{user ? 'Go to Dashboard' : 'Join as an Artist'}</Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
