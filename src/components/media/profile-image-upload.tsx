'use client'

/**
 * ProfileImageUpload Component
 * 
 * Circular avatar upload with camera icon overlay.
 * For profile pictures and logos.
 */

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Camera, Loader2, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProfileImageUploadProps {
  currentImage?: string | null
  onUpload: (file: File) => Promise<{ success: boolean; url?: string; error?: string }>
  size?: 'sm' | 'md' | 'lg' | 'xl'
  shape?: 'circle' | 'rounded'
  className?: string
  disabled?: boolean
  label?: string
}

export function ProfileImageUpload({
  currentImage,
  onUpload,
  size = 'lg',
  shape = 'circle',
  className,
  disabled = false,
  label = 'Change photo'
}: ProfileImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40'
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8'
  }

  const validateFile = (file: File): string | null => {
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

    if (file.size > maxSize) {
      return 'Image must be less than 5MB'
    }

    if (!allowedTypes.includes(file.type)) {
      return 'Only JPEG, PNG, and WebP images are allowed'
    }

    return null
  }

  const handleClick = () => {
    if (!disabled && !uploading) {
      inputRef.current?.click()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // Validate
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    // Show preview immediately
    const preview = URL.createObjectURL(file)
    setPreviewUrl(preview)
    setUploading(true)

    try {
      const result = await onUpload(file)
      
      if (!result.success) {
        setError(result.error || 'Upload failed')
        setPreviewUrl(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setPreviewUrl(null)
    } finally {
      setUploading(false)
      e.target.value = '' // Reset input
    }
  }

  const displayImage = previewUrl || currentImage

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div
        onClick={handleClick}
        className={cn(
          'relative cursor-pointer group',
          sizeClasses[size],
          shape === 'circle' ? 'rounded-full' : 'rounded-xl',
          'overflow-hidden bg-gray-100 border-2 border-gray-200',
          'transition-all hover:border-gray-300',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled || uploading}
        />

        {/* Image or Placeholder */}
        {displayImage ? (
          <Image
            src={displayImage}
            alt="Profile"
            fill
            className="object-cover"
            sizes={size === 'xl' ? '160px' : size === 'lg' ? '128px' : size === 'md' ? '96px' : '64px'}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <User className={cn('text-gray-400', iconSizes[size])} />
          </div>
        )}

        {/* Overlay */}
        <div 
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            'bg-black/0 group-hover:bg-black/50 transition-colors',
            uploading && 'bg-black/50'
          )}
        >
          {uploading ? (
            <Loader2 className={cn('text-white animate-spin', iconSizes[size])} />
          ) : (
            <Camera 
              className={cn(
                'text-white opacity-0 group-hover:opacity-100 transition-opacity',
                iconSizes[size]
              )} 
            />
          )}
        </div>
      </div>

      {/* Label */}
      {label && (
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || uploading}
          className="text-sm text-gray-600 hover:text-black transition-colors disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : label}
        </button>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 text-center max-w-[200px]">{error}</p>
      )}
    </div>
  )
}

/**
 * CoverImageUpload Component
 * 
 * Banner/cover image upload with aspect ratio.
 */
interface CoverImageUploadProps {
  currentImage?: string | null
  onUpload: (file: File) => Promise<{ success: boolean; url?: string; error?: string }>
  aspectRatio?: 'banner' | 'wide' | 'square'
  className?: string
  disabled?: boolean
}

export function CoverImageUpload({
  currentImage,
  onUpload,
  aspectRatio = 'banner',
  className,
  disabled = false
}: CoverImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const aspectClasses = {
    banner: 'aspect-[3/1]',
    wide: 'aspect-[2/1]',
    square: 'aspect-square'
  }

  const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

    if (file.size > maxSize) return 'Image must be less than 10MB'
    if (!allowedTypes.includes(file.type)) return 'Only JPEG, PNG, and WebP images'

    return null
  }

  const handleClick = () => {
    if (!disabled && !uploading) inputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    const preview = URL.createObjectURL(file)
    setPreviewUrl(preview)
    setUploading(true)

    try {
      const result = await onUpload(file)
      if (!result.success) {
        setError(result.error || 'Upload failed')
        setPreviewUrl(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setPreviewUrl(null)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const displayImage = previewUrl || currentImage

  return (
    <div className={className}>
      <div
        onClick={handleClick}
        className={cn(
          'relative cursor-pointer group rounded-xl overflow-hidden',
          'bg-gray-100 border-2 border-dashed border-gray-300',
          'hover:border-gray-400 transition-colors',
          aspectClasses[aspectRatio],
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled || uploading}
        />

        {displayImage ? (
          <Image
            src={displayImage}
            alt="Cover"
            fill
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Camera className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Click to upload cover image</p>
          </div>
        )}

        {/* Overlay */}
        <div 
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            displayImage && 'bg-black/0 group-hover:bg-black/40 transition-colors',
            uploading && 'bg-black/50'
          )}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          ) : displayImage && (
            <Camera className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  )
}
