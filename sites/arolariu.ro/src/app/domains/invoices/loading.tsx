import {Skeleton} from "@arolariu/components";

/**
 * Loading skeleton component for the invoices domain main page.
 *
 * @remarks
 * **Rendering Context**: Server Component rendered during Suspense fallback.
 *
 * **Purpose**: Provides a visual placeholder matching the layout structure of
 * the invoices domain page (island.tsx) while content loads or during hydration.
 *
 * **Layout Structure**:
 * - Top section: Hero image, title, description, and CTA buttons
 * - Bottom section: Steps timeline on the left, illustration on the right
 *
 * **Performance**: Improves perceived performance by showing content structure
 * immediately, reducing layout shift when actual content loads.
 *
 * **Accessibility**: Maintains semantic HTML structure and layout consistency
 * with the actual content for a seamless loading experience.
 *
 * **Next.js Integration**: Used by the Suspense boundary in layout.tsx as the
 * fallback UI while the page component and its data fetching complete.
 *
 * @returns Server-rendered JSX element with skeleton placeholders matching
 * the invoices domain page layout structure.
 *
 * @example
 * ```tsx
 * // Automatically rendered by Suspense boundary:
 * // <Suspense fallback={<Loading />}>
 * //   <InvoicePage />
 * // </Suspense>
 * ```
 *
 * @see {@link RenderInvoiceDomainScreen} - The actual client component being loaded
 * @see {@link InvoicePage} - The parent server component
 */
export default function Loading(): React.JSX.Element {
  return (
    <main className='px-5 py-24'>
      {/* Hero Section Skeleton */}
      <section className='flex flex-col items-center justify-center justify-items-center text-center'>
        {/* Top SVG Illustration Skeleton */}
        <Skeleton className='h-[500px] w-[500px] object-fill object-center md:mx-auto md:h-full lg:h-1/2' />

        {/* Content Area */}
        <div className='mt-2 w-full lg:w-2/3'>
          {/* Title Skeleton */}
          <Skeleton className='mx-auto mb-4 h-10 w-3/4 sm:h-12' />

          {/* Description Skeleton */}
          <article className='mb-8 space-y-2'>
            <Skeleton className='mx-auto h-4 w-full' />
            <Skeleton className='mx-auto h-4 w-5/6' />
            <Skeleton className='mx-auto h-4 w-4/5' />
          </article>

          {/* CTA Buttons Skeleton */}
          <div className='flex flex-col items-center justify-center justify-items-center gap-4 md:flex-row'>
            <Skeleton className='h-11 w-40 rounded' />
            <Skeleton className='h-11 w-32 rounded' />
          </div>
        </div>
      </section>

      {/* Steps and Bottom Image Section Skeleton */}
      <section className='flex flex-col items-center justify-center justify-items-center pt-16 md:flex-row'>
        {/* Steps Timeline Skeleton */}
        <div className='md:w-1/2 md:py-6 md:pr-10 lg:w-2/5'>
          {/* 5 Steps */}
          {[1, 2, 3, 4, 5].map((stepNumber) => (
            <div
              className='relative flex pb-12'
              key={`step-${stepNumber}`}>
              {/* Vertical Line */}
              <div className='absolute inset-0 flex h-full w-10 items-center justify-center'>
                {stepNumber < 5 && <div className='pointer-events-none h-full w-1 bg-gray-200' />}
              </div>

              {/* Circle Icon */}
              <Skeleton className='relative z-10 h-10 w-10 shrink-0 rounded-full' />

              {/* Step Content */}
              <div className='grow space-y-2 pl-4'>
                <Skeleton className='h-4 w-32' />
                <Skeleton className='h-3 w-full' />
                <Skeleton className='h-3 w-5/6' />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom SVG Illustration Skeleton */}
        <div>
          <Skeleton className='h-[500px] w-[500px] object-fill object-center md:mx-auto md:h-full lg:h-1/2' />
        </div>
      </section>
    </main>
  );
}
