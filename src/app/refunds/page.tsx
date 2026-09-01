import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Refund Policy | Ziyawa',
  description: 'Refund, cancellation, and dispute policy for the Ziyawa event platform.',
}

export default function RefundsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Refund Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: 19 April 2026</p>

      <div className="prose prose-neutral max-w-none space-y-8 text-sm leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold mb-3">1. Overview</h2>
          <p>
            This Refund Policy outlines the terms under which refunds, cancellations, and
            disputes are handled on the Ziyawa platform, operated by <strong>Zande Technologies
            (Pty) Ltd</strong> (Registration No. K2025834311) in partnership with <strong>Rath Group (Pty) Ltd</strong>.
          </p>
          <p className="mt-2">
            All transactions on the Platform are conducted in South African Rand (ZAR). This
            policy is subject to the Consumer Protection Act 68 of 2008 (CPA) and other
            applicable South African law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">2. Ticket Refunds</h2>
          <h3 className="font-medium mt-3 mb-1">2.1 Event Cancellation by Organizer</h3>
          <p>
            If an event is cancelled by the organizer, all ticket holders are entitled to the
            <strong> ticket price in full</strong>, returned to the card used to pay. Refunds are
            never automatic — each one is reviewed and approved by an administrator first. Once
            approved, the reversal is sent to your bank immediately; most banks take a few
            working days to show it.
          </p>
          <p className="mt-2">
            The <strong>booking fee is not refunded</strong>. It covers the cost of processing
            your payment, which our payment provider charges when the payment is taken and does
            not return when a payment is reversed. No other fee or deduction is applied to your
            refund.
          </p>

          <h3 className="font-medium mt-3 mb-1">2.2 Voluntary Cancellation by Ticket Holder</h3>
          <p>
            Ticket purchases are generally <strong>non-refundable</strong>. Organizers set
            their own cancellation policies for their events. Please review the event details
            and any cancellation terms stated by the organizer before purchasing.
          </p>
          <p className="mt-2">
            If an organizer has enabled refunds for their event, you may request a refund
            by contacting the organizer through the Platform or by emailing support@ziyawa.com.
          </p>

          <h3 className="font-medium mt-3 mb-1">2.3 Event Date or Venue Changes</h3>
          <p>
            If an organizer materially changes an event (e.g., significant date or venue
            change), you may request a refund within 7 days of the change notification.
            Contact support@ziyawa.com with your ticket details.
          </p>

          <h3 className="font-medium mt-3 mb-1">2.4 Duplicate or Erroneous Purchases</h3>
          <p>
            If you were charged multiple times for the same ticket due to a technical error,
            contact support@ziyawa.com with proof of duplicate charges. A duplicate charge is
            reversed in its entirety, booking fee included — you should never pay a booking fee
            twice for the same ticket.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">3. Booking Refunds (Artists &amp; Crew)</h2>
          <h3 className="font-medium mt-3 mb-1">3.1 Booking Flow</h3>
          <p>
            When an organizer books an artist or crew member, payment is held in escrow by
            Ziyawa. Funds are only released to the service provider after the service is
            completed and both parties confirm completion (dual confirmation). After dual
            confirmation, funds are held for an additional 24-hour review period before
            release.
          </p>

          <h3 className="font-medium mt-3 mb-1">3.2 Cancellation Before Confirmation</h3>
          <p>
            If a booking is cancelled before payment is made (i.e., while in &quot;Pending&quot;
            or &quot;Accepted&quot; state), no refund is necessary as no money has changed hands.
          </p>

          <h3 className="font-medium mt-3 mb-1">3.3 Cancellation After Payment (Confirmed Bookings)</h3>
          <p>
            Once a booking is confirmed (paid), cancellation and refund terms depend on who
            cancels:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-2">
            <li>
              <strong>Organizer cancels:</strong> The organizer forfeits the Ziyawa commission
              (non-refundable). The remaining escrowed amount may be refunded to the
              organizer&apos;s available balance, less any applicable fees. The artist/crew member will
              not receive payment.
            </li>
            <li>
              <strong>Artist/crew cancels:</strong> The escrowed amount (minus the Ziyawa
              commission) is returned to the organizer&apos;s available balance. The artist/crew member
              may be subject to account review for repeated cancellations.
            </li>
          </ul>

          <h3 className="font-medium mt-3 mb-1">3.4 Disputes on Bookings</h3>
          <p>
            If either party disputes a booking (e.g., service not delivered, quality dispute),
            the booking may be placed in &quot;Disputed&quot; status. Disputed funds remain in
            escrow and are frozen until Ziyawa resolves the dispute. See Section 5 for the
            dispute process.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">4. Fees</h2>
          <h3 className="font-medium mt-3 mb-1">4.1 Booking Fee</h3>
          <p>
            The booking fee added to your ticket at checkout is <strong>non-refundable</strong>.
            It covers the cost of processing your card payment, which our payment provider
            charges when the payment is taken and does not return if the payment is later
            reversed. The fee is shown separately before you pay.
          </p>

          <h3 className="font-medium mt-3 mb-1">4.2 Getting Paid</h3>
          <p>
            The Platform does not hold deposits and does not offer a stored balance you can
            top up. Money you earn from ticket sales or bookings is held until the event is
            complete, then reviewed and paid to your verified bank account. We charge no fee
            to pay you — our commission is taken when the ticket is sold.
          </p>

          <h3 className="font-medium mt-3 mb-1">4.3 Platform Fees and Commissions</h3>
          <p>
            Platform fees and commissions (ticketing commission, booking commission) are
            generally <strong>non-refundable</strong>, except in cases of event cancellation
            by the organizer or disputes resolved in the payer&apos;s favour, where the
            commission is not charged because no event took place.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">5. Dispute Resolution Process</h2>
          <p>If you believe you are entitled to a refund or wish to dispute a transaction:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-2">
            <li>
              <strong>Open a dispute:</strong> Use the dispute feature on the relevant booking
              or transaction, or email support@ziyawa.com with your account details, transaction
              reference, and reason for dispute.
            </li>
            <li>
              <strong>Review period:</strong> Ziyawa will review the dispute and may request
              additional information from both parties. We aim to respond within 5 business
              days.
            </li>
            <li>
              <strong>Resolution:</strong> Based on the evidence, we may:
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Release funds to the service provider (if service was delivered).</li>
                <li>Return funds to the organizer&apos;s available balance (if service was not delivered).</li>
                <li>Apply a partial resolution.</li>
              </ul>
            </li>
            <li>
              <strong>Final decision:</strong> Ziyawa&apos;s decision on disputes is final. If
              you are not satisfied, you may pursue remedies under South African consumer
              protection law, including approaching the National Consumer Tribunal.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">6. How Long Money Is Held</h2>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Ticket revenue:</strong> Held until 48 hours after the event is marked complete, then reviewed and paid to the organizer&apos;s verified bank account.</li>
            <li><strong>Booking payments:</strong> Held until both parties confirm completion, plus a 24-hour review period.</li>
            <li><strong>Large amounts (R5,000+):</strong> May require additional administrative review before release.</li>
            <li><strong>Cancelled events:</strong> Revenue is never released. It stays available to refund ticket holders.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">7. Refund Processing Times</h2>
          <p>
            Approved refunds are reversed to the card you paid with. Ziyawa sends the reversal
            as soon as an administrator approves it, but the time it takes to appear on your
            statement is set by your bank and card issuer — usually a few working days, and up
            to 14 in some cases. We cannot speed that up.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">8. Consumer Protection</h2>
          <p>
            Nothing in this Refund Policy limits your rights under the Consumer Protection
            Act 68 of 2008. Where this policy conflicts with mandatory consumer protection
            rights, the law prevails.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">9. Contact</h2>
          <p>For refund requests, disputes, or questions about this policy:</p>
          <ul className="list-none mt-2 space-y-1">
            <li><strong>Zande Technologies (Pty) Ltd</strong></li>
            <li>Email: support@ziyawa.com</li>
            <li>South Africa</li>
          </ul>
        </section>

        <p className="mt-8 pt-4 border-t text-muted-foreground">
          See also our{' '}
          <Link href="/terms" className="underline underline-offset-2">Terms of Service</Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}
