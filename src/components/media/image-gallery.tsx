'use client'

/**
 * ImageGallery Component
 * 
 * Displays a grid of images with lightbox preview.
 * Supports delete functionality for owners.
 */

import { useState } from 'react'
import Image from 'next/image'
import { X, Trash2, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface GalleryImage {
  url: string
  path?: string // Storage path for deletion
  caption?: string
}

interface ImageGalleryProps {
  images: GalleryImage[]
  onDelete?: (image: GalleryImage) => Promise<void>
  columns?: 2 | 3 | 4
  className?: string
  editable?: boolean
}

export function ImageGallery({
  images,
  onDelete,
  columns = 3,
  className,
  editable = false
}: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const columnClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    document.body.style.overflow = 'hidden'
  }

  const closeLightbox = () => {
    setLightboxIndex(null)
    document.body.style.overflow = 'auto'
  }

  const goToPrevious = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1)
    }
  }

  const goToNext = () => {
    if (lightboxIndex !== null && lightboxIndex < images.length - 1) {
      setLightboxIndex(lightboxIndex + 1)
    }
  }

  const handleDelete = async (image: GalleryImage, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onDelete) return

    setDeleting(image.url)
    try {
      await onDelete(image)
    } finally {
      setDeleting(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (lightboxIndex === null) return
    if (e.key === 'Escape') closeLightbox()
    if (e.key === 'ArrowLeft') goToPrevious()
    if (e.key === 'ArrowRight') goToNext()
  }

  if (images.length === 0) {
    return (
      <div className={cn('text-center py-12 text-gray-500', className)}>
        <ZoomIn className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No images yet</p>
      </div>
    )
  }

  return (
    <>
      {/* Grid */}
      <div className={cn('grid gap-3', columnClasses[columns], className)}>
        {images.map((image, index) => (
          <div
            key={image.url}
            className="relative aspect-square group cursor-pointer overflow-hidden rounded-lg bg-gray-100"
            onClick={() => openLightbox(index)}
          >
            <Image
              src={image.url}
              alt={image.caption || `Image ${index + 1}`}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
            
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            
            {/* Zoom Icon */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="h-8 w-8 text-white drop-shadow-lg" />
            </div>

            {/* Delete Button */}
            {editable && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'absolute top-2 right-2 h-8 w-8 p-0',
                  'bg-white/90 hover:bg-red-500 hover:text-white',
                  'opacity-0 group-hover:opacity-100 transition-opacity'
                )}
                onClick={(e) => handleDelete(image, e)}
                disabled={deleting === image.url}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Close Button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 h-10 w-10 p-0 text-white hover:bg-white/20"
            onClick={closeLightbox}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Previous Button */}
          {lightboxIndex > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-4 h-10 w-10 p-0 text-white hover:bg-white/20"
              onClick={(e) => { e.stopPropagation(); goToPrevious() }}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          {/* Image */}
          <div 
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[lightboxIndex].url}
              alt={images[lightboxIndex].caption || ''}
              width={1200}
              height={800}
              className="object-contain max-h-[90vh]"
            />
            {images[lightboxIndex].caption && (
              <p className="text-white text-center mt-4">
                {images[lightboxIndex].caption}
              </p>
            )}
          </div>

          {/* Next Button */}
          {lightboxIndex < images.length - 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-4 h-10 w-10 p-0 text-white hover:bg-white/20"
              onClick={(e) => { e.stopPropagation(); goToNext() }}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
            {lightboxIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  )
}
