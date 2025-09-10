"use client";

import {Skeleton} from "@arolariu/components/skeleton";
import {motion} from "motion/react";

const SKELETON_KEYS = ["ske-1", "ske-2", "ske-3", "ske-4", "ske-5", "ske-6"] as const;

/**
 * A loading component.
 * @returns A loading component.
 */
export default function Loading(): React.JSX.Element {
  return (
    <div className='bg-background min-h-screen'>
      {/* Header skeleton */}
      <header className='border-border bg-background/80 fixed top-0 z-50 w-full border-b backdrop-blur-xs'>
        <div className='container mx-auto px-4'>
          <div className='flex h-16 items-center justify-between'>
            <Skeleton className='h-8 w-32' />
            <div className='hidden items-center space-x-6 md:flex'>
              <Skeleton className='h-4 w-16' />
              <Skeleton className='h-4 w-16' />
              <Skeleton className='h-4 w-16' />
            </div>
            <div className='flex items-center space-x-4'>
              <Skeleton className='h-8 w-8 rounded-full' />
              <Skeleton className='h-8 w-20' />
            </div>
          </div>
        </div>
      </header>

      {/* Hero section skeleton */}
      <section className='relative min-h-screen overflow-hidden pt-20'>
        <div className='container mx-auto px-4'>
          <div className='grid min-h-[80vh] grid-cols-1 items-center gap-12 lg:grid-cols-2'>
            {/* Left side - Text */}
            <div className='relative z-10'>
              <Skeleton className='mb-6 h-6 w-40' />
              <Skeleton className='mb-4 h-16 w-full max-w-md' />
              <Skeleton className='mb-6 h-16 w-full max-w-md' />
              <Skeleton className='mb-8 h-6 w-full max-w-lg' />
              <Skeleton className='mb-8 h-6 w-full max-w-lg' />
              <div className='flex flex-wrap gap-4'>
                <Skeleton className='h-10 w-36' />
                <Skeleton className='h-10 w-36' />
              </div>
            </div>

            {/* Right side - Sphere placeholder */}
            <div className='relative flex flex-col items-center justify-center'>
              <div className='relative mx-auto w-full max-w-[400px]'>
                <Skeleton className='aspect-square w-full rounded-full opacity-50' />
                <motion.div
                  className='border-primary/30 absolute inset-0 rounded-full border-2'
                  animate={{
                    rotate: 360,
                    scale: [0.9, 1.1, 0.9],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                />
                <motion.div
                  className='border-primary/20 absolute inset-0 rounded-full border'
                  animate={{
                    rotate: -360,
                    scale: [1.1, 0.9, 1.1],
                  }}
                  transition={{
                    duration: 10,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology cards section */}
      <section className='relative py-20'>
        <div className='container mx-auto px-4'>
          <div className='mb-16 text-center'>
            <Skeleton className='mx-auto mb-4 h-6 w-40' />
            <Skeleton className='mx-auto mb-6 h-10 w-64' />
            <Skeleton className='mx-auto h-5 w-96' />
          </div>

          <div className='grid grid-cols-1 gap-8 md:grid-cols-3'>
            {SKELETON_KEYS.map((key) => (
              <Skeleton
                key={key}
                className='h-64 w-full rounded-lg'
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer skeleton */}
      <footer className='bg-muted/50 relative py-12'>
        <div className='container mx-auto px-4'>
          <div className='grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4'>
            <div>
              <Skeleton className='mb-4 h-6 w-24' />
              <Skeleton className='mb-2 h-4 w-full' />
              <Skeleton className='h-4 w-3/4' />
            </div>
            <div>
              <Skeleton className='mb-4 h-6 w-24' />
              <Skeleton className='mb-2 h-4 w-32' />
              <Skeleton className='mb-2 h-4 w-32' />
              <Skeleton className='h-4 w-32' />
            </div>
            <div>
              <Skeleton className='mb-4 h-6 w-24' />
              <Skeleton className='mb-2 h-4 w-32' />
              <Skeleton className='h-4 w-32' />
            </div>
            <div>
              <Skeleton className='mb-4 h-6 w-24' />
              <div className='flex space-x-4'>
                <Skeleton className='h-8 w-8 rounded-full' />
                <Skeleton className='h-8 w-8 rounded-full' />
              </div>
            </div>
          </div>
          <div className='border-border mt-12 border-t pt-8 text-center'>
            <Skeleton className='mx-auto h-4 w-64' />
          </div>
        </div>
      </footer>
    </div>
  );
}
