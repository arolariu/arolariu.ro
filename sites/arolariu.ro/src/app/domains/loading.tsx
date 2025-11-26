import {Skeleton} from "@arolariu/components";

/**
 * Loading skeleton component for the domains overview page.
 *
 * @remarks
 * **Rendering Context**: Server Component rendered during Suspense fallback.
 *
 * **Purpose**: Provides a visual placeholder matching the layout structure of
 * the domains page (island.tsx) while the actual content is being loaded or
 * client component is hydrating.
 *
 * **Layout Structure**:
 * - Header section with progress bar and title skeleton
 * - Subtitle content area skeleton
 * - Service cards grid with image and text placeholders
 *
 * **Performance**: Improves perceived performance by showing content structure
 * immediately, reducing layout shift when actual content loads.
 *
 * **Accessibility**: Maintains semantic HTML structure and layout consistency
 * with the actual content for a seamless loading experience.
 *
 * **Next.js Integration**: Automatically used by Next.js App Router when the
 * page.tsx component is loading. Wrapped in Suspense boundary by the framework.
 *
 * @returns Server-rendered JSX element with skeleton placeholders matching
 * the domains page layout structure.
 *
 * @example
 * ```tsx
 * // Automatically rendered by Next.js during loading:
 * // <Suspense fallback={<Loading />}>
 * //   <DomainsHomepage />
 * // </Suspense>
 * ```
 *
 * @see {@link RenderDomainsScreen} - The actual client component being loaded
 * @see {@link DomainsHomepage} - The parent server component
 */
export default function Loading(): React.JSX.Element {
  return (
    <main className='container mx-auto px-5 py-24'>
      {/* Header Section Skeleton */}
      <section className='flex flex-col'>
        {/* Progress Bar */}
        <div className='h-1 overflow-hidden rounded bg-gray-200'>
          <Skeleton className='h-full w-24' />
        </div>

        {/* Title and Subtitle Container */}
        <div className='mb-12 flex flex-col flex-wrap py-6 sm:flex-row'>
          {/* Title Skeleton */}
          <div className='mb-2 sm:mb-0 sm:w-2/5'>
            <Skeleton className='mx-auto h-14 w-4/5 sm:mx-0' />
          </div>

          {/* Subtitle Skeleton */}
          <article className='2xsm:mt-8 space-y-2 pl-0 sm:w-3/5 sm:pl-10 md:mt-0'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-5/6' />
            <Skeleton className='h-4 w-4/5' />
          </article>
        </div>
      </section>

      {/* Service Cards Grid Skeleton */}
      <section className='2xsm:items-center 2xsm:justify-center 2xsm:justify-items-center flex flex-row flex-wrap gap-4 md:items-baseline md:justify-normal md:justify-items-start'>
        {/* Service Card Skeleton */}
        <section className='mb-6 max-w-80 rounded-xl border p-4 sm:mb-0'>
          {/* Image Skeleton */}
          <article className='h-64 overflow-hidden rounded-lg'>
            <Skeleton className='h-full w-full' />
          </article>

          {/* Card Content Skeleton */}
          <article className='space-y-3'>
            {/* Title */}
            <Skeleton className='mx-auto mt-5 h-7 w-3/4' />

            {/* Description Lines */}
            <div className='space-y-2'>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-5/6' />
            </div>

            {/* Call to Action Link */}
            <Skeleton className='mt-3 h-4 w-32' />
          </article>
        </section>

        {/* Additional Card Placeholders (for future domains) */}
        <section className='mb-6 max-w-80 rounded-xl border p-4 opacity-50 sm:mb-0'>
          <article className='h-64 overflow-hidden rounded-lg'>
            <Skeleton className='h-full w-full' />
          </article>
          <article className='space-y-3'>
            <Skeleton className='mx-auto mt-5 h-7 w-3/4' />
            <div className='space-y-2'>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-5/6' />
            </div>
            <Skeleton className='mt-3 h-4 w-32' />
          </article>
        </section>

        <section className='mb-6 max-w-80 rounded-xl border p-4 opacity-30 sm:mb-0'>
          <article className='h-64 overflow-hidden rounded-lg'>
            <Skeleton className='h-full w-full' />
          </article>
          <article className='space-y-3'>
            <Skeleton className='mx-auto mt-5 h-7 w-3/4' />
            <div className='space-y-2'>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-5/6' />
            </div>
            <Skeleton className='mt-3 h-4 w-32' />
          </article>
        </section>
      </section>
    </main>
  );
}
