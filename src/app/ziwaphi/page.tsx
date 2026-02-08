import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import ZiwaphiClient from './ziwaphi-client';

export const metadata = {
  title: 'Ziwaphi? | Find Events | Ziyawa',
  description: 'Discover upcoming events across South Africa. Search, filter, and find your next experience.',
};

export default function ZiwaphiPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 bg-clip-text text-transparent">
          Ziwaphi?
        </h1>
        <p className="text-xl text-muted-foreground mb-1">
          Where is it going down?
        </p>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Discover events across South Africa. From Amapiano sessions to festivals, 
          concerts to comedy shows – find your next unforgettable experience.
        </p>
      </div>

      {/* Search and Results - Client Component */}
      <Suspense fallback={<ZiwaphiSkeleton />}>
        <ZiwaphiClient />
      </Suspense>
    </div>
  );
}

function ZiwaphiSkeleton() {
  return (
    <div className="space-y-6">
      {/* Search bar skeleton */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-12 flex-1" />
        <Skeleton className="h-12 w-[200px]" />
        <Skeleton className="h-12 w-32" />
      </div>

      {/* Results skeleton */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[16/9] w-full rounded-lg" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
