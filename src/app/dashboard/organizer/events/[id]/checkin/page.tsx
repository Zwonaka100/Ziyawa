'use client'

/**
 * EVENT CHECK-IN PAGE
 * /dashboard/organizer/events/[id]/checkin
 * 
 * Scanner interface for door staff to check in attendees
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { formatDate, formatTime } from '@/lib/helpers'
import {
  Scan,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Search,
  ArrowLeft,
  Loader2,
  User,
  Ticket,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Event {
  id: string
  title: string
  date: string
  time: string
  venue: string
  tickets_sold: number
}

interface ScanResult {
  success: boolean
  status: 'valid' | 'used' | 'invalid' | 'error'
  message: string
  ticket?: {
    id: string
    code: string
    type: string
    holder: string
    checkedInAt?: string
  }
}

interface AttendanceStats {
  checkedIn: number
  total: number
}

export default function EventCheckinPage() {
  const params = useParams()
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const supabase = createClient()
  
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [manualCode, setManualCode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState<ScanResult | null>(null)
  const [attendance, setAttendance] = useState<AttendanceStats>({ checkedIn: 0, total: 0 })
  const [recentCheckins, setRecentCheckins] = useState<Array<{
    code: string
    holder: string
    time: string
  }>>([])
  
  const inputRef = useRef<HTMLInputElement>(null)
  const eventId = params.id as string

  // Load event data
  useEffect(() => {
    async function loadEvent() {
      if (!eventId) return

      const { data, error } = await supabase
        .from('events')
        .select('id, title, date, time, venue, tickets_sold, organizer_id')
        .eq('id', eventId)
        .single()

      if (error || !data) {
        toast.error('Event not found')
        router.push('/dashboard/organizer/events')
        return
      }

      // Check authorization
      if (data.organizer_id !== profile?.id) {
        toast.error('Not authorized')
        router.push('/dashboard/organizer/events')
        return
      }

      setEvent(data)
      
      // Get attendance stats
      await refreshAttendance()
      
      setLoading(false)
    }

    if (profile) {
      loadEvent()
    }
  }, [eventId, profile, supabase, router])

  // Refresh attendance stats
  const refreshAttendance = useCallback(async () => {
    const { count: checkedIn } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('checked_in', true)

    const { count: total } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

    setAttendance({
      checkedIn: checkedIn || 0,
      total: total || 0,
    })
  }, [eventId, supabase])

  // Handle check-in
  const handleCheckin = async (code: string) => {
    if (!code.trim() || scanning) return

    setScanning(true)
    setLastScan(null)

    try {
      const response = await fetch('/api/tickets/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketCode: code.trim(),
          eventId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setLastScan({
          success: true,
          status: 'valid',
          message: data.message,
          ticket: data.ticket,
        })

        // Update attendance
        if (data.attendance) {
          setAttendance(data.attendance)
        }

        // Add to recent check-ins
        setRecentCheckins(prev => [{
          code: data.ticket.code,
          holder: data.ticket.holder,
          time: new Date().toLocaleTimeString(),
        }, ...prev.slice(0, 9)])

        toast.success(`✅ ${data.ticket.holder} checked in!`)
      } else if (data.alreadyCheckedIn) {
        setLastScan({
          success: false,
          status: 'used',
          message: data.message,
          ticket: data.ticket,
        })
        toast.warning('Ticket already used')
      } else {
        setLastScan({
          success: false,
          status: 'invalid',
          message: data.message || data.error,
        })
        toast.error(data.message || data.error)
      }
    } catch (error) {
      setLastScan({
        success: false,
        status: 'error',
        message: 'Check-in failed. Please try again.',
      })
      toast.error('Check-in failed')
    } finally {
      setScanning(false)
      setManualCode('')
      inputRef.current?.focus()
    }
  }

  // Handle manual code submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleCheckin(manualCode)
  }

  // Auto-focus input
  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus()
    }
  }, [loading])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!event) return null

  const attendancePercent = attendance.total > 0 
    ? Math.round((attendance.checkedIn / attendance.total) * 100) 
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/dashboard/organizer/events/${eventId}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-bold text-lg">{event.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {formatDate(event.date)} • {formatTime(event.time)}
                </p>
              </div>
            </div>
            
            <Button variant="outline" size="sm" onClick={refreshAttendance}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Scanner Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Attendance Stats */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center">
                      <Users className="h-8 w-8 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">
                        {attendance.checkedIn} / {attendance.total}
                      </p>
                      <p className="text-muted-foreground">Checked In</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-bold text-purple-600">{attendancePercent}%</p>
                    <p className="text-sm text-muted-foreground">Attendance</p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-600 transition-all duration-500"
                    style={{ width: `${attendancePercent}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Manual Entry */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Manual Entry
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleManualSubmit} className="flex gap-3">
                  <Input
                    ref={inputRef}
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder="Enter ticket code (e.g., ZIY-XXXX-XXXX)"
                    className="font-mono text-lg"
                    disabled={scanning}
                    autoComplete="off"
                  />
                  <Button type="submit" disabled={!manualCode.trim() || scanning} size="lg">
                    {scanning ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Scan className="h-5 w-5 mr-2" />
                        Check In
                      </>
                    )}
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-2">
                  Tip: Use a barcode scanner for faster check-ins
                </p>
              </CardContent>
            </Card>

            {/* Last Scan Result */}
            {lastScan && (
              <Card className={cn(
                "border-2 transition-all",
                lastScan.status === 'valid' && "border-green-500 bg-green-50",
                lastScan.status === 'used' && "border-yellow-500 bg-yellow-50",
                lastScan.status === 'invalid' && "border-red-500 bg-red-50",
                lastScan.status === 'error' && "border-red-500 bg-red-50"
              )}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "h-16 w-16 rounded-full flex items-center justify-center flex-shrink-0",
                      lastScan.status === 'valid' && "bg-green-100",
                      lastScan.status === 'used' && "bg-yellow-100",
                      (lastScan.status === 'invalid' || lastScan.status === 'error') && "bg-red-100"
                    )}>
                      {lastScan.status === 'valid' && <CheckCircle className="h-8 w-8 text-green-600" />}
                      {lastScan.status === 'used' && <AlertCircle className="h-8 w-8 text-yellow-600" />}
                      {(lastScan.status === 'invalid' || lastScan.status === 'error') && (
                        <XCircle className="h-8 w-8 text-red-600" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className={cn(
                        "text-xl font-bold",
                        lastScan.status === 'valid' && "text-green-700",
                        lastScan.status === 'used' && "text-yellow-700",
                        (lastScan.status === 'invalid' || lastScan.status === 'error') && "text-red-700"
                      )}>
                        {lastScan.status === 'valid' && 'Check-In Successful!'}
                        {lastScan.status === 'used' && 'Already Checked In'}
                        {lastScan.status === 'invalid' && 'Invalid Ticket'}
                        {lastScan.status === 'error' && 'Error'}
                      </h3>
                      <p className="text-muted-foreground">{lastScan.message}</p>
                      
                      {lastScan.ticket && (
                        <div className="mt-3 flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{lastScan.ticket.holder}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Ticket className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono">{lastScan.ticket.code}</span>
                          </div>
                          <Badge variant="outline">{lastScan.ticket.type}</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent Check-ins Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Recent Check-ins
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentCheckins.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No check-ins yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentCheckins.map((checkin, i) => (
                      <div 
                        key={`${checkin.code}-${i}`}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div>
                          <p className="font-medium">{checkin.holder}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {checkin.code}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {checkin.time}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
