'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { 
  Music, 
  Calendar, 
  Menu, 
  X, 
  User, 
  LogOut,
  Wallet,
  Ticket,
  Mic2,
  Users,
  Wrench,
  MessageSquare,
  Search
} from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'

// Get primary role for display
function getDisplayRole(profile: { is_admin?: boolean; is_organizer?: boolean; is_artist?: boolean; is_provider?: boolean }) {
  const roles = []
  if (profile.is_admin) roles.push('Admin')
  if (profile.is_organizer) roles.push('Organiser')
  if (profile.is_artist) roles.push('Artist')
  if (profile.is_provider) roles.push('Provider')
  return roles.length > 0 ? roles.join(' • ') : 'Groovist'
}

export function Navbar() {
  const { user, profile, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const navLinks = [
    { href: '/ziwaphi', label: 'Ziwaphi?', icon: Calendar },
    { href: '/artists', label: 'Artists', icon: Music },
    { href: '/crew', label: 'Crew', icon: Users },
  ]

  const isActive = (href: string) => pathname.startsWith(href)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/ziwaphi?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary">Ziyawa</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center space-x-1 text-sm font-medium transition-colors hover:text-primary ${
                  isActive(link.href) ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <link.icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden lg:flex items-center max-w-sm flex-1 mx-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 h-9 w-full bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-purple-500"
              />
            </div>
          </form>

          {/* User Menu / Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user && profile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback>
                        {profile.full_name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[100px] truncate">{profile.full_name || profile.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{profile.full_name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{getDisplayRole(profile)}</p>
                  </div>
                  <DropdownMenuSeparator />
                  
                  {/* Messages */}
                  <DropdownMenuItem asChild>
                    <Link href="/messages" className="flex items-center">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Messages
                    </Link>
                  </DropdownMenuItem>
                  
                  {/* Always show My Tickets */}
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/tickets" className="flex items-center">
                      <Ticket className="mr-2 h-4 w-4" />
                      My Tickets
                    </Link>
                  </DropdownMenuItem>

                  {/* Show Organiser features if unlocked */}
                  {profile.is_organizer && (
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/organizer" className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4" />
                        My Events
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {/* Show Artist features if unlocked */}
                  {profile.is_artist && (
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/artist" className="flex items-center">
                        <Mic2 className="mr-2 h-4 w-4" />
                        Artist Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {/* Show Provider features if unlocked */}
                  {profile.is_provider && (
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/provider" className="flex items-center">
                        <Wrench className="mr-2 h-4 w-4" />
                        Provider Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/wallet" className="flex items-center justify-between w-full">
                      <span className="flex items-center">
                        <Wallet className="mr-2 h-4 w-4" />
                        Wallet
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(profile.wallet_balance)}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/auth/signin">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button>Get Started</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-4">
              {/* Mobile Search */}
              <form onSubmit={(e) => { handleSearch(e); setMobileMenuOpen(false); }} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 h-10 w-full"
                />
              </form>

              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-2 text-sm font-medium ${
                    isActive(link.href) ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <link.icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              ))}

              <div className="pt-4 border-t">
                {user && profile ? (
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback>
                          {profile.full_name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{profile.full_name || 'User'}</p>
                        <p className="text-xs text-muted-foreground">{getDisplayRole(profile)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Link href="/dashboard/tickets" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full justify-start">
                          <Ticket className="mr-2 h-4 w-4" />
                          My Tickets
                        </Button>
                      </Link>
                      {profile.is_organizer && (
                        <Link href="/dashboard/organizer" onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="outline" className="w-full justify-start">
                            <Calendar className="mr-2 h-4 w-4" />
                            My Events
                          </Button>
                        </Link>
                      )}
                      {profile.is_artist && (
                        <Link href="/dashboard/artist" onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="outline" className="w-full justify-start">
                            <Mic2 className="mr-2 h-4 w-4" />
                            Artist Dashboard
                          </Button>
                        </Link>
                      )}
                      {profile.is_provider && (
                        <Link href="/dashboard/provider" onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="outline" className="w-full justify-start">
                            <Wrench className="mr-2 h-4 w-4" />
                            Provider Dashboard
                          </Button>
                        </Link>
                      )}
                      <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full justify-start">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Button>
                      </Link>
                      <Link href="/wallet" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full justify-start">
                          <Wallet className="mr-2 h-4 w-4" />
                          Wallet ({formatCurrency(profile.wallet_balance)})
                        </Button>
                      </Link>
                    </div>
                    <Button variant="destructive" onClick={signOut} className="w-full">
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2">
                    <Link href="/auth/signin" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full">Sign In</Button>
                    </Link>
                    <Link href="/auth/signup" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full">Get Started</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
