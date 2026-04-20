import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service | Ziyawa',
  description: 'Terms and conditions for using the Ziyawa event platform.',
}

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: 19 April 2026</p>

      <div className="prose prose-neutral max-w-none space-y-8 text-sm leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold mb-3">1. Introduction</h2>
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Ziyawa platform
            (&quot;Platform&quot;), operated by <strong>Zande Technologies (Pty) Ltd</strong> (Registration
            No. K2025834311), a company registered in the Republic of South Africa (&quot;we&quot;,
            &quot;us&quot;, or &quot;Ziyawa&quot;).
          </p>
          <p className="mt-2">
            By creating an account or using the Platform, you agree to be bound by these Terms,
            our <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>,
            and our <Link href="/refunds" className="underline underline-offset-2">Refund Policy</Link>.
            If you do not agree, do not use the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">2. Platform Description</h2>
          <p>
            Ziyawa is a multi-sided event marketplace that connects event organizers, performing
            artists, crew and service vendors, and event attendees (&quot;Groovists&quot;) in South Africa.
            The Platform facilitates event listing, ticket sales, artist and crew bookings,
            secure payments, and communication between parties.
          </p>
          <p className="mt-2">
            Ziyawa acts as an <strong>intermediary platform</strong>, not as an event organizer,
            employer, or ticket reseller. We do not own, operate, or control any events listed
            on the Platform. Event organizers are solely responsible for their events.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">3. Eligibility</h2>
          <p>
            You must be at least 18 years old and legally capable of entering into binding
            agreements under South African law to use the Platform. By registering, you
            confirm that you meet these requirements.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">4. Account Registration</h2>
          <p>
            You may register using email and password or via Google sign-in. You are responsible
            for maintaining the confidentiality of your credentials. All activity under your
            account is your responsibility.
          </p>
          <p className="mt-2">
            You agree to provide accurate, current, and complete information during registration
            and to update it as needed. We reserve the right to suspend or terminate accounts
            with false or misleading information.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">5. User Roles</h2>
          <p>Ziyawa supports multiple roles within a single account:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Groovist (Attendee):</strong> Discover events, purchase tickets, leave reviews.</li>
            <li><strong>Organizer:</strong> Create events, sell tickets, book artists and crew. Self-activated via account settings.</li>
            <li><strong>Artist:</strong> Create a performer profile, receive booking requests. Self-activated, requires profile setup.</li>
            <li><strong>Crew / Service Provider:</strong> List services (sound, lighting, security, catering, etc.), get hired for events. Self-activated, requires profile setup.</li>
          </ul>
          <p className="mt-2">
            You may hold multiple roles simultaneously. Each role carries specific obligations
            described in these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">6. Events</h2>
          <h3 className="font-medium mt-3 mb-1">6.1 Event Listing</h3>
          <p>
            Organizers are solely responsible for the accuracy of event information including
            date, venue, pricing, lineup, and capacity. Events progress through defined states:
            Draft → Published → Locked → Completed (or Cancelled). Published events cannot
            be reverted to draft.
          </p>
          <h3 className="font-medium mt-3 mb-1">6.2 Event Cancellation</h3>
          <p>
            If an organizer cancels a published event, refund obligations as set out in
            our <Link href="/refunds" className="underline underline-offset-2">Refund Policy</Link> apply.
            Ziyawa is not liable for event cancellations or changes made by organizers.
          </p>
          <h3 className="font-medium mt-3 mb-1">6.3 Event Content</h3>
          <p>
            Organizers must not list events that are unlawful, fraudulent, discriminatory, or
            that infringe on any third-party rights. Ziyawa reserves the right to remove events
            that violate these Terms or applicable law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">7. Ticketing</h2>
          <p>
            Tickets are sold by organizers through the Platform. Ziyawa processes the payment
            and holds funds in escrow on behalf of the organizer. Ticket purchases are subject
            to availability and the organizer&apos;s event terms.
          </p>
          <p className="mt-2">
            Tickets may support multiple tiers (e.g., General Access, VIP, Early Bird) with
            different pricing. Organizers set all ticket prices in South African Rand (ZAR).
            Buyers pay the ticket price plus applicable booking fees as displayed at checkout.
          </p>
          <p className="mt-2">
            Tickets may be gifted to other users via the Platform&apos;s ticket assignment feature.
            Gifted tickets can be claimed using a unique claim token sent to the recipient.
          </p>
          <p className="mt-2">
            Ticket resale outside the Platform is not permitted. Ziyawa is not responsible for
            tickets purchased from unauthorized third parties.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">8. Bookings</h2>
          <h3 className="font-medium mt-3 mb-1">8.1 Artist Bookings</h3>
          <p>
            Organizers may send booking requests to artists via the Platform. Artists may accept
            or decline at their discretion. Accepted bookings require payment to be confirmed.
            Confirmed bookings are binding on both parties.
          </p>
          <h3 className="font-medium mt-3 mb-1">8.2 Crew / Vendor Bookings</h3>
          <p>
            Organizers may hire crew and service providers via the Platform. The same booking
            lifecycle applies: request → acceptance → payment → confirmation → completion.
          </p>
          <h3 className="font-medium mt-3 mb-1">8.3 Completion and Payout</h3>
          <p>
            Booking payouts require dual confirmation — both the organizer and the artist/crew
            must confirm that the service was delivered. Funds are released from escrow after
            confirmation plus a holding period (typically 24 hours). Amounts of R5,000 or more
            may be subject to additional review.
          </p>
          <h3 className="font-medium mt-3 mb-1">8.4 Disputes</h3>
          <p>
            Either party may open a dispute on a confirmed booking. Disputed funds are frozen
            until resolved by Ziyawa. Our decision on disputes is final and binding.
            See Section 15 for the full dispute resolution process.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">9. Payments and Fees</h2>
          <p>
            All payments are processed in <strong>South African Rand (ZAR)</strong> via
            Paystack, a PCI-DSS compliant payment gateway. Ziyawa does not store your card
            details.
          </p>
          <h3 className="font-medium mt-3 mb-1">9.1 Fee Structure</h3>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Ticket sales:</strong> 5% commission + 5% platform fee deducted from the organizer&apos;s revenue, plus a booking fee (R5–R10, tiered by ticket price) paid by the buyer.</li>
            <li><strong>Artist bookings:</strong> 10%–20% commission (tiered by booking amount), deducted from the booking payment.</li>
            <li><strong>Crew bookings:</strong> 5%–10% commission (tiered by booking amount), deducted from the booking payment.</li>
            <li><strong>Wallet deposits:</strong> 2.5% + R3 processing fee.</li>
            <li><strong>Wallet withdrawals:</strong> R20 flat fee, minimum withdrawal R100.</li>
          </ul>
          <p className="mt-2">
            All fees are displayed before you confirm any transaction. Fees are non-refundable
            unless otherwise stated in our <Link href="/refunds" className="underline underline-offset-2">Refund Policy</Link>.
          </p>

          <h3 className="font-medium mt-3 mb-1">9.2 Wallet and Escrow</h3>
          <p>
            The Platform uses a three-bucket wallet system: available balance (withdrawable),
            held balance (escrowed funds awaiting conditions), and pending payout balance
            (withdrawal in progress). Event ticket revenue is held for 48 hours after event
            completion before release. Booking payouts are held for 24 hours after dual
            confirmation.
          </p>

          <h3 className="font-medium mt-3 mb-1">9.3 Withdrawals</h3>
          <p>
            To withdraw funds, you must complete identity verification (see Section 11).
            Withdrawals are processed via bank transfer through Paystack. Processing times
            depend on your bank but are typically 1–3 business days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">10. Communication</h2>
          <p>
            The Platform provides in-app messaging between organizers, artists, and crew.
            Messaging is <strong>booking-gated</strong>: you may only message another user
            after an active booking or working relationship exists between you. This protects
            users from unsolicited contact and keeps transactions on-platform.
          </p>
          <p className="mt-2">
            Groovists (attendees) may contact organizers via a contact form on the event page,
            which requires proof of ticket ownership.
          </p>
          <p className="mt-2">
            You agree not to use messaging to share personal contact information for the
            purpose of circumventing Platform fees or protections, send spam, harass or
            threaten other users, or conduct transactions outside the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">11. Identity Verification</h2>
          <p>
            Users who wish to withdraw funds must complete identity verification. We offer
            two verification paths:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Individual:</strong> Valid South African ID or passport.</li>
            <li><strong>Business:</strong> CIPC company registration certificate plus representative ID.</li>
          </ul>
          <p className="mt-2">
            Verification documents are stored securely in private storage and reviewed by
            authorized Ziyawa administrators. Verification may be approved or rejected at
            our discretion. Submitting fraudulent documents will result in immediate account
            termination and may be reported to authorities.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">12. Reviews and Content</h2>
          <p>
            Users who attended an event may leave a review after the event has ended. Reviews
            must be honest, based on genuine experience, and not defamatory, discriminatory,
            or otherwise unlawful. Ziyawa reserves the right to moderate, edit, or remove
            reviews that violate these Terms.
          </p>
          <p className="mt-2">
            By posting content (including reviews, profile information, images, and media) on
            the Platform, you grant Ziyawa a non-exclusive, worldwide, royalty-free licence
            to use, display, and distribute such content on the Platform. You retain ownership
            of your content.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">13. Prohibited Conduct</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Use the Platform for any unlawful purpose or to promote unlawful activities.</li>
            <li>Create fake accounts, events, reviews, or transactions.</li>
            <li>Circumvent Platform fees by arranging off-platform payments.</li>
            <li>Interfere with the Platform&apos;s security, integrity, or operation.</li>
            <li>Scrape, harvest, or extract data from the Platform without permission.</li>
            <li>Impersonate any person or entity.</li>
            <li>Upload malicious content, viruses, or harmful code.</li>
          </ul>
          <p className="mt-2">
            Violation of these rules may result in account suspension or termination without
            notice.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">14. Security</h2>
          <p>
            We implement industry-standard security measures including encrypted data
            transmission (TLS), row-level security on all database tables, secure payment
            processing via PCI-DSS compliant providers, and optional two-factor authentication
            (TOTP) for user accounts. Two-factor authentication is mandatory for administrator
            accounts.
          </p>
          <p className="mt-2">
            Despite these measures, no system is completely secure. You are responsible for
            safeguarding your account credentials and enabling available security features.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">15. Disputes and Resolution</h2>
          <p>
            If a dispute arises between users (e.g., between an organizer and an artist
            regarding a booking), either party may open a dispute through the Platform.
            Disputed funds are frozen until resolution.
          </p>
          <p className="mt-2">
            Ziyawa will review disputes and may request additional information from both
            parties. We will make a determination based on the evidence available. Outcomes
            may include releasing funds to the service provider, returning funds to the
            organizer&apos;s wallet, or a partial resolution. Our decision is final.
          </p>
          <p className="mt-2">
            For disputes between you and Ziyawa (the company), South African law applies.
            You agree to first attempt to resolve any dispute informally by contacting us
            at <strong>support@zande.io</strong>. If informal resolution fails, disputes
            shall be submitted to arbitration under the Arbitration Act 42 of 1965, or you
            may approach the relevant consumer tribunal or court.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">16. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by South African law, including the Consumer
            Protection Act 68 of 2008:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Ziyawa is not liable for the quality, safety, or legality of any event listed on the Platform.</li>
            <li>Ziyawa is not liable for any loss or damage arising from your use of the Platform, except where such liability cannot be excluded by law.</li>
            <li>Our total liability for any claim shall not exceed the fees you have paid to Ziyawa in the 12 months preceding the claim.</li>
            <li>Ziyawa is not responsible for the actions or omissions of other Platform users.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">17. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Zande Technologies (Pty) Ltd, its
            directors, employees, and agents from any claims, losses, damages, or expenses
            (including legal fees) arising from your use of the Platform, violation of
            these Terms, or infringement of any third-party rights.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">18. Intellectual Property</h2>
          <p>
            The Ziyawa name, logo, software, and Platform design are the intellectual property
            of Zande Technologies (Pty) Ltd. You may not reproduce, distribute, or create
            derivative works from our intellectual property without written permission.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">19. Termination</h2>
          <p>
            You may close your account at any time by contacting support@zande.io. Any
            pending transactions or held funds will be processed before closure where
            possible.
          </p>
          <p className="mt-2">
            We may suspend or terminate your account at any time for violation of these
            Terms, fraudulent activity, or any other reason at our discretion. We will
            make reasonable efforts to notify you, except where immediate action is
            required to protect the Platform or other users.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">20. Amendments</h2>
          <p>
            We may update these Terms from time to time. Material changes will be communicated
            via email or an in-app notification at least 14 days before they take effect.
            Continued use of the Platform after changes take effect constitutes acceptance
            of the updated Terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">21. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the Republic of South Africa. The
            Electronic Communications and Transactions Act 25 of 2002 (ECTA), the Consumer
            Protection Act 68 of 2008 (CPA), and the Protection of Personal Information
            Act 4 of 2013 (POPIA) apply to these Terms and your use of the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">22. Contact</h2>
          <p>For questions about these Terms:</p>
          <ul className="list-none mt-2 space-y-1">
            <li><strong>Zande Technologies (Pty) Ltd</strong></li>
            <li>Registration No. K2025834311</li>
            <li>Email: support@zande.io</li>
            <li>Information Regulator Ref: 2025-066656</li>
            <li>South Africa</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
