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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { formatDate, formatTime } from '@/lib/helpers'
import {
  Scan,
  Camera,
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
  UserPlus,
  Gift,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Event {
  id: string
  title: string
  event_date: string
  start_time: string
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

interface AccessPass {
  id: string
  full_name: string
  code: string
  pass_type: string
  checked_in: boolean
}

export default function EventCheckinPage() {
  const params = useParams()
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  
  const [event, setEvent] = useState<Event | null>(null)
  const [roleLabel, setRoleLabel] = useState('Event Team')
  const [isOwner, setIsOwner] = useState(false)
  const [canManageGuestList, setCanManageGuestList] = useState(false)
  const [loading, setLoading] = useState(true)
  const [manualCode, setManualCode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [confirmingCheckin, setConfirmingCheckin] = useState(false)
  const [lastScan, setLastScan] = useState<ScanResult | null>(null)
  const [attendance, setAttendance] = useState<AttendanceStats>({ checkedIn: 0, total: 0 })
  const [recentCheckins, setRecentCheckins] = useState<Array<{
    code: string
    holder: string
    time: string
  }>>([])
  const [accessPasses, setAccessPasses] = useState<AccessPass[]>([])
  const [creatingPass, setCreatingPass] = useState(false)
  const [passForm, setPassForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    passType: 'guest_list',
    quantity: '1',
    notes: '',
  })
  
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const scanFrameRef = useRef<number | null>(null)
  const eventId = params.id as string

  // Load event data
  useEffect(() => {
    async function loadEvent() {
      if (!eventId) return

      try {
        const response = await fetch(`/api/events/${eventId}/team-access`, { cache: 'no-store' })
        const data = await response.json()

        if (!response.ok || !data.event) {
          toast.error(data.error || 'Not authorized')
          router.push('/dashboard/provider')
          return
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const eventDate = new Date(data.event.event_date)
        eventDate.setHours(0, 0, 0, 0)

        if (eventDate < today) {
          toast.error('Check-in is closed for past events')
          router.push(data.isOwner ? `/dashboard/organizer/events/${eventId}/manage` : '/dashboard/provider')
          return
        }

        setEvent(data.event)
        setIsOwner(Boolean(data.isOwner))
        setRoleLabel(String(data.roleLabel || 'Event Team'))
        setCanManageGuestList(Boolean(data.permissions?.canManageGuestList))

        await refreshAttendance()
        await loadGuestList()
      } catch (error) {
        console.error('Check-in event load error:', error)
        toast.error('Failed to load event tools')
      } finally {
        setLoading(false)
      }
    }

    if (profile) {
      loadEvent()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, profile, router])

  // Refresh attendance stats
  const refreshAttendance = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/attendance`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to refresh attendance')
      }

      setAttendance({
        checkedIn: Number(data.stats?.checkedIn || 0),
        total: Number(data.stats?.totalTickets || 0),
      })
    } catch (error) {
      console.error('Attendance refresh error:', error)
    }
  }, [eventId])

  const loadGuestList = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/guest-list`)
      const data = await response.json()
      if (response.ok) {
        setAccessPasses(data.passes || [])
      }
    } catch (error) {
      console.error('Guest list load error:', error)
    }
  }, [eventId])

  const stopCameraScanner = useCallback(() => {
    if (scanFrameRef.current) {
      cancelAnimationFrame(scanFrameRef.current)
      scanFrameRef.current = null
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    setCameraOpen(false)
    setCameraStarting(false)
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleCheckin = async (code: string) => {
    if (!code.trim() || scanning) return

    setScanning(true)
    setLastScan(null)

    try {
      const response = await fetch('/api/tickets/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketCode: code.trim(),
          eventId,
        }),
      })

      const data = await response.json()
      const holderName = typeof data.ticket?.holder === 'string'
        ? data.ticket.holder
        : data.ticket?.holder?.full_name || 'Guest'

      const resolvedTicket = data.ticket
        ? {
            id: String(data.ticket.id || ''),
            code: String(data.ticket.code || data.ticket.ticket_code || code.trim().toUpperCase()),
            type: String(data.ticket.type || data.ticket.ticket_type || 'Entry'),
            holder: holderName,
            checkedInAt: data.ticket.checkedInAt || data.ticket.checked_in_at,
          }
        : undefined

      if (data.status === 'valid') {
        setLastScan({
          success: false,
          status: 'valid',
          message: 'Ticket verified. Confirm the name below before checking in.',
          ticket: resolvedTicket,
        })
        toast.success('Ticket verified — ready to confirm')
      } else if (data.status === 'used') {
        setLastScan({
          success: false,
          status: 'used',
          message: data.message,
          ticket: resolvedTicket,
        })
        toast.warning('This attendee is already checked in')
      } else {
        setLastScan({
          success: false,
          status: 'invalid',
          message: data.message || data.error || 'Ticket is not valid for check-in',
          ticket: resolvedTicket,
        })
        toast.error(data.message || data.error || 'Ticket could not be verified')
      }
    } catch {
      setLastScan({
        success: false,
        status: 'error',
        message: 'Validation failed. Please try again.',
      })
      toast.error('Validation failed')
    } finally {
      setScanning(false)
      inputRef.current?.focus()
    }
  }

  const handleConfirmCheckin = async () => {
    if (!lastScan?.ticket?.code || confirmingCheckin) return

    setConfirmingCheckin(true)
    try {
      const response = await fetch('/api/tickets/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketCode: lastScan.ticket.code,
          eventId,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Check-in failed')
      }

      setLastScan({
        success: true,
        status: 'valid',
        message: data.message,
        ticket: data.ticket,
      })

      if (data.attendance) {
        setAttendance(data.attendance)
      }

      setRecentCheckins(prev => [{
        code: data.ticket.code,
        holder: data.ticket.holder,
        time: new Date().toLocaleTimeString(),
      }, ...prev.slice(0, 9)])

      setManualCode('')
      toast.success(`✅ ${data.ticket.holder} checked in!`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Check-in failed')
    } finally {
      setConfirmingCheckin(false)
      inputRef.current?.focus()
    }
  }

  const startCameraScanner = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const message = 'This device does not support camera scanning yet. Use the scanner field or enter the code manually.'
      setCameraError(message)
      toast.error(message)
      return
    }

    if (!("BarcodeDetector" in window)) {
      const message = 'Camera scan is not supported in this browser yet. Use the scanner field or enter the code manually.'
      setCameraError(message)
      toast.error(message)
      return
    }

    try {
      setCameraError('')
      setCameraStarting(true)
      setCameraOpen(true)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })

      mediaStreamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      const Detector = (window as Window & { BarcodeDetector?: new (options?: { formats?: string[] }) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>> } }).BarcodeDetector
      if (!Detector) {
        throw new Error('Barcode detector unavailable')
      }

      const detector = new Detector({ formats: ['qr_code', 'code_128', 'ean_13', 'ean_8'] })

      const scanLoop = async () => {
        if (!videoRef.current) return

        try {
          const codes = await detector.detect(videoRef.current)
          const value = String(codes?.[0]?.rawValue || '').trim()

          if (value) {
            setManualCode(value.toUpperCase())
            stopCameraScanner()
            handleCheckin(value)
            return
          }
        } catch {
          // ignore detection frame errors and keep scanning
        }

        scanFrameRef.current = requestAnimationFrame(scanLoop)
      }

      scanFrameRef.current = requestAnimationFrame(scanLoop)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Camera access failed'
      setCameraError(message)
      toast.error(message)
      stopCameraScanner()
    } finally {
      setCameraStarting(false)
    }
  }, [handleCheckin, stopCameraScanner])

  const handleCreatePass = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!passForm.fullName.trim()) {
      toast.error('Guest name is required')
      return
    }

    setCreatingPass(true)
    try {
      const response = await fetch(`/api/events/${eventId}/guest-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passForm),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create guest pass')
      }

      toast.success(`Created ${data.passes?.length || 1} access pass${(data.passes?.length || 1) > 1 ? 'es' : ''}`)
      setPassForm({
        fullName: '',
        email: '',
        phone: '',
        passType: 'guest_list',
        quantity: '1',
        notes: '',
      })
      await loadGuestList()
      await refreshAttendance()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create guest pass')
    } finally {
      setCreatingPass(false)
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

  useEffect(() => {
    return () => {
      if (scanFrameRef.current) {
        cancelAnimationFrame(scanFrameRef.current)
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

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
              <Link href={isOwner ? '/dashboard/organizer' : '/dashboard/provider'}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-bold text-lg">{event.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {formatDate(event.event_date)} • {formatTime(event.start_time)}
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {!isOwner && <Badge variant="secondary">{roleLabel}</Badge>}
                  {!isOwner && <Badge variant="outline">Working this event</Badge>}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isOwner ? (
                <Link href={`/dashboard/organizer/events/${event.id}/manage`}>
                  <Button variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Event
                  </Button>
                </Link>
              ) : (
                <Link href="/dashboard/provider">
                  <Button variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Crew Dashboard
                  </Button>
                </Link>
              )}
              <Button variant="outline" size="sm" onClick={refreshAttendance}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
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
                    <div className="h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">
                        {attendance.checkedIn} / {attendance.total}
                      </p>
                      <p className="text-muted-foreground">Checked In</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-bold text-primary">{attendancePercent}%</p>
                    <p className="text-sm text-muted-foreground">Attendance</p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-neutral-900 transition-all duration-500"
                    style={{ width: `${attendancePercent}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Manual Entry */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scan className="h-5 w-5" />
                  Door scanner
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      inputRef.current?.focus()
                      setLastScan(null)
                      toast.success('Scanner ready — scan now or paste the code here')
                    }}
                  >
                    <Scan className="h-4 w-4 mr-2" />
                    Ready for scanner
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (cameraOpen) {
                        stopCameraScanner()
                      } else {
                        startCameraScanner()
                      }
                    }}
                    disabled={cameraStarting}
                  >
                    {cameraStarting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                    {cameraOpen ? 'Close camera' : 'Use camera'}
                  </Button>
                </div>

                {cameraOpen && (
                  <div className="overflow-hidden rounded-lg border bg-black">
                    <video ref={videoRef} className="h-72 w-full object-cover" autoPlay playsInline muted />
                    <div className="bg-white p-3 text-sm text-muted-foreground">
                      Point the attendee QR code at the camera.
                    </div>
                  </div>
                )}

                {cameraError && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                    {cameraError}
                  </div>
                )}

                <form onSubmit={handleManualSubmit} className="flex gap-3">
                  <Input
                    ref={inputRef}
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder="Tap Ready for scanner, use Camera, or enter the ticket code"
                    className="font-mono text-lg"
                    disabled={scanning}
                    autoComplete="off"
                  />
                  <Button type="submit" disabled={!manualCode.trim() || scanning} size="lg">
                    {scanning ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Search className="h-5 w-5 mr-2" />
                        Verify
                      </>
                    )}
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground">
                  The input box is the live capture field for a handheld scanner. The new camera button can also scan directly in-browser when the device allows it.
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
                        {lastScan.status === 'valid' && (lastScan.success ? 'Check-In Successful!' : 'Ticket Verified')} 
                        {lastScan.status === 'used' && 'Already Checked In'}
                        {lastScan.status === 'invalid' && 'Invalid Ticket'}
                        {lastScan.status === 'error' && 'Error'}
                      </h3>
                      <p className="text-muted-foreground">{lastScan.message}</p>
                      
                      {lastScan.ticket && (
                        <div className="mt-3 space-y-3">
                          <div className="flex items-center gap-4 flex-wrap">
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

                          {lastScan.status === 'valid' && !lastScan.success && (
                            <div className="flex gap-2 flex-wrap">
                              <Button onClick={handleConfirmCheckin} disabled={confirmingCheckin}>
                                {confirmingCheckin ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                Confirm check-in
                              </Button>
                              <Button variant="outline" onClick={() => setLastScan(null)}>
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Safer door flow
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-lg bg-muted p-3">
                  <p className="font-medium">How to use it</p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    <li>• Scan the attendee QR/barcode or enter the code</li>
                    <li>• Review the person’s details on screen</li>
                    <li>• Tap confirm only after verifying the right person</li>
                  </ul>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="font-medium">People & guest list</p>
                  <p className="text-muted-foreground mt-1">
                    {canManageGuestList
                      ? 'You can add guest or comp access for this event directly from this workspace.'
                      : 'You can verify arrivals here. Guest-list changes stay with the organiser or guest-list lead.'}
                  </p>
                  <p className="mt-2 text-muted-foreground">Guest / comp passes on this event: {accessPasses.length}</p>
                  {isOwner && (
                    <Link href={`/dashboard/organizer/events/${event.id}/manage`}>
                      <Button variant="outline" className="mt-3 w-full">Open people manager</Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>

            {canManageGuestList && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-pink-600" />
                    Guest & comp access
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleCreatePass} className="space-y-3">
                    <Input
                      placeholder="Guest full name"
                      value={passForm.fullName}
                      onChange={(e) => setPassForm(prev => ({ ...prev, fullName: e.target.value }))}
                    />
                    <Input
                      placeholder="Email (optional)"
                      value={passForm.email}
                      onChange={(e) => setPassForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Phone"
                        value={passForm.phone}
                        onChange={(e) => setPassForm(prev => ({ ...prev, phone: e.target.value }))}
                      />
                      <Select
                        value={passForm.passType}
                        onValueChange={(value) => setPassForm(prev => ({ ...prev, passType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="guest_list">Guest List</SelectItem>
                          <SelectItem value="comp">Complimentary</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="media">Media</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Quantity"
                        type="number"
                        min="1"
                        max="20"
                        value={passForm.quantity}
                        onChange={(e) => setPassForm(prev => ({ ...prev, quantity: e.target.value }))}
                      />
                      <Button type="submit" disabled={creatingPass}>
                        {creatingPass ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                        Add pass
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Notes for the door team"
                      value={passForm.notes}
                      onChange={(e) => setPassForm(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                    />
                  </form>

                  <div className="space-y-2">
                    {accessPasses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No guest or comp passes yet.</p>
                    ) : (
                      accessPasses.slice(0, 6).map((pass) => (
                        <div key={pass.id} className="rounded-md border p-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-sm">{pass.full_name}</p>
                            <Badge variant={pass.checked_in ? 'default' : 'outline'}>
                              {pass.pass_type.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mt-1">{pass.code}</p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

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
