import {Skeleton} from "@arolariu/components";

/**
 * Loading skeleton component for the authentication page.
 *
 * @remarks
 * **Rendering Context**: Server Component rendered during Suspense fallback.
 *
 * **Purpose**: Provides a visual placeholder matching the layout structure of
 * the authentication page (island.tsx) while content loads or during the
 * authentication status check.
 *
 * **Layout Structure**:
 * - Two authentication cards side by side (sign-up and sign-in)
 * - Each card contains: image, title, description, and CTA button skeletons
 * - Responsive layout: stacked on mobile (2xsm), side-by-side on desktop (md)
 *
 * **Performance**: Improves perceived performance by showing the authentication
 * interface structure immediately, reducing layout shift when actual content loads.
 *
 * **Accessibility**: Maintains semantic HTML structure and layout consistency
 * with the actual content for a seamless loading experience.
 *
 * **Next.js Integration**: Used by the Suspense boundary in layout.tsx as the
 * fallback UI while:
 * - Authentication status is being checked via fetchAaaSUserFromAuthService
 * - Page content is being streamed from the server
 * - Client components are hydrating
 *
 * @returns Server-rendered JSX element with skeleton placeholders matching
 * the authentication page layout structure.
 *
 * @example
 * ```tsx
 * // Automatically rendered by Suspense boundary:
 * // <Suspense fallback={<Loading />}>
 * //   <AuthPage />
 * // </Suspense>
 * //
 * // User sees:
 * // 1. Two card skeletons (sign-up and sign-in)
 * // 2. Authentication check happens on server
 * // 3. If authenticated: redirect to home
 * // 4. If not: actual auth cards render
 * ```
 *
 * @see {@link RenderAuthScreen} - The actual client component being loaded
 * @see {@link AuthPage} - The parent server component with auth check
 * @see {@link AuthCard} - Individual authentication card component
 */
export default function Loading(): React.JSX.Element {
  return (
    <section className='2xsm:flex-col flex gap-4 md:flex-row'>
      {/* Sign-up Card Skeleton */}
      <article>
        {/* Image Skeleton */}
        <div className='flex h-64 items-center justify-center overflow-hidden rounded-lg'>
          <Skeleton className='h-[500px] w-[300px]' />
        </div>

        {/* Title Skeleton */}
        <Skeleton className='mt-6 mb-3 h-8 w-32' />

        {/* Description Skeleton */}
        <div className='space-y-2'>
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-5/6' />
        </div>

        {/* CTA Button Skeleton */}
        <Skeleton className='mt-6 h-14 w-40 rounded' />
      </article>

      {/* Sign-in Card Skeleton */}
      <article>
        {/* Image Skeleton */}
        <div className='flex h-64 items-center justify-center overflow-hidden rounded-lg'>
          <Skeleton className='h-[500px] w-[300px]' />
        </div>

        {/* Title Skeleton */}
        <Skeleton className='mt-6 mb-3 h-8 w-32' />

        {/* Description Skeleton */}
        <div className='space-y-2'>
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-5/6' />
        </div>

        {/* CTA Button Skeleton */}
        <Skeleton className='mt-6 h-14 w-40 rounded' />
      </article>
    </section>
  );
}
