/**
 * Utility functions for Ziyawa
 */

import { PLATFORM_CONFIG } from './constants'

/**
 * Format currency in South African Rand
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

/**
 * Format time for display (24h format common in SA)
 */
export function formatTime(time: string): string {
  // Handle HH:mm:ss or HH:mm format
  const [hours, minutes] = time.split(':')
  return `${hours}:${minutes}`
}

/**
 * Calculate platform fee
 */
export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * (PLATFORM_CONFIG.platformFeePercent / 100) * 100) / 100
}

/**
 * Calculate net amount after platform fee
 */
export function calculateNetAmount(amount: number): number {
  return amount - calculatePlatformFee(amount)
}

/**
 * Generate a unique reference code
 */
export function generateReference(prefix: string = 'REF'): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

/**
 * Generate a ticket code
 */
export function generateTicketCode(): string {
  const random = Math.random().toString(36).substring(2, 10).toUpperCase()
  return `ZYW-${random}`
}

/**
 * Check if an event date is in the past
 */
export function isEventPast(eventDate: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(eventDate) < today
}

/**
 * Get days until event
 */
export function getDaysUntilEvent(eventDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const event = new Date(eventDate)
  const diff = event.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}
