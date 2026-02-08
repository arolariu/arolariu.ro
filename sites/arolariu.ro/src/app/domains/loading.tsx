import {Skeleton} from "@arolariu/components";
import styles from "./loading.module.scss";

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
    <div className={styles["domainsMain"]}>
      {/* Header Section Skeleton */}
      <section className={styles["headerSection"]}>
        {/* Progress Bar */}
        <div className={styles["progressTrack"]}>
          <Skeleton className='h-full w-24' />
        </div>

        {/* Title and Subtitle Container */}
        <div className={styles["titleRow"]}>
          {/* Title Skeleton */}
          <div className={styles["titleSkeleton"]}>
            <Skeleton className='mx-auto h-14 w-4/5 sm:mx-0' />
          </div>

          {/* Subtitle Skeleton */}
          <article className={styles["subtitleArticle"]}>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-5/6' />
            <Skeleton className='h-4 w-4/5' />
          </article>
        </div>
      </section>

      {/* Service Cards Grid Skeleton */}
      <section className={styles["cardsSection"]}>
        {/* Service Card Skeleton */}
        <section className={styles["serviceCard"]}>
          {/* Image Skeleton */}
          <article className={styles["imageContainer"]}>
            <Skeleton className='h-full w-full' />
          </article>

          {/* Card Content Skeleton */}
          <article className={styles["cardContent"]}>
            {/* Title */}
            <Skeleton className='mx-auto mt-5 h-7 w-3/4' />

            {/* Description Lines */}
            <div className={styles["descriptionLines"]}>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-5/6' />
            </div>

            {/* Call to Action Link */}
            <Skeleton className='mt-3 h-4 w-32' />
          </article>
        </section>

        {/* Additional Card Placeholders (for future domains) */}
        <section className={styles["serviceCardFaded"]}>
          <article className={styles["imageContainer"]}>
            <Skeleton className='h-full w-full' />
          </article>
          <article className={styles["cardContent"]}>
            <Skeleton className='mx-auto mt-5 h-7 w-3/4' />
            <div className={styles["descriptionLines"]}>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-5/6' />
            </div>
            <Skeleton className='mt-3 h-4 w-32' />
          </article>
        </section>

        <section className={styles["serviceCardFadedMore"]}>
          <article className={styles["imageContainer"]}>
            <Skeleton className='h-full w-full' />
          </article>
          <article className={styles["cardContent"]}>
            <Skeleton className='mx-auto mt-5 h-7 w-3/4' />
            <div className={styles["descriptionLines"]}>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-5/6' />
            </div>
            <Skeleton className='mt-3 h-4 w-32' />
          </article>
        </section>
      </section>
    </div>
  );
}
