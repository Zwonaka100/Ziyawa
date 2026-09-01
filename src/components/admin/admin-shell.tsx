'use client'

import { Suspense, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  Calendar,
  AlertTriangle,
  Scale,
  ShieldCheck,
  MessageSquare,
  Mail,
  DollarSign,
  BarChart3,
  Settings,
  FileText,
  Shield,
  Mic2,
  Briefcase,
  Menu,
  X,
  LogOut,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Artists', href: '/admin/artists', icon: Mic2 },
  { name: 'Crew', href: '/admin/crew', icon: Briefcase },
  { name: 'Events', href: '/admin/events', icon: Calendar },
  { name: 'Reports', href: '/admin/reports', icon: AlertTriangle },
  { name: 'Disputes', href: '/admin/disputes', icon: Scale },
  { name: 'Verifications', href: '/admin/verifications', icon: ShieldCheck },
  { name: 'Reviews', href: '/admin/reviews', icon: Star },
  { name: 'Support Tickets', href: '/admin/support', icon: MessageSquare },
  { name: 'Communications', href: '/admin/communications', icon: Mail },
  { name: 'Finance', href: '/admin/finance', icon: DollarSign },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Audit Logs', href: '/admin/audit-logs', icon: FileText },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

interface AdminShellProps {
  adminName: string | null
  adminRole: string | null
  children: React.ReactNode
}

/**
 * The admin chrome: sidebar, navigation, sign-out.
 *
 * Purely presentational as far as access goes. Admin identity arrives as props
 * from the server layout, which has already established that this person is an
 * admin — so there is no access check here, no profile query, and no spinner
 * while one resolves. If you are seeing this component, the server decided you
 * should.
 */
export function AdminShell({ adminName, adminRole, children }: AdminShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const currentSection = navigation.find(
    (n) => pathname === n.href || (n.href !== '/admin' && pathname.startsWith(n.href))
  )

  return (
    <div className="min-h-screen bg-neutral-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-neutral-900 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 border-b border-neutral-800">
            <Link href="/admin" className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              <span className="font-bold text-xl">Admin</span>
            </Link>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/admin' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                {adminName?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{adminName}</p>
                <p className="text-xs text-neutral-400 capitalize">
                  {adminRole?.replace('_', ' ')}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full mt-3 text-neutral-300 hover:text-white hover:bg-neutral-800"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 h-16 bg-white border-b flex items-center px-4 lg:px-6">
          <button className="lg:hidden mr-4" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1">
            <h1 className="text-lg font-semibold">{currentSection?.name || 'Admin Panel'}</h1>
          </div>

          <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
            View Site →
          </Link>
        </header>

        <main className="p-4 lg:p-6">
          <Suspense
            fallback={
              <div className="flex min-h-[240px] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            }
          >
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  )
}
