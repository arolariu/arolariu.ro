import {Skeleton} from "@arolariu/components";

/**
 * Enhanced loading skeleton for authentication pages.
 *
 * @remarks
 * **Rendering Context**: Server Component rendered during Suspense fallback.
 *
 * **Purpose**: Provides a visual placeholder matching the enhanced layout
 * structure of the authentication page (island.tsx) while content loads.
 *
 * **Layout Structure**:
 * - Hero header with badge, title, and subtitle skeletons
 * - Trust badges row
 * - Two authentication cards side by side
 * - Each card: icon, illustration, title, description, bullets, CTA
 *
 * **Performance**: Improves perceived performance by showing the
 * authentication interface structure immediately.
 *
 * **Accessibility**: Maintains semantic HTML structure for consistency.
 *
 * @returns Server-rendered JSX with skeleton placeholders
 */
export default function Loading(): React.JSX.Element {
  return (
    <section className='relative mx-auto w-full max-w-6xl'>
      <div className='flex flex-col gap-12'>
        {/* Hero Header Skeleton */}
        <header className='relative text-center'>
          {/* Badge */}
          <div className='mb-4 flex justify-center'>
            <Skeleton className='h-8 w-32 rounded-full' />
          </div>

          {/* Title */}
          <Skeleton className='mx-auto h-14 w-80 max-w-full sm:h-16 lg:h-20' />

          {/* Subtitle */}
          <div className='mx-auto mt-4 max-w-2xl space-y-2'>
            <Skeleton className='mx-auto h-5 w-full' />
            <Skeleton className='mx-auto h-5 w-4/5' />
          </div>

          {/* Trust badges */}
          <div className='mt-8 flex flex-wrap justify-center gap-3'>
            <Skeleton className='h-7 w-24 rounded-full' />
            <Skeleton className='h-7 w-28 rounded-full' />
            <Skeleton className='h-7 w-20 rounded-full' />
          </div>
        </header>

        {/* Separator */}
        <div className='mx-auto max-w-md'>
          <Skeleton className='h-px w-full' />
        </div>

        {/* Cards Grid Skeleton */}
        <div className='grid gap-8 md:grid-cols-2 lg:gap-10'>
          {/* Card 1 - Sign Up */}
          <article className='bg-card/50 border-border/50 relative overflow-hidden rounded-xl border p-6'>
            {/* Icon and step indicator */}
            <div className='flex items-center justify-between'>
              <Skeleton className='h-12 w-12 rounded-xl' />
              <Skeleton className='h-5 w-14' />
            </div>

            {/* Illustration */}
            <div className='mx-auto mt-6 flex justify-center'>
              <Skeleton className='h-48 w-48 rounded-2xl sm:h-56 sm:w-56' />
            </div>

            {/* Title and description */}
            <div className='mt-6 space-y-3 text-center'>
              <Skeleton className='mx-auto h-9 w-48' />
              <Skeleton className='mx-auto h-5 w-full max-w-xs' />
              <Skeleton className='mx-auto h-5 w-4/5 max-w-xs' />
            </div>

            {/* Bullets */}
            <div className='mt-6 space-y-3'>
              <div className='flex items-center gap-3'>
                <Skeleton className='h-2 w-2 rounded-full' />
                <Skeleton className='h-4 w-full' />
              </div>
              <div className='flex items-center gap-3'>
                <Skeleton className='h-2 w-2 rounded-full' />
                <Skeleton className='h-4 w-5/6' />
              </div>
              <div className='flex items-center gap-3'>
                <Skeleton className='h-2 w-2 rounded-full' />
                <Skeleton className='h-4 w-4/5' />
              </div>
            </div>

            {/* CTA */}
            <div className='mt-6 space-y-3'>
              <Skeleton className='h-12 w-full rounded-lg' />
              <Skeleton className='mx-auto h-4 w-48' />
            </div>
          </article>

          {/* Card 2 - Sign In */}
          <article className='bg-card/50 border-border/50 relative overflow-hidden rounded-xl border p-6'>
            {/* Icon and step indicator */}
            <div className='flex items-center justify-between'>
              <Skeleton className='h-12 w-12 rounded-xl' />
              <Skeleton className='h-5 w-14' />
            </div>

            {/* Illustration */}
            <div className='mx-auto mt-6 flex justify-center'>
              <Skeleton className='h-48 w-48 rounded-2xl sm:h-56 sm:w-56' />
            </div>

            {/* Title and description */}
            <div className='mt-6 space-y-3 text-center'>
              <Skeleton className='mx-auto h-9 w-44' />
              <Skeleton className='mx-auto h-5 w-full max-w-xs' />
              <Skeleton className='mx-auto h-5 w-3/4 max-w-xs' />
            </div>

            {/* Bullets */}
            <div className='mt-6 space-y-3'>
              <div className='flex items-center gap-3'>
                <Skeleton className='h-2 w-2 rounded-full' />
                <Skeleton className='h-4 w-full' />
              </div>
              <div className='flex items-center gap-3'>
                <Skeleton className='h-2 w-2 rounded-full' />
                <Skeleton className='h-4 w-5/6' />
              </div>
              <div className='flex items-center gap-3'>
                <Skeleton className='h-2 w-2 rounded-full' />
                <Skeleton className='h-4 w-3/4' />
              </div>
            </div>

            {/* CTA */}
            <div className='mt-6 space-y-3'>
              <Skeleton className='h-12 w-full rounded-lg' />
              <Skeleton className='mx-auto h-4 w-44' />
            </div>
          </article>
        </div>

        {/* Footer */}
        <div className='mx-auto max-w-2xl text-center'>
          <Skeleton className='mx-auto h-4 w-full' />
          <Skeleton className='mx-auto mt-2 h-4 w-3/4' />
        </div>
      </div>
    </section>
  );
}
