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
            (Pty) Ltd</strong> (Registration No. K2025834311).
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
            If an event is cancelled by the organizer, all ticket holders are entitled to a
            full refund of the ticket purchase price, including the booking fee paid at
            checkout. Refunds will be processed automatically to the original payment method
            within 7–14 business days.
          </p>

          <h3 className="font-medium mt-3 mb-1">2.2 Voluntary Cancellation by Ticket Holder</h3>
          <p>
            Ticket purchases are generally <strong>non-refundable</strong>. Organizers set
            their own cancellation policies for their events. Please review the event details
            and any cancellation terms stated by the organizer before purchasing.
          </p>
          <p className="mt-2">
            If an organizer has enabled refunds for their event, you may request a refund
            by contacting the organizer through the Platform or by emailing support@zande.io.
          </p>

          <h3 className="font-medium mt-3 mb-1">2.3 Event Date or Venue Changes</h3>
          <p>
            If an organizer materially changes an event (e.g., significant date or venue
            change), you may request a refund within 7 days of the change notification.
            Contact support@zande.io with your ticket details.
          </p>

          <h3 className="font-medium mt-3 mb-1">2.4 Duplicate or Erroneous Purchases</h3>
          <p>
            If you were charged multiple times for the same ticket due to a technical error,
            contact support@zande.io with proof of duplicate charges. Duplicate charges will
            be refunded in full.
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
              organizer&apos;s wallet, less any applicable fees. The artist/crew member will
              not receive payment.
            </li>
            <li>
              <strong>Artist/crew cancels:</strong> The escrowed amount (minus the Ziyawa
              commission) is returned to the organizer&apos;s wallet. The artist/crew member
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
          <h2 className="text-lg font-semibold mb-3">4. Wallet Transactions</h2>
          <h3 className="font-medium mt-3 mb-1">4.1 Deposits</h3>
          <p>
            Wallet deposit processing fees (2.5% + R3) are <strong>non-refundable</strong>.
            If you deposit funds into your wallet, the full deposited amount (minus the fee)
            is available for use on the Platform.
          </p>

          <h3 className="font-medium mt-3 mb-1">4.2 Withdrawals</h3>
          <p>
            Withdrawal fees (R20 flat fee) are <strong>non-refundable</strong>. Minimum
            withdrawal is R100. Withdrawals require completed identity verification.
            Once a withdrawal is processed, it cannot be reversed.
          </p>

          <h3 className="font-medium mt-3 mb-1">4.3 Platform Fees and Commissions</h3>
          <p>
            Platform fees and commissions (ticketing commission, booking commission) are
            generally <strong>non-refundable</strong>, except in cases of event cancellation
            by the organizer or disputes resolved in the payer&apos;s favour.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">5. Dispute Resolution Process</h2>
          <p>If you believe you are entitled to a refund or wish to dispute a transaction:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-2">
            <li>
              <strong>Open a dispute:</strong> Use the dispute feature on the relevant booking
              or transaction, or email support@zande.io with your account details, transaction
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
                <li>Return funds to the organizer&apos;s wallet (if service was not delivered).</li>
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
          <h2 className="text-lg font-semibold mb-3">6. Escrow and Fund Release Timeline</h2>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Ticket revenue:</strong> Held in escrow until 48 hours after event completion, then released to the organizer&apos;s wallet.</li>
            <li><strong>Booking payments:</strong> Held in escrow until dual confirmation (both parties confirm completion) + 24-hour holding period.</li>
            <li><strong>Large amounts (R5,000+):</strong> May require additional administrative review before release.</li>
            <li><strong>Eligible funds release:</strong> Automated daily processing releases eligible funds.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">7. Refund Processing Times</h2>
          <p>Refunds are processed as follows:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>To wallet balance:</strong> Instant (available immediately on the Platform).</li>
            <li><strong>To original payment method (card):</strong> 7–14 business days, depending on your bank and card issuer.</li>
          </ul>
          <p className="mt-2">
            Ziyawa initiates refunds promptly but cannot control processing times imposed by
            banks or payment processors.
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
            <li>Email: support@zande.io</li>
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
