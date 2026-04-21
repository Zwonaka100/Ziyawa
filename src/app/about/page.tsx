import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import { Ticket, Users, Mic2, Wrench, Shield, Wallet, QrCode, MessageSquare, Star, Search, Bot, Mail } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about Ziyawa, the event operating system built by Zande Technologies in South Africa. Connecting organizers, artists, crew, and groovists.',
}

export default function AboutPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-20 md:py-28 bg-neutral-50">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">About Ziyawa</h1>
          <p className="text-lg text-muted-foreground">
            Your Event Operating System — built in South Africa, for South Africa.
          </p>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
              <p className="text-muted-foreground leading-relaxed">
                A South Africa where the entire event ecosystem thrives on one platform — where organizers, artists, crew, and groovists all have the tools they need to create, perform, work, and experience unforgettable events.
              </p>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                To give South Africa&apos;s entertainment industry better ways to organize, promote, discover, and experience events. Better ways to get booked and get paid — with every transaction protected and every participant valued.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem & Solution */}
      <section className="py-16 md:py-20 bg-neutral-50">
        <div className="container mx-auto px-4 max-w-2xl space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">The Problem</h2>
            <p className="text-muted-foreground leading-relaxed">
              South Africa&apos;s event industry is fragmented. Organizers juggle multiple platforms to sell tickets, book artists, and hire vendors. Artists struggle to get discovered. Service providers chase invoices. And groovists never know if an event is legit until they show up.
            </p>
          </div>

          <Separator />

          <div>
            <h2 className="text-2xl font-bold mb-4">Our Solution</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ziyawa brings everything into one platform. Create events, sell tickets, book talent, hire crew, and manage payments — all in one place. Every payment is secured through escrow — organizers pay upfront for bookings, artists and crew get paid after the event, and ticket revenue releases once the event is done. Everyone is protected, and every groovist can trust what they&apos;re paying for.
            </p>
          </div>

          <Separator />

          <div>
            <h2 className="text-2xl font-bold mb-4">What &ldquo;Ziyawa&rdquo; Means</h2>
            <p className="text-muted-foreground leading-relaxed">
              &ldquo;Ziyawa&rdquo; is South African slang — it means &ldquo;it&apos;s going down&rdquo; or &ldquo;things are moving.&rdquo; It captures the energy of a great event — when the music hits right, the crowd is alive, and everything just flows. That&apos;s the feeling we&apos;re building toward.
            </p>
          </div>
        </div>
      </section>

      {/* Who We Serve */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Who We Serve</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="h-5 w-5 text-neutral-700" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Groovists</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Event-goers who want to discover, book, and attend events with confidence. Browse events across South Africa, buy tickets securely, and know exactly what you&apos;re walking into — with real reviews, verified organizers, and digital QR tickets.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                  <Ticket className="h-5 w-5 text-neutral-700" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Organizers</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  From first-time hosts to seasoned promoters. Create events, sell tickets, book artists, hire crew, and manage everything from a single dashboard. Ticket revenue is held safely and released to you after the event.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                  <Mic2 className="h-5 w-5 text-neutral-700" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Artists</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Musicians, DJs, MCs, and performers who want to get booked and paid reliably. Build your profile, showcase your work, set your rates, and receive booking requests directly through the platform. The organizer pays upfront — you get paid after the event.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                  <Wrench className="h-5 w-5 text-neutral-700" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Crew</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Sound engineers, lighting techs, caterers, photographers, security, and all the professionals who make events happen. Get hired directly for event staff roles, list your own bookable services, or do both — all through a single crew profile.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="py-16 md:py-20 bg-neutral-50">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">What You Can Do on Ziyawa</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            One platform for the entire event lifecycle — from planning to payout.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Ticket, title: 'Sell & Buy Tickets', desc: 'Create multiple ticket types, set capacities, and sell directly to groovists. Buyers get digital tickets with unique QR codes.' },
              { icon: Users, title: 'Book Talent & Crew', desc: 'Browse artist and crew directories. Send booking requests, negotiate terms, and pay securely through the platform.' },
              { icon: QrCode, title: 'QR Check-In', desc: 'Scan attendee QR codes at the door for fast, reliable check-in. Track attendance in real time from your dashboard.' },
              { icon: Wallet, title: 'Wallet & Payouts', desc: 'All earnings go to your Ziyawa wallet. Withdraw to your bank account anytime — with full transaction history.' },
              { icon: MessageSquare, title: 'Direct Messaging', desc: 'Message organizers, artists, and crew directly on the platform. Coordinate bookings, ask questions, and stay connected.' },
              { icon: Star, title: 'Reviews & Ratings', desc: 'Leave reviews after events. Organizers, artists, and crew all build public track records that help the community make better choices.' },
              { icon: Shield, title: 'Escrow Payments', desc: 'Every payment is held in escrow. Booking payments release after the event. Ticket revenue releases 48 hours after completion. Everyone is protected.' },
              { icon: Bot, title: 'Ziwaphi AI Assistant', desc: 'Ask Ziwaphi to help you find events by date, location, genre, or vibe. A conversational way to discover what\u2019s happening near you.' },
              { icon: Search, title: 'Event Discovery', desc: 'Search and filter events by province, date, price range, or keyword. Find exactly what you\u2019re looking for across South Africa.' },
            ].map((feature) => (
              <div key={feature.title} className="flex gap-4">
                <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center shrink-0">
                  <feature.icon className="h-5 w-5 text-neutral-700" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How Payments Work */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">How Payments Work</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            Every rand on Ziyawa is processed through Paystack and protected by our escrow system.
          </p>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-neutral-900 text-white rounded-full flex items-center justify-center shrink-0 text-sm font-bold">1</div>
              <div>
                <h3 className="font-semibold mb-1">Groovists buy tickets</h3>
                <p className="text-sm text-muted-foreground">Payment goes through Paystack. The money is held in escrow — not in the organizer&apos;s pocket — until after the event.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-neutral-900 text-white rounded-full flex items-center justify-center shrink-0 text-sm font-bold">2</div>
              <div>
                <h3 className="font-semibold mb-1">Organizers book artists & crew</h3>
                <p className="text-sm text-muted-foreground">The organizer pays upfront. Those funds are also held in escrow — the artist or crew member doesn&apos;t receive the money yet.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-neutral-900 text-white rounded-full flex items-center justify-center shrink-0 text-sm font-bold">3</div>
              <div>
                <h3 className="font-semibold mb-1">The event happens</h3>
                <p className="text-sm text-muted-foreground">Groovists attend, artists perform, crew delivers. Everyone does their part.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-neutral-900 text-white rounded-full flex items-center justify-center shrink-0 text-sm font-bold">4</div>
              <div>
                <h3 className="font-semibold mb-1">Both sides confirm completion</h3>
                <p className="text-sm text-muted-foreground">For bookings, both the organizer and the artist or crew member confirm the work was done. This triggers the release process.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-neutral-900 text-white rounded-full flex items-center justify-center shrink-0 text-sm font-bold">5</div>
              <div>
                <h3 className="font-semibold mb-1">Everyone gets paid</h3>
                <p className="text-sm text-muted-foreground">Booking payments release to artists and crew. Ticket revenue releases to the organizer 48 hours after the event. Funds go to each person&apos;s Ziyawa wallet, ready to withdraw.</p>
              </div>
            </div>
          </div>
          <div className="mt-8 p-4 bg-neutral-50 rounded-lg border text-sm text-muted-foreground text-center">
            Amounts over R5,000 go through additional admin review for extra security. Platform fees are deducted automatically before payout.
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-16 md:py-20 bg-neutral-50">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">What Makes Ziyawa Different</h2>
          <div className="space-y-8">
            <div>
              <h3 className="font-semibold text-lg mb-2">Everything in One Place</h3>
              <p className="text-muted-foreground leading-relaxed">
                Most platforms do one thing — sell tickets, or list artists, or manage bookings. Ziyawa handles the full event lifecycle: ticketing, talent booking, crew hiring, payments, messaging, reviews, and check-in. No switching between apps.
              </p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold text-lg mb-2">Nobody Gets Burned</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our escrow system means organizers can&apos;t disappear with booking money, and artists and crew can&apos;t get stiffed after doing the work. The money is always there — it just doesn&apos;t move until the event is done and both sides confirm.
              </p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold text-lg mb-2">Built for South Africa</h3>
              <p className="text-muted-foreground leading-relaxed">
                Ziyawa is built in South Africa, processes payments in ZAR through Paystack, and is designed around how the local event industry actually works — from groove culture to service provider logistics.
              </p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold text-lg mb-2">Transparent Fees</h3>
              <p className="text-muted-foreground leading-relaxed">
                No hidden costs. Ticket fees, booking commissions, and withdrawal charges are all published upfront on our{' '}
                <Link href="/pricing" className="text-primary hover:underline font-medium">pricing page</Link>.
                You always know what you&apos;re paying before you commit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Built by Zande Technologies */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 max-w-2xl space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">Built by Zande Technologies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ziyawa is built and operated by Zande Technologies (Pty) Ltd, a South African technology company registered with CIPC (K2025834311) and the Information Regulator (2025-066656). We&apos;re based in South Africa and committed to building technology that serves our local entertainment industry.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              For more information about Zande Technologies, visit{' '}
              <a href="https://zande.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                zande.io
              </a>.
            </p>
          </div>

          <Separator />

          <div>
            <h2 className="text-2xl font-bold mb-4">Our Partners</h2>
            <p className="text-muted-foreground leading-relaxed">
              Zande Technologies is proud to be in partnership with <span className="font-medium text-foreground">Rath Group (Pty) Ltd</span>, working together to grow and strengthen South Africa&apos;s entertainment and events industry.
            </p>
          </div>

          <Separator />

          <div>
            <h2 className="text-2xl font-bold mb-4">Get in Touch</h2>
            <div className="space-y-3 text-muted-foreground">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-neutral-500" />
                <span>General inquiries: <a href="mailto:info@zande.io" className="text-primary hover:underline font-medium">info@zande.io</a></span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-neutral-500" />
                <span>Support: <a href="mailto:support@zande.io" className="text-primary hover:underline font-medium">support@zande.io</a></span>
              </div>
              <p className="text-sm pt-2">
                You can also reach us through the{' '}
                <Link href="/support" className="text-primary hover:underline font-medium">support page</Link>{' '}
                when logged in.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-neutral-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Join the Movement</h2>
          <p className="text-neutral-400 max-w-xl mx-auto mb-8">
            Whether you&apos;re hosting, performing, working events, offering services, or just looking for a good time — Ziyawa is for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" variant="secondary">Create Free Account</Button>
            </Link>
            <Link href="/ziwaphi">
              <Button size="lg" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-black">
                Browse Events
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
