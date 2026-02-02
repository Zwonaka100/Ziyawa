import Link from 'next/link'
import { PLATFORM_CONFIG } from '@/lib/constants'

export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-primary">{PLATFORM_CONFIG.name}</h3>
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
            </ul>
          </div>

          {/* For You */}
          <div className="space-y-4">
            <h4 className="font-semibold">For You</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/auth/signup" className="hover:text-primary">
                  Become an Organizer
                </Link>
              </li>
              <li>
                <Link href="/auth/signup" className="hover:text-primary">
                  Join as an Artist
                </Link>
              </li>
              <li>
                <Link href="/auth/signup" className="hover:text-primary">
                  Sign Up
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>hello@ziyawa.co.za</li>
              <li>South Africa</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
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
