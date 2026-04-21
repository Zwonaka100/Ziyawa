import type { Metadata } from 'next'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about Ziyawa — tickets, payments, bookings, fees, refunds, and more.',
}

const faqs = [
  {
    category: 'General',
    questions: [
      {
        q: 'What is Ziyawa?',
        a: 'Ziyawa is an event operating system for South Africa. It connects event organizers, artists, service providers (crew), and event-goers (groovists) on one platform — with ticketing, bookings, payments, and reviews all built in.',
      },
      {
        q: 'Is Ziyawa free to use?',
        a: 'Creating an account is free. We earn through small commissions on ticket sales and bookings. There are no monthly subscription fees.',
      },
      {
        q: 'Who runs Ziyawa?',
        a: 'Ziyawa is built and operated by Zande Technologies (Pty) Ltd, a registered South African company, in partnership with Rath Group (Pty) Ltd.',
      },
    ],
  },
  {
    category: 'Tickets & Events',
    questions: [
      {
        q: 'How do I buy tickets?',
        a: 'Find an event on Ziwaphi, select your ticket type, and pay securely via Paystack. You\'ll receive a digital ticket with a unique QR code instantly.',
      },
      {
        q: 'Can I get a refund on my ticket?',
        a: 'Refund eligibility depends on the event\'s cancellation policy. If the organizer cancels the event, you\'ll receive a full refund. For voluntary cancellations, see our Refund Policy for details.',
      },
      {
        q: 'How do I check in at the event?',
        a: 'Show the QR code from your digital ticket at the door. The organizer will scan it to verify your entry.',
      },
      {
        q: 'What payment methods are accepted?',
        a: 'We accept all major South African bank cards, Visa, Mastercard, and other methods supported by Paystack.',
      },
    ],
  },
  {
    category: 'For Organizers',
    questions: [
      {
        q: 'How much does it cost to create an event?',
        a: 'Creating and publishing an event is free. Ziyawa takes a 5% commission plus a 5% platform fee on each ticket sold. The buyer also pays a small booking fee (R5–R10) which doesn\'t come from your earnings.',
      },
      {
        q: 'When do I get paid?',
        a: 'Ticket revenue is held in escrow and released to your Ziyawa wallet 48 hours after event completion. If you booked artists or crew services through the platform, those payments are also held in escrow and released to them after the event — so everyone gets paid safely.',
      },
      {
        q: 'Can I create multiple ticket tiers?',
        a: 'Yes. You can create Early Bird, General, VIP, and custom tiers — each with its own price, capacity, and sale window.',
      },
      {
        q: 'How do I book artists or crew?',
        a: 'Browse the Artist Directory or Crew Directory, send a booking request, and pay upfront. Funds are held in escrow until the event is complete and both sides confirm — protecting both you and the person you booked.',
      },
    ],
  },
  {
    category: 'For Artists',
    questions: [
      {
        q: 'How do I sign up as an artist?',
        a: 'Create an account and set up your artist profile from your dashboard settings. Add your stage name, genre, pricing, bio, and media.',
      },
      {
        q: 'What are the artist commission rates?',
        a: 'Commission is tiered: 20% on bookings under R20,000, 15% on R20,000–R100,000, and 10% on bookings over R100,000. Bigger bookings mean lower commission.',
      },
      {
        q: 'How do I get paid after a performance?',
        a: 'The organizer pays upfront when they book you. That payment is held in escrow and released to your Ziyawa wallet after the event is complete and both sides confirm. You can then withdraw to your bank account.',
      },
    ],
  },
  {
    category: 'For Crew & Vendors',
    questions: [
      {
        q: 'What\u2019s the difference between My Work and My Services?',
        a: 'My Work is for getting hired to work at events \u2014 roles like door staff, security, bartending, or ushering. Organizers invite you, you show up, and they pay you directly. My Services is for listing your own bookable services (sound, catering, photography, etc.) that organizers can browse and book through the platform, with payment handled via escrow. You can choose one or both when you set up your crew profile.',
      },
      {
        q: 'What services can I list?',
        a: 'Sound, lighting, catering, photography, videography, security, decor, MC services, and more. You can list multiple services with individual pricing and photos.',
      },
      {
        q: 'What are the crew service commission rates?',
        a: 'Commission applies only to My Services bookings (not My Work): 10% on bookings under R15,000, 7.5% on R15,000\u2013R75,000, and 5% on bookings over R75,000. For My Work, you agree on pay directly with the organizer \u2014 no platform cut.',
      },
    ],
  },
  {
    category: 'Wallet & Withdrawals',
    questions: [
      {
        q: 'How do I withdraw my earnings?',
        a: 'Go to your Wallet page and request a withdrawal. There\'s a flat R20 fee per withdrawal, with a minimum withdrawal of R100.',
      },
      {
        q: 'How long do withdrawals take?',
        a: 'Withdrawals are processed via Paystack. Funds typically arrive in your bank account within 24 hours.',
      },
      {
        q: 'Can I deposit money into my wallet?',
        a: 'Yes. Deposits incur a 2.5% + R3 processing fee to cover payment gateway costs.',
      },
    ],
  },
  {
    category: 'Trust & Safety',
    questions: [
      {
        q: 'How does Ziyawa protect my money?',
        a: 'All payments go through Paystack and are held in escrow — not in anyone\'s pocket. Ticket revenue releases to the organizer after the event. Booking payments release to artists and crew after the event is complete and both sides confirm. Amounts over R5,000 require additional admin review. Everyone is protected.',
      },
      {
        q: 'How do reviews work?',
        a: 'After attending an event, groovists can rate and review the experience. Artists and crew also receive reviews from organizers they\'ve worked with. All reviews are from verified transactions.',
      },
      {
        q: 'How do I report an issue?',
        a: 'Use the Support page to create a ticket. Our team will investigate and respond. You can also report specific events or users directly through the platform.',
      },
    ],
  },
]

export default function FAQPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-20 md:py-28 bg-neutral-50">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about using Ziyawa.
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="space-y-12">
            {faqs.map((section) => (
              <div key={section.category}>
                <h2 className="text-xl font-bold mb-6">{section.category}</h2>
                <div className="space-y-6">
                  {section.questions.map((faq) => (
                    <div key={faq.q}>
                      <h3 className="font-semibold mb-2">{faq.q}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                    </div>
                  ))}
                </div>
                <Separator className="mt-8" />
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-muted-foreground mb-4">
              Still have questions?
            </p>
            <Link href="/support" className="text-primary hover:underline font-medium">
              Contact Support
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
