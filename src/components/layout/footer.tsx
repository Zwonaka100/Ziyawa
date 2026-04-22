import Link from 'next/link'
import { PLATFORM_CONFIG } from '@/lib/constants'
import { ZiyawaLogo } from '@/components/brand/ziyawa-logo'

const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'info@zande.io'

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><circle cx="12" cy="12" r="5" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <ZiyawaLogo size={28} className="text-neutral-900" />
              <span className="text-lg font-bold text-primary">{PLATFORM_CONFIG.name}</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              {PLATFORM_CONFIG.tagline}
            </p>
            <p className="text-sm text-muted-foreground">
              Connecting event organizers, artists, and groovists across South Africa.
            </p>
          </div>

          {/* Discover */}
          <div className="space-y-4">
            <h4 className="font-semibold">Discover</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/ziwaphi" className="hover:text-primary">
                  Ziwaphi? (Events)
                </Link>
              </li>
              <li>
                <Link href="/artists" className="hover:text-primary">
                  Artist Directory
                </Link>
              </li>
              <li>
                <Link href="/crew" className="hover:text-primary">
                  Crew Directory
                </Link>
              </li>
            </ul>
          </div>

          {/* For You */}
          <div className="space-y-4">
            <h4 className="font-semibold">For You</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/for/groovists" className="hover:text-primary">
                  For Groovists
                </Link>
              </li>
              <li>
                <Link href="/for/organizers" className="hover:text-primary">
                  For Organizers
                </Link>
              </li>
              <li>
                <Link href="/for/artists" className="hover:text-primary">
                  For Artists
                </Link>
              </li>
              <li>
                <Link href="/for/crew" className="hover:text-primary">
                  For Crew
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h4 className="font-semibold">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/about" className="hover:text-primary">About</Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-primary">FAQ</Link>
              </li>
              <li>
                <Link href="/support" className="hover:text-primary">Support</Link>
              </li>
              <li>{contactEmail}</li>
              <li>South Africa</li>
            </ul>
            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-2">
              <a href="#" aria-label="Instagram" className="text-muted-foreground hover:text-primary transition-colors">
                <InstagramIcon className="h-5 w-5" />
              </a>
              <a href="#" aria-label="Facebook" className="text-muted-foreground hover:text-primary transition-colors">
                <FacebookIcon className="h-5 w-5" />
              </a>
              <a href="#" aria-label="X (Twitter)" className="text-muted-foreground hover:text-primary transition-colors">
                <XIcon className="h-5 w-5" />
              </a>
              <a href="#" aria-label="LinkedIn" className="text-muted-foreground hover:text-primary transition-colors">
                <LinkedInIcon className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Legal Links */}
        <div className="mt-8 pt-8 border-t flex flex-wrap gap-6 text-sm text-muted-foreground md:justify-center">
          <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
          <Link href="/refunds" className="hover:text-primary">Refund Policy</Link>
        </div>

        <div className="mt-6 pt-6 border-t text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {PLATFORM_CONFIG.name}. All rights reserved.</p>
          <p className="mt-1">Made with ❤️ in South Africa</p>
          <p className="mt-2">
            Built by{' '}
            <a 
              href="https://zande.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Zande Technologies
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
