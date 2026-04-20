'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Wrench, Globe, MessageSquare, CreditCard, Star, Camera, Volume2, Utensils, Shield, UserPlus, ClipboardList, Briefcase } from 'lucide-react'
import { PLATFORM_FEES } from '@/lib/constants'
import { useAuth } from '@/components/providers/auth-provider'

function ServiceEarningsCalculator() {
  const [serviceAmount, setServiceAmount] = useState(8000)

  const amountCents = serviceAmount * 100
  const tier = PLATFORM_FEES.vendorBooking.tiers.find(t => amountCents <= t.maxAmount)
  const percent = tier?.percent || 5
  const commission = Math.round(amountCents * percent / 100) / 100
  const youReceive = serviceAmount - commission

  return (
    <Card className="border-2">
      <CardContent className="pt-6 space-y-6">
        <div>
          <Label htmlFor="service-amount" className="text-base font-semibold">Service Booking Amount (R)</Label>
          <Input
            id="service-amount"
            type="number"
            min={0}
            max={1000000}
            value={serviceAmount}
            onChange={(e) => setServiceAmount(Math.max(0, Number(e.target.value)))}
            className="mt-2 text-lg"
          />
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="font-semibold">Breakdown</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Amount</span>
              <span>R{serviceAmount.toFixed(2)}</span>
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
              <p>Under R15,000 → 10% commission</p>
              <p>R15,000 – R75,000 → 7.5% commission</p>
              <p>Over R75,000 → 5% commission</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ForCrewPage() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-20 md:py-28 bg-neutral-50">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Work Events. Offer Services. Or Both.</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Whether you want to get hired to work at events or list your own services for organizers to book — Ziyawa gives you one crew profile to do it all.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={user ? '/dashboard/provider' : '/auth/signup'}>
              <Button size="lg">{user ? 'Go to Dashboard' : 'Join as Crew'}</Button>
            </Link>
            <Link href="/crew">
              <Button size="lg" variant="outline">Browse Crew Directory</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Who's Crew */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Who&apos;s Crew?</h2>
          <p className="text-muted-foreground text-center mb-10">
            If you&apos;re part of making events happen, you&apos;re crew.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Volume2, label: 'Sound Engineers' },
              { icon: Wrench, label: 'Lighting & Stage' },
              { icon: Camera, label: 'Photographers' },
              { icon: Utensils, label: 'Caterers' },
              { icon: Shield, label: 'Security & Ushers' },
              { icon: Star, label: 'MCs & Hosts' },
              { icon: Globe, label: 'Decor & Design' },
              { icon: Briefcase, label: 'Videographers' },
            ].map((item) => (
              <div key={item.label} className="text-center p-4 rounded-lg bg-neutral-50">
                <item.icon className="h-6 w-6 mx-auto mb-2 text-neutral-600" />
                <p className="text-sm font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Two Pathways */}
      <section className="py-16 md:py-20 bg-neutral-50">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Two Ways to Work on Ziyawa</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            When you sign up as crew, you choose how you want to work. You can switch or enable both at any time from your Crew Dashboard.
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            {/* My Work */}
            <Card className="border-2 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-neutral-900" />
              <CardContent className="pt-8 pb-6">
                <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                  <UserPlus className="h-6 w-6 text-neutral-700" />
                </div>
                <h3 className="text-xl font-bold mb-2">My Work</h3>
                <p className="text-sm text-muted-foreground mb-1 font-medium">Get hired for event staff roles</p>
                <p className="text-sm text-muted-foreground mb-6">
                  Organizers invite you to work their events — as door staff, security, a bartender, usher, or any role they need filled. You get assigned, show up, log your shifts, and get paid.
                </p>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">How it works:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-neutral-900 mt-0.5">1.</span>
                      Set your work roles, base rate, and availability
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-neutral-900 mt-0.5">2.</span>
                      Organizers find you in the Crew Directory and send invites
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-neutral-900 mt-0.5">3.</span>
                      Accept the invite, message the organizer to confirm details
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-neutral-900 mt-0.5">4.</span>
                      Work the event — your shifts and pay are tracked on-platform
                    </li>
                  </ul>
                </div>
                <div className="mt-6 p-3 bg-neutral-50 rounded-lg text-xs text-muted-foreground">
                  <span className="font-semibold text-neutral-900">Payment:</span> Organizers pay you directly — cash, EFT, or however you agree. Ziyawa tracks the record.
                </div>
              </CardContent>
            </Card>

            {/* My Services */}
            <Card className="border-2 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-neutral-900" />
              <CardContent className="pt-8 pb-6">
                <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                  <ClipboardList className="h-6 w-6 text-neutral-700" />
                </div>
                <h3 className="text-xl font-bold mb-2">My Services</h3>
                <p className="text-sm text-muted-foreground mb-1 font-medium">List bookable services for organizers</p>
                <p className="text-sm text-muted-foreground mb-6">
                  You offer professional services — sound & lighting, catering, photography, decor, transport, and more. List your services with pricing, photos, and descriptions. Organizers browse and book you.
                </p>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">How it works:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-neutral-900 mt-0.5">1.</span>
                      Create service listings with pricing, photos, and availability
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-neutral-900 mt-0.5">2.</span>
                      Organizers find your services and send booking requests
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-neutral-900 mt-0.5">3.</span>
                      Accept or decline — chat with the organizer to finalize details
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-neutral-900 mt-0.5">4.</span>
                      Deliver the service — payment releases to your wallet after the event
                    </li>
                  </ul>
                </div>
                <div className="mt-6 p-3 bg-neutral-50 rounded-lg text-xs text-muted-foreground">
                  <span className="font-semibold text-neutral-900">Payment:</span> The organizer pays upfront when they book your service. Funds are held in escrow and released to your Ziyawa wallet after the event is complete and both sides confirm.
                </div>
              </CardContent>
            </Card>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Want both? Select <span className="font-semibold">&quot;Both&quot;</span> during setup and manage everything from one dashboard.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Your Crew Dashboard</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: Globe, title: 'One Crew Profile', desc: 'Your profile, your rates, your location — whether you\'re looking for work, offering services, or both.' },
              { icon: Briefcase, title: 'Work Assignments', desc: 'See your upcoming event shifts, assigned roles, and event-day tools all in one place.' },
              { icon: ClipboardList, title: 'Service Listings', desc: 'Create multiple service listings with photos, pricing, and availability for organizers to book.' },
              { icon: MessageSquare, title: 'Message Organizers', desc: 'Chat directly with organizers to discuss rates, event details, and logistics before committing.' },
              { icon: CreditCard, title: 'Wallet & Payments', desc: 'Service booking payments are paid upfront by the organizer and held in escrow until the event is done. Staff pay is tracked. Withdraw your earnings anytime.' },
              { icon: Star, title: 'Reviews & Reputation', desc: 'Organizers review you after every job. A strong track record means more work and higher rates.' },
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

      {/* Service Earnings Calculator */}
      <section className="py-16 md:py-20 bg-neutral-50">
        <div className="container mx-auto px-4 max-w-xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Service Earnings Calculator</h2>
          <p className="text-muted-foreground text-center mb-8">
            When organizers book your services through Ziyawa, a small commission applies. Bigger bookings mean a lower rate. Staff pay (My Work) is agreed directly with the organizer — no platform cut.
          </p>
          <ServiceEarningsCalculator />
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-neutral-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Join the Crew?</h2>
          <p className="text-neutral-400 max-w-xl mx-auto mb-8">
            {user
              ? 'Head to your Crew Dashboard to manage your work, services, and bookings.'
              : 'Create your crew profile — choose My Work, My Services, or both — and start connecting with organizers across SA.'}
          </p>
          <Link href={user ? '/dashboard/provider' : '/auth/signup'}>
            <Button size="lg" variant="secondary">{user ? 'Go to Dashboard' : 'Create Crew Profile'}</Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
