'use client'

import { useEffect, useState } from 'react'

interface EventWorkAssignment {
  id: string
  eventId: string
  role: string
  roleLabel?: string
  organizerName?: string
  organizerId?: string | null
  status: string
  isPast: boolean
  event?: {
    id: string
    title: string
    eventDate: string
    startTime: string
    venue: string
  } | null
}

export function useEventWork() {
  const [assignments, setAssignments] = useState<EventWorkAssignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadAssignments() {
      try {
        const response = await fetch('/api/event-work', { cache: 'no-store' })
        if (!response.ok) {
          if (!cancelled) {
            setAssignments([])
          }
          return
        }

        const data = await response.json()
        if (!cancelled) {
          setAssignments(Array.isArray(data.assignments) ? data.assignments : [])
        }
      } catch {
        if (!cancelled) {
          setAssignments([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadAssignments()

    return () => {
      cancelled = true
    }
  }, [])

  const activeCount = assignments.filter((assignment) => assignment.status === 'active' && !assignment.isPast).length

  return {
    assignments,
    activeCount,
    hasEventWork: assignments.length > 0,
    loading,
  }
}
