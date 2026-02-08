/**
 * Ziyawa Storage Utilities
 * 
 * Centralized file upload/download utilities for Supabase Storage.
 * Handles all media uploads for artists, providers, organizers, and events.
 * 
 * Folder Structure:
 * - artists/{userId}/profile/   - Profile pictures
 * - artists/{userId}/cover/     - Cover/banner images  
 * - artists/{userId}/gallery/   - Portfolio photos/videos
 * - providers/{userId}/profile/
 * - providers/{userId}/cover/
 * - providers/{userId}/portfolio/
 * - organizers/{userId}/profile/
 * - organizers/{userId}/cover/
 * - organizers/{userId}/gallery/
 * - events/{eventId}/poster/
 * - events/{eventId}/gallery/
 * - events/{eventId}/promo/
 */

import { createClient } from '@/lib/supabase/client'

// Constants
const BUCKET_NAME = 'media'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

// User types for folder organization
export type UserType = 'artists' | 'providers' | 'organizers'
export type MediaFolder = 'profile' | 'cover' | 'gallery' | 'portfolio' | 'poster' | 'promo'

// Upload result type
export interface UploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

// File validation
export interface FileValidation {
  maxSize: number // in bytes
  allowedTypes: string[]
}

const IMAGE_VALIDATION: FileValidation = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
}

const VIDEO_VALIDATION: FileValidation = {
  maxSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime']
}

const AUDIO_VALIDATION: FileValidation = {
  maxSize: 20 * 1024 * 1024, // 20MB
  allowedTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav']
}

// =====================================================
// FILE VALIDATION
// =====================================================

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  validation: FileValidation
): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > validation.maxSize) {
    const maxMB = Math.round(validation.maxSize / (1024 * 1024))
    return { 
      valid: false, 
      error: `File too large. Maximum size is ${maxMB}MB` 
    }
  }

  // Check file type
  if (!validation.allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `Invalid file type. Allowed: ${validation.allowedTypes.join(', ')}` 
    }
  }

  return { valid: true }
}

/**
 * Get validation config based on file type
 */
export function getValidationForFile(file: File): FileValidation {
  if (file.type.startsWith('video/')) return VIDEO_VALIDATION
  if (file.type.startsWith('audio/')) return AUDIO_VALIDATION
  return IMAGE_VALIDATION
}

// =====================================================
// CORE UPLOAD FUNCTIONS
// =====================================================

/**
 * Generate unique filename with timestamp
 */
function generateFilename(originalName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const extension = originalName.split('.').pop()?.toLowerCase() || 'file'
  return `${timestamp}-${random}.${extension}`
}

/**
 * Upload a file to Supabase Storage
 * 
 * @param file - The file to upload
 * @param userType - 'artists' | 'providers' | 'organizers'
 * @param userId - The user's ID
 * @param folder - Subfolder: 'profile' | 'cover' | 'gallery' | 'portfolio'
 * @returns Upload result with URL or error
 */
export async function uploadUserFile(
  file: File,
  userType: UserType,
  userId: string,
  folder: MediaFolder
): Promise<UploadResult> {
  try {
    // Validate file
    const validation = getValidationForFile(file)
    const validationResult = validateFile(file, validation)
    
    if (!validationResult.valid) {
      return { success: false, error: validationResult.error }
    }

    const supabase = createClient()
    const filename = generateFilename(file.name)
    const path = `${userType}/${userId}/${folder}/${filename}`

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Storage upload error:', error)
      return { success: false, error: error.message }
    }

    // Get public URL
    const url = getPublicUrl(path)

    return { success: true, url, path }
  } catch (err) {
    console.error('Upload error:', err)
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Upload failed' 
    }
  }
}

/**
 * Upload event media (poster, gallery, promo)
 */
export async function uploadEventFile(
  file: File,
  eventId: string,
  folder: 'poster' | 'gallery' | 'promo'
): Promise<UploadResult> {
  try {
    // Validate file
    const validation = getValidationForFile(file)
    const validationResult = validateFile(file, validation)
    
    if (!validationResult.valid) {
      return { success: false, error: validationResult.error }
    }

    const supabase = createClient()
    const filename = generateFilename(file.name)
    const path = `events/${eventId}/${folder}/${filename}`

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Event upload error:', error)
      return { success: false, error: error.message }
    }

    const url = getPublicUrl(path)
    return { success: true, url, path }
  } catch (err) {
    console.error('Event upload error:', err)
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Upload failed' 
    }
  }
}

/**
 * Upload profile picture with automatic resize option
 */
export async function uploadProfilePicture(
  file: File,
  userType: UserType,
  userId: string
): Promise<UploadResult> {
  return uploadUserFile(file, userType, userId, 'profile')
}

/**
 * Upload cover/banner image
 */
export async function uploadCoverImage(
  file: File,
  userType: UserType,
  userId: string
): Promise<UploadResult> {
  return uploadUserFile(file, userType, userId, 'cover')
}

/**
 * Upload to gallery/portfolio
 */
export async function uploadGalleryItem(
  file: File,
  userType: UserType,
  userId: string
): Promise<UploadResult> {
  const folder = userType === 'providers' ? 'portfolio' : 'gallery'
  return uploadUserFile(file, userType, userId, folder)
}

// =====================================================
// DELETE FUNCTIONS
// =====================================================

/**
 * Delete a file from storage
 */
export async function deleteFile(path: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path])

    if (error) {
      console.error('Delete error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Delete error:', err)
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Delete failed' 
    }
  }
}

/**
 * Delete multiple files
 */
export async function deleteFiles(paths: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(paths)

    if (error) {
      console.error('Bulk delete error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Bulk delete error:', err)
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Delete failed' 
    }
  }
}

// =====================================================
// URL HELPERS
// =====================================================

/**
 * Get public URL for a file path
 */
export function getPublicUrl(path: string): string {
  if (!SUPABASE_URL) {
    console.warn('SUPABASE_URL not configured')
    return ''
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${path}`
}

/**
 * Extract path from full URL
 */
export function getPathFromUrl(url: string): string | null {
  if (!SUPABASE_URL) return null
  
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/`
  if (url.startsWith(prefix)) {
    return url.replace(prefix, '')
  }
  return null
}

// =====================================================
// VIDEO EMBED HELPERS
// =====================================================

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct ID
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) return match[1]
  }

  return null
}

/**
 * Extract TikTok video ID from URL
 */
export function extractTikTokId(url: string): string | null {
  if (!url) return null
  
  const pattern = /tiktok\.com\/@[\w.-]+\/video\/(\d+)/
  const match = url.match(pattern)
  return match?.[1] || null
}

/**
 * Extract Instagram post ID from URL
 */
export function extractInstagramId(url: string): string | null {
  if (!url) return null
  
  const pattern = /instagram\.com\/(?:p|reel)\/([^/?]+)/
  const match = url.match(pattern)
  return match?.[1] || null
}

/**
 * Get YouTube embed URL
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`
}

/**
 * Get YouTube thumbnail URL
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'hq' | 'maxres' = 'hq'): string {
  const qualityMap = {
    default: 'default',
    hq: 'hqdefault',
    maxres: 'maxresdefault'
  }
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`
}

// =====================================================
// SOCIAL MEDIA URL HELPERS
// =====================================================

export interface SocialLinkValidation {
  valid: boolean
  platform?: string
  error?: string
}

/**
 * Validate and identify social media URL
 */
export function validateSocialUrl(url: string): SocialLinkValidation {
  if (!url) return { valid: false, error: 'URL is required' }

  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    const platforms: Record<string, string[]> = {
      instagram: ['instagram.com', 'www.instagram.com'],
      twitter: ['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com'],
      tiktok: ['tiktok.com', 'www.tiktok.com'],
      facebook: ['facebook.com', 'www.facebook.com', 'fb.com', 'www.fb.com'],
      youtube: ['youtube.com', 'www.youtube.com', 'youtu.be'],
      linkedin: ['linkedin.com', 'www.linkedin.com'],
      soundcloud: ['soundcloud.com', 'www.soundcloud.com'],
      spotify: ['open.spotify.com', 'spotify.com']
    }

    for (const [platform, domains] of Object.entries(platforms)) {
      if (domains.some(d => hostname === d || hostname.endsWith('.' + d))) {
        return { valid: true, platform }
      }
    }

    // Allow custom website URLs
    return { valid: true, platform: 'website' }
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

/**
 * Clean and normalize social URL
 */
export function normalizeSocialUrl(url: string): string {
  if (!url) return ''
  
  // Add https if no protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }
  
  // Remove trailing slash
  return url.replace(/\/+$/, '')
}

// =====================================================
// LIST FILES
// =====================================================

/**
 * List files in a user's folder
 */
export async function listUserFiles(
  userType: UserType,
  userId: string,
  folder: MediaFolder
): Promise<{ files: string[]; error?: string }> {
  try {
    const supabase = createClient()
    const path = `${userType}/${userId}/${folder}`

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(path, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (error) {
      return { files: [], error: error.message }
    }

    const files = (data || [])
      .filter(f => f.name !== '.emptyFolderPlaceholder')
      .map(f => `${path}/${f.name}`)

    return { files }
  } catch (err) {
    return { 
      files: [], 
      error: err instanceof Error ? err.message : 'Failed to list files' 
    }
  }
}

/**
 * List event files
 */
export async function listEventFiles(
  eventId: string,
  folder: 'poster' | 'gallery' | 'promo'
): Promise<{ files: string[]; error?: string }> {
  try {
    const supabase = createClient()
    const path = `events/${eventId}/${folder}`

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(path, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (error) {
      return { files: [], error: error.message }
    }

    const files = (data || [])
      .filter(f => f.name !== '.emptyFolderPlaceholder')
      .map(f => `${path}/${f.name}`)

    return { files }
  } catch (err) {
    return { 
      files: [], 
      error: err instanceof Error ? err.message : 'Failed to list files' 
    }
  }
}

// =====================================================
// USAGE EXAMPLE
// =====================================================
// 
// import { uploadProfilePicture, uploadGalleryItem, deleteFile } from '@/lib/storage'
//
// // Upload profile picture
// const result = await uploadProfilePicture(file, 'artists', userId)
// if (result.success) {
//   console.log('Uploaded:', result.url)
//   // Save result.url to database (profile.profile_image)
// }
//
// // Upload to gallery
// const galleryResult = await uploadGalleryItem(file, 'artists', userId)
// if (galleryResult.success) {
//   // Add to media table
//   await supabase.from('media').insert({
//     profile_id: profileId,
//     type: 'image',
//     url: galleryResult.url,
//     storage_path: galleryResult.path
//   })
// }
//
// // Delete a file
// const deleteResult = await deleteFile(path)
//
