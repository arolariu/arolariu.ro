import {Skeleton} from "@arolariu/components";
import styles from "./loading.module.scss";

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
    <div className={styles["page"]}>
      {/* Hero Section Skeleton */}
      <section className={styles["heroSection"]}>
        {/* Top SVG Illustration Skeleton */}
        <Skeleton className={styles["heroImage"]} />

        {/* Content Area */}
        <div className={styles["contentArea"]}>
          {/* Title Skeleton */}
          <Skeleton className={`${styles["titleSkeleton"]} h-10 w-3/4 sm:h-12`} />

          {/* Description Skeleton */}
          <article className={styles["descriptionBlock"]}>
            <Skeleton className={`${styles["descriptionLine"]} h-4 w-full`} />
            <Skeleton className={`${styles["descriptionLine"]} h-4 w-5/6`} />
            <Skeleton className={`${styles["descriptionLine"]} h-4 w-4/5`} />
          </article>

          {/* CTA Buttons Skeleton */}
          <div className={styles["ctaRow"]}>
            <Skeleton className='h-11 w-40 rounded' />
            <Skeleton className='h-11 w-32 rounded' />
          </div>
        </div>
      </section>

      {/* Steps and Bottom Image Section Skeleton */}
      <section className={styles["stepsSection"]}>
        {/* Steps Timeline Skeleton */}
        <div className={styles["stepsTimeline"]}>
          {/* 5 Steps */}
          {[1, 2, 3, 4, 5].map((stepNumber) => (
            <div
              className={styles["stepItem"]}
              key={`step-${stepNumber}`}>
              {/* Vertical Line */}
              <div className={styles["stepLine"]}>
                {stepNumber < 5 && <div className={styles["stepLineBar"]} />}
              </div>

              {/* Circle Icon */}
              <Skeleton className='relative z-10 h-10 w-10 shrink-0 rounded-full' />

              {/* Step Content */}
              <div className={styles["stepContent"]}>
                <Skeleton className='h-4 w-32' />
                <Skeleton className='h-3 w-full' />
                <Skeleton className='h-3 w-5/6' />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom SVG Illustration Skeleton */}
        <div>
          <Skeleton className={styles["heroImage"]} />
        </div>
      </section>
    </div>
  );
}
