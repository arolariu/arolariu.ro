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
          <Skeleton style={{height: '100%', width: '6rem'}} />
        </div>

        {/* Title and Subtitle Container */}
        <div className={styles["titleRow"]}>
          {/* Title Skeleton */}
          <div className={styles["titleSkeleton"]}>
            <Skeleton style={{marginLeft: 'auto', marginRight: 'auto', height: '3.5rem', width: '80%'}} />
          </div>

          {/* Subtitle Skeleton */}
          <article className={styles["subtitleArticle"]}>
            <Skeleton style={{height: '1rem', width: '100%'}} />
            <Skeleton style={{height: '1rem', width: '83.333%'}} />
            <Skeleton style={{height: '1rem', width: '80%'}} />
          </article>
        </div>
      </section>

      {/* Service Cards Grid Skeleton */}
      <section className={styles["cardsSection"]}>
        {/* Service Card Skeleton */}
        <section className={styles["serviceCard"]}>
          {/* Image Skeleton */}
          <article className={styles["imageContainer"]}>
            <Skeleton style={{height: '100%', width: '100%'}} />
          </article>

          {/* Card Content Skeleton */}
          <article className={styles["cardContent"]}>
            {/* Title */}
            <Skeleton style={{marginLeft: 'auto', marginRight: 'auto', marginTop: '1.25rem', height: '1.75rem', width: '75%'}} />

            {/* Description Lines */}
            <div className={styles["descriptionLines"]}>
              <Skeleton style={{height: '1rem', width: '100%'}} />
              <Skeleton style={{height: '1rem', width: '83.333%'}} />
            </div>

            {/* Call to Action Link */}
            <Skeleton style={{marginTop: '0.75rem', height: '1rem', width: '8rem'}} />
          </article>
        </section>

        {/* Additional Card Placeholders (for future domains) */}
        <section className={styles["serviceCardFaded"]}>
          <article className={styles["imageContainer"]}>
            <Skeleton style={{height: '100%', width: '100%'}} />
          </article>
          <article className={styles["cardContent"]}>
            <Skeleton style={{marginLeft: 'auto', marginRight: 'auto', marginTop: '1.25rem', height: '1.75rem', width: '75%'}} />
            <div className={styles["descriptionLines"]}>
              <Skeleton style={{height: '1rem', width: '100%'}} />
              <Skeleton style={{height: '1rem', width: '83.333%'}} />
            </div>
            <Skeleton style={{marginTop: '0.75rem', height: '1rem', width: '8rem'}} />
          </article>
        </section>

        <section className={styles["serviceCardFadedMore"]}>
          <article className={styles["imageContainer"]}>
            <Skeleton style={{height: '100%', width: '100%'}} />
          </article>
          <article className={styles["cardContent"]}>
            <Skeleton style={{marginLeft: 'auto', marginRight: 'auto', marginTop: '1.25rem', height: '1.75rem', width: '75%'}} />
            <div className={styles["descriptionLines"]}>
              <Skeleton style={{height: '1rem', width: '100%'}} />
              <Skeleton style={{height: '1rem', width: '83.333%'}} />
            </div>
            <Skeleton style={{marginTop: '0.75rem', height: '1rem', width: '8rem'}} />
          </article>
        </section>
      </section>
    </div>
  );
}
