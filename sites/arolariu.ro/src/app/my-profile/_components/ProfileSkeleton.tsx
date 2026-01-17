"use client";

import {Card, CardContent, CardHeader, Skeleton} from "@arolariu/components";

export function ProfileSkeleton(): React.JSX.Element {
  return (
    <div className='space-y-6'>
      {/* Header Skeleton */}
      <Card>
        <div className='from-primary/20 via-primary/10 h-32 bg-gradient-to-r to-transparent' />
        <CardContent className='-mt-16 px-6 pb-6'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-end'>
            <Skeleton className='h-24 w-24 rounded-full' />
            <div className='space-y-2'>
              <Skeleton className='h-6 w-48' />
              <Skeleton className='h-4 w-32' />
              <div className='flex gap-2'>
                <Skeleton className='h-5 w-24' />
                <Skeleton className='h-5 w-24' />
                <Skeleton className='h-5 w-24' />
              </div>
            </div>
          </div>
          <div className='mt-6 max-w-md space-y-2'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-2 w-full' />
          </div>
        </CardContent>
      </Card>

      {/* Content Skeleton */}
      <div className='grid gap-6 md:grid-cols-2'>
        {Array.from({length: 4}).map((_, index) => (
          <Card key={`skeleton-card-${index.toString()}`}>
            <CardHeader>
              <div className='flex items-center gap-2'>
                <Skeleton className='h-4 w-4' />
                <Skeleton className='h-4 w-32' />
              </div>
              <Skeleton className='h-3 w-48' />
            </CardHeader>
            <CardContent className='space-y-4'>
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
