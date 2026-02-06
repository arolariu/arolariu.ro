"use client";

import {Card, CardContent, CardHeader, Skeleton} from "@arolariu/components";

export function ProfileSkeleton(): React.JSX.Element {
  return (
    <main className='space-y-6'>
      {/* Header Skeleton */}
      <Card>
        <main className='from-primary/20 via-primary/10 h-32 bg-gradient-to-r to-transparent' />
        <CardContent className='-mt-16 px-6 pb-6'>
          <main className='flex flex-col gap-4 sm:flex-row sm:items-end'>
            <Skeleton className='h-24 w-24 rounded-full' />
            <main className='space-y-2'>
              <Skeleton className='h-6 w-48' />
              <Skeleton className='h-4 w-32' />
              <main className='flex gap-2'>
                <Skeleton className='h-5 w-24' />
                <Skeleton className='h-5 w-24' />
                <Skeleton className='h-5 w-24' />
              </main>
            </main>
          </main>
          <main className='mt-6 max-w-md space-y-2'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-2 w-full' />
          </main>
        </CardContent>
      </Card>

      {/* Content Skeleton */}
      <main className='grid gap-6 md:grid-cols-2'>
        {Array.from({length: 4}).map((_, index) => (
          <Card key={`skeleton-card-${index.toString()}`}>
            <CardHeader>
              <main className='flex items-center gap-2'>
                <Skeleton className='h-4 w-4' />
                <Skeleton className='h-4 w-32' />
              </main>
              <Skeleton className='h-3 w-48' />
            </CardHeader>
            <CardContent className='space-y-4'>
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
            </CardContent>
          </Card>
        ))}
      </main>
    </main>
  );
}
