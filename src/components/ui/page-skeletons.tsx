import { Skeleton } from '@/components/ui/skeleton'

/**
 * Shared loading skeletons for route-level loading.tsx files.
 *
 * The app had none of these. Every page did its database work before rendering
 * anything, so a slow page showed a blank screen — and a blank screen reads as
 * broken, which is why people refresh. Refreshing restarts the whole sequence
 * and makes it worse.
 *
 * Each skeleton roughly matches the layout of the page it stands in for, so
 * content doesn't jump when it arrives.
 */

/** A grid of cards — directories, event listings. */
export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <Skeleton className="h-9 w-64 mx-auto mb-3" />
        <Skeleton className="h-4 w-96 max-w-full mx-auto" />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** A dashboard: heading, a row of stat tiles, then a list. */
export function DashboardSkeleton({ tiles = 4, rows = 5 }: { tiles?: number; rows?: number }) {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: tiles }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

/** A detail page: hero image, title block, and a body column. */
export function DetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-[320px] w-full rounded-xl mb-8" />
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="space-y-2 pt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
