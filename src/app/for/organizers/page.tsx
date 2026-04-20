'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Calendar, Users, BarChart3, CreditCard, Shield, Ticket } from 'lucide-react'
import { PLATFORM_FEES } from '@/lib/constants'
import { useAuth } from '@/components/providers/auth-provider'

function TicketFeeCalculator() {
  const [ticketPrice, setTicketPrice] = useState(150)
  const [ticketsSold, setTicketsSold] = useState(200)

  const priceCents = ticketPrice * 100
  const commissionPercent = PLATFORM_FEES.ticketing.commissionPercent
  const platformFeePercent = PLATFORM_FEES.ticketing.platformFeePercent
  const commission = Math.round(priceCents * commissionPercent / 100) / 100
  const platformFee = Math.round(priceCents * platformFeePercent / 100) / 100
  const totalFeesPerTicket = commission + platformFee
  const youReceivePerTicket = ticketPrice - totalFeesPerTicket

  const bookingFeeTier = PLATFORM_FEES.ticketing.bookingFeeTiers.find(
    t => priceCents <= t.maxPrice
  )
  const bookingFee = (bookingFeeTier?.fee || 1000) / 100
  const buyerPays = ticketPrice + bookingFee

  const totalRevenue = ticketPrice * ticketsSold
  const totalFees = totalFeesPerTicket * ticketsSold
  const totalEarnings = youReceivePerTicket * ticketsSold

  return (
    <Card className="border-2">
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ticket-price" className="text-base font-semibold">Ticket Price (R)</Label>
            <Input
              id="ticket-price"
              type="number"
              min={0}
              max={100000}
              value={ticketPrice}
              onChange={(e) => setTicketPrice(Math.max(0, Number(e.target.value)))}
              className="mt-2 text-lg"
            />
          </div>
          <div>
            <Label htmlFor="tickets-sold" className="text-base font-semibold">Tickets Sold</Label>
            <Input
              id="tickets-sold"
              type="number"
              min={1}
              max={100000}
              value={ticketsSold}
              onChange={(e) => setTicketsSold(Math.max(1, Number(e.target.value)))}
              className="mt-2 text-lg"
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="font-semibold">Per Ticket</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ticket Price</span>
              <span>R{ticketPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Commission ({commissionPercent}%)</span>
              <span className="text-red-600">-R{commission.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform Fee ({platformFeePercent}%)</span>
              <span className="text-red-600">-R{platformFee.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>You Receive Per Ticket</span>
              <span className="text-green-600">R{youReceivePerTicket.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 bg-neutral-50 rounded-lg p-4">
          <h4 className="font-semibold">Total Earnings ({ticketsSold} tickets)</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross Revenue</span>
              <span>R{totalRevenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Fees ({commissionPercent + platformFeePercent}%)</span>
              <span className="text-red-600">-R{totalFees.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>You Take Home</span>
              <span className="text-green-600">R{totalEarnings.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Booking Fee (paid by buyer)</span>
            <span>R{bookingFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-medium mt-1">
            <span className="text-muted-foreground">Buyer Pays Per Ticket</span>
            <span>R{buyerPays.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ForOrganizersPage() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-20 md:py-28 bg-neutral-50">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Host Events That Matter</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Create events, sell tickets, book artists and vendors — all from one dashboard. Ziyawa handles payments so you can focus on the experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={user ? '/dashboard/organizer' : '/auth/signup'}>
              <Button size="lg">{user ? 'Go to Dashboard' : 'Start Organizing'}</Button>
            </Link>
            <Link href="/ziwaphi">
              <Button size="lg" variant="outline">See Live Events</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Everything You Need</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: Calendar, title: 'Event Management', desc: 'Create, publish, and manage events with multiple ticket tiers, media galleries, and promo videos.' },
              { icon: Users, title: 'Book Talent & Services', desc: 'Find and book artists, DJs, sound engineers, caterers, and more. You pay upfront, funds are held in escrow, and only released to them after the event is complete.' },
              { icon: BarChart3, title: 'Organizer Dashboard', desc: 'Track ticket sales, revenue, bookings, and check-ins. Everything in one place.' },
              { icon: Ticket, title: 'Ticket Tiers', desc: 'Create Early Bird, VIP, General, and custom tiers with different pricing and capacities.' },
              { icon: CreditCard, title: 'Secure Payouts', desc: 'Ticket revenue is held in escrow and released to your wallet 48 hours after event completion. Booking payments you make to artists and crew are also held until the event is done — everyone gets paid safely.' },
              { icon: Shield, title: 'Build Your Reputation', desc: 'Verified badge, attendee reviews, and a public track record that grows with every event.' },
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

      {/* Fee Calculator */}
      <section className="py-16 md:py-20 bg-neutral-50">
        <div className="container mx-auto px-4 max-w-xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Fee Calculator</h2>
          <p className="text-muted-foreground text-center mb-8">
            See exactly what you earn per ticket. No hidden fees.
          </p>
          <TicketFeeCalculator />
          <p className="text-xs text-muted-foreground text-center mt-4">
            Booking fee is paid by the buyer and not deducted from your earnings.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="space-y-8">
            {[
              { step: '1', title: 'Create Your Event', desc: 'Add event details, set ticket tiers, upload cover art and gallery images.' },
              { step: '2', title: 'Book Your Lineup', desc: 'Browse artists and crew, send booking requests, and pay upfront. Funds are held in escrow until after the event — so everyone is protected.' },
              { step: '3', title: 'Publish & Sell', desc: 'Go live on Ziwaphi. Share your event link and watch tickets sell.' },
              { step: '4', title: 'Host & Get Paid', desc: 'Check in attendees with QR codes. After the event, confirm completion — your ticket revenue releases to your wallet, and booking payments release to your artists and crew.' },
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
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Host Your First Event?</h2>
          <p className="text-neutral-400 max-w-xl mx-auto mb-8">
            {user ? 'Head to your dashboard to create your next event.' : 'Sign up for free and create your first event in minutes.'}
          </p>
          <Link href={user ? '/dashboard/organizer/events/new' : '/auth/signup'}>
            <Button size="lg" variant="secondary">{user ? 'Create Event' : 'Get Started Free'}</Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
