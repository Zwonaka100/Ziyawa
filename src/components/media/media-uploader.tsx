'use client'

/**
 * MediaUploader Component
 * 
 * Drag & drop file upload with preview.
 * Supports images, videos, and audio files.
 */

import { useState, useCallback, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Video, Music, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MediaUploaderProps {
  onUpload: (file: File) => Promise<{ success: boolean; url?: string; error?: string }>
  accept?: 'image' | 'video' | 'audio' | 'all'
  maxSize?: number // in MB
  multiple?: boolean
  className?: string
  disabled?: boolean
  placeholder?: string
}

interface UploadingFile {
  file: File
  preview?: string
  progress: number
  error?: string
}

export function MediaUploader({
  onUpload,
  accept = 'image',
  maxSize = 10,
  multiple = false,
  className,
  disabled = false,
  placeholder
}: MediaUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState<UploadingFile[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Determine accepted file types
  const acceptedTypes = {
    image: 'image/jpeg,image/png,image/webp,image/gif',
    video: 'video/mp4,video/webm,video/quicktime',
    audio: 'audio/mpeg,audio/mp3,audio/wav',
    all: 'image/*,video/mp4,video/webm,audio/*'
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('video/')) return <Video className="h-8 w-8" />
    if (type.startsWith('audio/')) return <Music className="h-8 w-8" />
    return <ImageIcon className="h-8 w-8" />
  }

  const validateFile = (file: File): string | null => {
    const maxBytes = maxSize * 1024 * 1024
    if (file.size > maxBytes) {
      return `File too large. Maximum size is ${maxSize}MB`
    }

    const allowedTypes = acceptedTypes[accept].split(',')
    const isAllowed = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', '/'))
      }
      return file.type === type
    })

    if (!isAllowed) {
      return `Invalid file type. Allowed: ${accept}`
    }

    return null
  }

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const filesToUpload = multiple ? fileArray : [fileArray[0]]

    for (const file of filesToUpload) {
      const error = validateFile(file)
      
      // Create preview for images
      let preview: string | undefined
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file)
      }

      const uploadingFile: UploadingFile = {
        file,
        preview,
        progress: 0,
        error: error || undefined
      }

      setUploading(prev => [...prev, uploadingFile])

      if (!error) {
        try {
          setUploading(prev => 
            prev.map(u => u.file === file ? { ...u, progress: 50 } : u)
          )

          const result = await onUpload(file)

          if (result.success) {
            // Remove from uploading list on success
            setUploading(prev => prev.filter(u => u.file !== file))
          } else {
            setUploading(prev => 
              prev.map(u => u.file === file ? { ...u, error: result.error, progress: 0 } : u)
            )
          }
        } catch (err) {
          setUploading(prev => 
            prev.map(u => u.file === file ? { 
              ...u, 
              error: err instanceof Error ? err.message : 'Upload failed',
              progress: 0 
            } : u)
          )
        }
      }
    }
  }, [multiple, maxSize, accept, onUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (disabled) return
    if (e.dataTransfer.files?.length) {
      handleFiles(e.dataTransfer.files)
    }
  }, [disabled, handleFiles])

  const handleClick = () => {
    if (!disabled) inputRef.current?.click()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      handleFiles(e.target.files)
      e.target.value = '' // Reset to allow same file
    }
  }

  const removeFile = (file: File) => {
    setUploading(prev => {
      const item = prev.find(u => u.file === file)
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return prev.filter(u => u.file !== file)
    })
  }

  const defaultPlaceholder = {
    image: 'Drop images here or click to upload',
    video: 'Drop videos here or click to upload',
    audio: 'Drop audio files here or click to upload',
    all: 'Drop files here or click to upload'
  }

  return (
    <div className={className}>
      {/* Drop Zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer',
          'flex flex-col items-center justify-center gap-3 min-h-[160px]',
          isDragging && 'border-black bg-gray-50',
          !isDragging && 'border-gray-300 hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptedTypes[accept]}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
        
        <Upload className="h-10 w-10 text-gray-400" />
        <p className="text-sm text-gray-600 text-center">
          {placeholder || defaultPlaceholder[accept]}
        </p>
        <p className="text-xs text-gray-400">
          Max {maxSize}MB {multiple ? '• Multiple files allowed' : ''}
        </p>
      </div>

      {/* Uploading Files */}
      {uploading.length > 0 && (
        <div className="mt-4 space-y-3">
          {uploading.map((item, index) => (
            <div
              key={`${item.file.name}-${index}`}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border',
                item.error ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
              )}
            >
              {/* Preview or Icon */}
              <div className="flex-shrink-0 w-12 h-12 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
                {item.preview ? (
                  <img 
                    src={item.preview} 
                    alt="" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  getFileIcon(item.file.type)
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.file.name}</p>
                <p className="text-xs text-gray-500">
                  {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
                {item.error && (
                  <p className="text-xs text-red-600 mt-1">{item.error}</p>
                )}
              </div>

              {/* Progress or Actions */}
              <div className="flex-shrink-0">
                {item.progress > 0 && !item.error ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(item.file)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
