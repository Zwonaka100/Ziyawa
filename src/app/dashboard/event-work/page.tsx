'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Users } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent } from '@/components/ui/card'

export default function EventWorkPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/signin?next=/dashboard/provider')
      return
    }

    if (!authLoading && user) {
      router.replace('/dashboard/provider')
    }
  }, [authLoading, router, user])

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-2xl mx-auto">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Users className="h-5 w-5 text-primary" />
          <Loader2 className="h-4 w-4 animate-spin" />
          Opening your Crew Dashboard...
        </CardContent>
      </Card>
    </div>
  )
}
