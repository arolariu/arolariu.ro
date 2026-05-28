/**
 * @fileoverview Loading skeleton for view scans page during async data fetch.
 * @module app/domains/invoices/view-scans/loading
 *
 * @remarks
 * **Next.js Convention**: This `loading.tsx` file is automatically wrapped in a
 * Suspense boundary by Next.js App Router. It displays while `page.tsx` performs
 * async operations (auth check, metadata generation).
 *
 * **Architecture Pattern**: Skeleton UI pattern providing visual feedback during
 * server-side data fetching, preventing layout shift and improving perceived
 * performance.
 *
 * **Layout Matching**: Skeleton structure mirrors the actual page layout:
 * - Header row with title and action button placeholders
 * - 4x2 grid of scan card placeholders (8 total)
 * - Each card matches aspect ratio and content structure of real scan cards
 *
 * **Performance**: Instant display (no data fetching), static HTML, minimal CSS.
 * Improves Core Web Vitals by providing immediate visual feedback.
 *
 * @see {@link ViewScansPage} - Main page that triggers this loading state
 * @see {@link RenderViewScansScreen} - Client island with actual scan grid
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming}
 */

import {Skeleton} from "@arolariu/components";
import styles from "./loading.module.scss";

/**
 * Renders skeleton placeholders while the view scans page loads asynchronously.
 *
 * @remarks
 * **Rendering Context**: Server Component (Next.js loading.tsx file).
 *
 * **Automatic Activation**: Next.js automatically displays this component when:
 * - User navigates to `/domains/invoices/view-scans`
 * - `page.tsx` is performing async operations (auth check via `fetchAaaSUserFromAuthService`)
 * - Page metadata is being generated (`generateMetadata` async function)
 *
 * **Visual Hierarchy**:
 * 1. **Header Row**: Two skeleton elements mimicking page title (12rem wide) and
 *    subtitle (8rem wide), plus action button placeholder (10rem wide)
 * 2. **Grid Layout**: 8 card skeletons in responsive grid matching actual scan cards
 * 3. **Card Structure**: Each skeleton card has:
 *    - Image placeholder with 4:3 aspect ratio (matching scan image dimensions)
 *    - Body with two text lines (75% and 50% width for filename and metadata)
 *
 * **No State Management**: Pure presentational component with no hooks or interactivity.
 * Static skeleton display until page.tsx completes async operations.
 *
 * **CSS Modules**: Uses scoped styles from `loading.module.scss` for layout consistency.
 *
 * **Accessibility**: Skeleton components from `@arolariu/components` include proper
 * ARIA attributes (`role="status"`, `aria-busy="true"`) for screen reader support.
 *
 * **Performance Characteristics**:
 * - Zero JavaScript required (static HTML + CSS)
 * - No layout shift when real content loads (dimensions pre-allocated)
 * - Fast First Contentful Paint (FCP)
 * - Improves perceived performance vs blank screen or spinner
 *
 * @returns Static skeleton UI matching the view scans page structure.
 *
 * @example
 * ```tsx
 * // Next.js automatically renders this when user navigates to view scans
 * // User sees skeleton grid while page.tsx performs:
 * // 1. Auth check: await fetchAaaSUserFromAuthService()
 * // 2. Metadata generation: await generateMetadata()
 * // 3. Component initialization
 *
 * // Typical flow:
 * // [User clicks "View Scans"]
 * //   → Loading() renders immediately (this component)
 * //   → page.tsx async operations complete (~100-300ms)
 * //   → Real page content replaces skeleton
 * ```
 *
 * @see {@link Skeleton} - Shared skeleton component from @arolariu/components
 * @see {@link ViewScansPage} - Target page triggering this loading state
 * @see RFC 1001 - OpenTelemetry observability (loading states traced)
 */
export default function Loading(): React.JSX.Element {
  return (
    <div className={styles["wrapper"]}>
      <section className={styles["container"]}>
        {/* Header skeleton */}
        <div className={styles["headerRow"]}>
          <div>
            <Skeleton style={{height: "2rem", width: "12rem", marginBottom: "0.5rem"}} />
            <Skeleton style={{height: "1rem", width: "8rem"}} />
          </div>
          <Skeleton style={{height: "2.5rem", width: "10rem"}} />
        </div>

        {/* Grid skeleton */}
        <div className={styles["grid"]}>
          {Array.from({length: 8}).map((_, i) => (
            <div
              key={`skeleton-${String(i)}`}
              className={styles["skeletonCard"]}>
              <Skeleton style={{aspectRatio: "4 / 3"}} />
              <div className={styles["skeletonCardBody"]}>
                <Skeleton style={{height: "1rem", width: "75%", marginBottom: "0.5rem"}} />
                <Skeleton style={{height: "0.75rem", width: "50%"}} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
