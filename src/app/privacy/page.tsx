import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | Ziyawa',
  description: 'How Ziyawa collects, uses, and protects your personal information under POPIA.',
}

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: 19 April 2026</p>

      <div className="prose prose-neutral max-w-none space-y-8 text-sm leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold mb-3">1. Introduction</h2>
          <p>
            This Privacy Policy explains how <strong>Zande Technologies (Pty) Ltd</strong>
            (Registration No. K2025834311), in partnership with <strong>Rath Group (Pty) Ltd</strong>,
            operating the Ziyawa platform (&quot;Platform&quot;), collects, uses, stores, and protects
            your personal information in accordance with the <strong>Protection of Personal Information Act 4 of 2013 (POPIA)</strong>.
          </p>
          <p className="mt-2">
            Zande Technologies is registered with the Information Regulator of South Africa
            as an information officer under reference number <strong>2025-066656</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">2. Information Officer</h2>
          <ul className="list-none space-y-1">
            <li><strong>Responsible Party:</strong> Zande Technologies (Pty) Ltd</li>
            <li><strong>Information Regulator Ref:</strong> 2025-066656</li>
            <li><strong>Email:</strong> info@zande.io</li>
            <li><strong>Location:</strong> South Africa</li>
          </ul>
          <p className="mt-2">
            You may contact the Information Regulator of South Africa at:
            <br />
            Email: enquiries@inforegulator.org.za | Tel: 012 406 4818
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">3. Personal Information We Collect</h2>
          <p>We collect the following categories of personal information:</p>

          <h3 className="font-medium mt-3 mb-1">3.1 Information You Provide</h3>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Account data:</strong> Name, email address, phone number (optional), password (hashed).</li>
            <li><strong>Profile data:</strong> Display name, bio, province, profile photo, genres (artists), services offered (crew/vendors).</li>
            <li><strong>Identity verification:</strong> South African ID number or passport number, CIPC registration number (businesses), uploaded ID or registration documents.</li>
            <li><strong>Financial data:</strong> Bank account details (for withdrawals), transaction history. Card details are processed by Paystack and never stored on our servers.</li>
            <li><strong>Event data:</strong> Event details, ticket types, pricing, venue information.</li>
            <li><strong>Communications:</strong> In-app messages between users (booking-gated), support tickets.</li>
            <li><strong>Reviews:</strong> Written reviews and star ratings you submit.</li>
          </ul>

          <h3 className="font-medium mt-3 mb-1">3.2 Information Collected Automatically</h3>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Usage data:</strong> Pages visited, features used, actions taken on the Platform.</li>
            <li><strong>Device data:</strong> Browser type, operating system, screen resolution.</li>
            <li><strong>Authentication data:</strong> Login timestamps, session tokens, two-factor authentication (TOTP) enrolment status.</li>
            <li><strong>Cookies:</strong> Essential cookies for authentication and session management. See Section 10.</li>
          </ul>

          <h3 className="font-medium mt-3 mb-1">3.3 Information from Third Parties</h3>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Google OAuth:</strong> If you sign in via Google, we receive your name, email address, and profile picture from Google.</li>
            <li><strong>Paystack:</strong> Transaction confirmation data, payment status updates via webhooks.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">4. Purpose of Processing</h2>
          <p>We process your personal information for the following purposes, each with a lawful basis under POPIA:</p>
          <ul className="list-disc pl-5 mt-2 space-y-2">
            <li><strong>Contract performance (Section 11(1)(b)):</strong> To provide the Platform services — account management, event listing, ticket sales, bookings, payments, messaging, and wallet operations.</li>
            <li><strong>Legal obligation (Section 11(1)(c)):</strong> To comply with financial regulations, tax reporting, anti-fraud requirements, and consumer protection laws.</li>
            <li><strong>Legitimate interest (Section 11(1)(f)):</strong> To improve the Platform, detect fraud, prevent abuse, and maintain security. We balance our interests against your rights.</li>
            <li><strong>Consent (Section 11(1)(a)):</strong> Where applicable, for optional marketing communications. You may withdraw consent at any time.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">5. How We Share Your Information</h2>
          <p>We share personal information only as necessary for Platform operations:</p>
          <ul className="list-disc pl-5 mt-2 space-y-2">
            <li><strong>With other users:</strong> Your public profile (name, bio, reviews, ratings) is visible to other users. Organizers and artists/crew can see each other&apos;s booking details. Messages are shared with conversation participants.</li>
            <li><strong>Paystack (Payment Processor):</strong> Transaction data for payment processing. Paystack is PCI-DSS compliant and operates under its own privacy policy.</li>
            <li><strong>Supabase (Infrastructure Provider):</strong> Your data is stored on Supabase infrastructure. Data is encrypted at rest and in transit.</li>
            <li><strong>Resend (Email Service):</strong> Your email address for transactional emails (booking confirmations, password resets, notifications).</li>
            <li><strong>Google (Authentication):</strong> If you use Google sign-in, authentication data is exchanged with Google under their privacy policy.</li>
            <li><strong>Law enforcement:</strong> When required by law, court order, or to protect the rights, safety, or property of Ziyawa, our users, or the public.</li>
          </ul>
          <p className="mt-2">
            We do <strong>not</strong> sell your personal information to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">6. Cross-Border Transfers</h2>
          <p>
            Some of our service providers (Supabase, Resend, Google) may process data outside
            of South Africa. Where this occurs, we ensure that adequate safeguards are in
            place as required by POPIA Section 72, including ensuring that the recipient
            country has adequate data protection laws or that the recipient is bound by
            contractual obligations providing equivalent protection.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">7. Data Retention</h2>
          <p>We retain your personal information for as long as necessary to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Provide Platform services while your account is active.</li>
            <li>Comply with legal obligations (e.g., financial records retained for 5 years as required by SARS).</li>
            <li>Resolve disputes and enforce our agreements.</li>
          </ul>
          <p className="mt-2">
            After account closure, we retain essential records (transaction history, identity
            verification outcomes) for the legally mandated period, then securely delete them.
            Messages and non-essential profile data are deleted within 90 days of account
            closure.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">8. Your Rights Under POPIA</h2>
          <p>As a data subject, you have the right to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Access:</strong> Request a copy of the personal information we hold about you.</li>
            <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information.</li>
            <li><strong>Deletion:</strong> Request deletion of your personal information, subject to legal retention requirements.</li>
            <li><strong>Object:</strong> Object to the processing of your personal information on reasonable grounds.</li>
            <li><strong>Restrict processing:</strong> Request limitation of processing in certain circumstances.</li>
            <li><strong>Data portability:</strong> Receive your personal information in a structured, commonly used format.</li>
            <li><strong>Withdraw consent:</strong> Where processing is based on consent, withdraw it at any time.</li>
            <li><strong>Complain:</strong> Lodge a complaint with the Information Regulator if you believe your rights have been violated.</li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, contact us at <strong>info@zande.io</strong>.
            We will respond within 30 days as required by POPIA.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">9. Security Measures</h2>
          <p>We implement the following security measures to protect your personal information:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Encryption:</strong> All data transmitted between your device and our servers is encrypted using TLS.</li>
            <li><strong>Row-Level Security (RLS):</strong> Database-level access controls ensure users can only access data they are authorised to see.</li>
            <li><strong>Password security:</strong> Passwords are hashed using industry-standard algorithms and never stored in plain text.</li>
            <li><strong>Two-Factor Authentication (2FA):</strong> TOTP-based two-factor authentication is available for all users and mandatory for administrators.</li>
            <li><strong>Secure document storage:</strong> Verification documents are stored in private, access-controlled storage buckets.</li>
            <li><strong>Payment security:</strong> Card payments are processed by Paystack (PCI-DSS Level 1 compliant). We never store card numbers.</li>
            <li><strong>Admin audit trails:</strong> Administrative actions are logged for accountability and oversight.</li>
          </ul>
          <p className="mt-2">
            Despite these measures, no method of transmission or storage is 100% secure.
            If you discover a security vulnerability, please report it to support@zande.io
            immediately.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">10. Cookies</h2>
          <p>The Platform uses the following types of cookies:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Essential cookies:</strong> Required for authentication, session management, and security. These cannot be disabled as the Platform cannot function without them.</li>
            <li><strong>Functional cookies:</strong> Remember your preferences (e.g., language, theme). Used to improve your experience.</li>
          </ul>
          <p className="mt-2">
            We do <strong>not</strong> use advertising or tracking cookies. We do not use
            third-party analytics that track individual users. You can manage cookies through
            your browser settings, but disabling essential cookies will prevent you from
            using the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">11. Children&apos;s Privacy</h2>
          <p>
            The Platform is not intended for persons under the age of 18. We do not knowingly
            collect personal information from children. If we become aware that a child under
            18 has provided us with personal information, we will take steps to delete it.
            If you believe we have collected information from a child, please contact us at
            info@zande.io.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">12. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Material changes will be
            communicated via email or in-app notification at least 14 days before they take
            effect. The &quot;Last updated&quot; date at the top of this page indicates when
            the policy was last revised.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">13. Contact and Complaints</h2>
          <p>For privacy-related queries, data subject requests, or complaints:</p>
          <ul className="list-none mt-2 space-y-1">
            <li><strong>Zande Technologies (Pty) Ltd</strong></li>
            <li>Information Officer Email: info@zande.io</li>
            <li>Support: support@zande.io</li>
            <li>Information Regulator Ref: 2025-066656</li>
          </ul>
          <p className="mt-3">
            If you are not satisfied with our response, you may lodge a complaint with the
            Information Regulator of South Africa:
          </p>
          <ul className="list-none mt-2 space-y-1">
            <li>Email: enquiries@inforegulator.org.za</li>
            <li>Website: www.justice.gov.za/inforeg</li>
            <li>Tel: 012 406 4818</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">14. Applicable Law</h2>
          <p>
            This Privacy Policy is governed by the laws of the Republic of South Africa,
            including the Protection of Personal Information Act 4 of 2013 (POPIA),
            the Electronic Communications and Transactions Act 25 of 2002 (ECTA), and
            the Consumer Protection Act 68 of 2008 (CPA).
          </p>
        </section>

        <p className="mt-8 pt-4 border-t text-muted-foreground">
          For our full terms of use, see our{' '}
          <Link href="/terms" className="underline underline-offset-2">Terms of Service</Link>.
          For refund and cancellation information, see our{' '}
          <Link href="/refunds" className="underline underline-offset-2">Refund Policy</Link>.
        </p>
      </div>
    </div>
  )
}
