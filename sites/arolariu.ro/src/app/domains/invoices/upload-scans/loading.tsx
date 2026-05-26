/**
 * @fileoverview Loading skeleton for the upload-scans route.
 * @module domains/invoices/upload-scans/loading
 *
 * @remarks
 * Rendered automatically by Next.js while `page.tsx` is suspended
 * on authentication / data resolution. The shimmer is a 1:1
 * placeholder for the eventual layout (breadcrumb, WorkflowProgress,
 * header, content grid with main upload dropzone + sidebar cards),
 * so the user perceives no layout shift when the real content
 * swaps in. Responsive across all breakpoints to match the
 * `respond-to` / `respond-below` rules of the underlying components.
 */

import {Skeleton} from "@arolariu/components";
import styles from "./loading.module.scss";

const TIP_COUNT = 5;
const FILE_TYPE_COUNT = 2;

/**
 * Renders skeleton placeholders while the upload scans page loads asynchronously.
 *
 * @remarks
 * **Rendering Context**: Server Component (Next.js loading.tsx special file).
 *
 * **Automatic Activation**: Next.js automatically displays this component when:
 * - User navigates to `/domains/invoices/upload-scans`
 * - `page.tsx` is performing async operations (auth check via `fetchAaaSUserFromAuthService`)
 * - Page metadata is being generated (`generateMetadata` async function)
 *
 * **Layout Structure** (1:1 mapping to actual page with 6 major sections):
 *
 * 1. **Breadcrumb**: Navigation path placeholder (e.g., "Home / Invoices / Upload Scans")
 *
 * 2. **Workflow Progress**: 3-step progress indicator with circles and connectors
 *    - Step 1: Upload Scans (current step, highlighted)
 *    - Connector line
 *    - Step 2: View Scans
 *    - Connector line
 *    - Step 3: Create Invoices
 *    - Uses `aria-hidden='true'` since skeleton is non-interactive
 *
 * 3. **Header**: Title, description, and 2 action buttons
 *    - Left: Page title and subtitle placeholders
 *    - Right: Two action button placeholders (likely "View Existing" and "Help")
 *
 * 4. **Content Grid**: Two-column layout (main area + sidebar)
 *
 * 5. **Main Upload Area** (left column):
 *    - Large dropzone placeholder for drag-drop and file picker UI
 *    - Takes majority of horizontal space on desktop
 *    - Full width on mobile (sidebar moves below)
 *
 * 6. **Sidebar** (right column with 3 cards):
 *    - **Supported Formats Card**: 2 file type rows (e.g., JPEG/PNG, PDF)
 *      - Each row: icon + label + extension text
 *      - Bottom: max file size note
 *    - **Tips Card**: 5 upload tips with icon + text
 *      - Tips like "Good lighting", "Flat surface", "Include all edges"
 *    - **Security Card**: Security assurance with icon + title + 2 description lines
 *      - Reassures users about data encryption and privacy
 *
 * **Responsive Design**: Uses SCSS mixins (`respond-to`, `respond-below`) to adapt:
 * - Desktop: Two-column grid (main 70%, sidebar 30%)
 * - Tablet: Two-column grid (main 65%, sidebar 35%)
 * - Mobile: Single column (sidebar below main area)
 *
 * **Performance Characteristics**:
 * - Zero JavaScript required (static HTML + CSS)
 * - No layout shift when real content loads (dimensions pre-allocated)
 * - Fast First Contentful Paint (FCP)
 * - Skeleton structure matches real UI 1:1 for seamless swap
 *
 * **Accessibility**: Workflow progress nav uses `aria-hidden='true'` since skeleton
 * is non-interactive visual feedback only. Screen readers announce "Loading content"
 * from implicit loading state.
 *
 * **CSS Modules**: Uses scoped styles from `loading.module.scss` matching the
 * production layout styles from `page.module.scss` and `island.module.scss`.
 *
 * @returns Static skeleton UI with 6-section layout matching the upload scans page.
 * Includes breadcrumb, workflow progress (3 steps), header (title + 2 buttons),
 * and content grid with main dropzone area plus sidebar containing 3 info cards
 * (Supported Formats with 2 file types, Tips with 5 items, Security assurance).
 *
 * @example
 * ```tsx
 * // Next.js automatically renders this when user navigates to upload scans
 * // User sees skeleton layout while page.tsx performs:
 * // 1. Auth check: await fetchAaaSUserFromAuthService()
 * // 2. Metadata generation: await generateMetadata()
 * // 3. Component initialization
 *
 * // Typical flow:
 * // [User clicks "Upload Scans"]
 * //   → Loading() renders immediately with full 6-section skeleton
 * //   → Breadcrumb placeholder visible
 * //   → Workflow progress shows 3 steps (upload highlighted)
 * //   → Header with title + 2 action buttons
 * //   → Content grid with dropzone + sidebar (3 cards)
 * //   → page.tsx async operations complete (~100-300ms)
 * //   → Real upload UI replaces skeleton with matching layout
 *
 * // Desktop layout:
 * //   [Breadcrumb]
 * //   [Workflow: Step1 → Step2 → Step3]
 * //   [Header: Title + Buttons]
 * //   [Grid: Dropzone (70%) | Sidebar (30%)]
 * //          ├─ Large upload area   ├─ Formats card (2 types)
 * //          └─ Drag-drop zone      ├─ Tips card (5 tips)
 * //                                 └─ Security card
 *
 * // Mobile layout:
 * //   [Breadcrumb]
 * //   [Workflow: Step1 → Step2 → Step3]
 * //   [Header: Title + Buttons (stacked)]
 * //   [Dropzone (full width)]
 * //   [Formats card]
 * //   [Tips card]
 * //   [Security card]
 * ```
 *
 * @see {@link Skeleton} - Shared skeleton component from @arolariu/components
 * @see {@link UploadScansPage} - Target page triggering this loading state
 * @see {@link RenderUploadScansScreen} - Client island with actual upload UI
 * @see {@link WorkflowProgress} - Actual workflow progress component (3 steps)
 * @see RFC 1001 - OpenTelemetry observability (loading states traced)
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming}
 */
export default function Loading(): React.JSX.Element {
  return (
    <div className={styles["page"]}>
      <section className={styles["contentSection"]}>
        {/* Breadcrumb */}
        <div className={styles["breadcrumb"]}>
          <Skeleton className={styles["breadcrumbSkeleton"]} />
        </div>

        {/* Workflow progress */}
        <nav
          className={styles["workflowProgress"]}
          aria-hidden='true'>
          <div className={styles["workflowStep"]}>
            <Skeleton className={styles["workflowCircle"]} />
            <Skeleton className={styles["workflowLabel"]} />
          </div>
          <Skeleton className={styles["workflowConnector"]} />
          <div className={styles["workflowStep"]}>
            <Skeleton className={styles["workflowCircle"]} />
            <Skeleton className={styles["workflowLabel"]} />
          </div>
          <Skeleton className={styles["workflowConnector"]} />
          <div className={styles["workflowStep"]}>
            <Skeleton className={styles["workflowCircle"]} />
            <Skeleton className={styles["workflowLabel"]} />
          </div>
        </nav>

        {/* Header */}
        <div className={styles["header"]}>
          <div className={styles["headerLeft"]}>
            <Skeleton className={styles["headerTitle"]} />
            <Skeleton className={styles["headerDescription"]} />
          </div>
          <div className={styles["headerActions"]}>
            <Skeleton className={styles["headerActionButton"]} />
            <Skeleton className={styles["headerActionButton"]} />
          </div>
        </div>

        {/* Main content grid */}
        <div className={styles["contentGrid"]}>
          {/* Main upload area */}
          <div className={styles["mainArea"]}>
            <Skeleton className={styles["dropzoneSkeleton"]} />
          </div>

          {/* Sidebar */}
          <div className={styles["sidebar"]}>
            {/* Supported Formats card */}
            <div className={styles["sidebarCard"]}>
              <Skeleton className={styles["sidebarTitle"]} />
              <div className={styles["formatsList"]}>
                {Array.from({length: FILE_TYPE_COUNT}).map((_, index) => (
                  <div
                    key={`upload-skeleton-format-${String(index)}`}
                    className={styles["fileTypeRow"]}>
                    <Skeleton className={styles["fileTypeIcon"]} />
                    <div className={styles["fileTypeText"]}>
                      <Skeleton className={styles["fileTypeLabel"]} />
                      <Skeleton className={styles["fileTypeExt"]} />
                    </div>
                  </div>
                ))}
              </div>
              <Skeleton className={styles["maxSizeNote"]} />
            </div>

            {/* Tips card */}
            <div className={styles["sidebarCard"]}>
              <Skeleton className={styles["sidebarTitle"]} />
              <ul className={styles["tipsList"]}>
                {Array.from({length: TIP_COUNT}).map((_, index) => (
                  <li
                    key={`upload-skeleton-tip-${String(index)}`}
                    className={styles["tipRow"]}>
                    <Skeleton className={styles["tipIcon"]} />
                    <Skeleton className={styles["tipText"]} />
                  </li>
                ))}
              </ul>
            </div>

            {/* Security card */}
            <div className={`${styles["sidebarCard"]} ${styles["securityCard"]}`}>
              <Skeleton className={styles["securityIcon"]} />
              <div className={styles["securityText"]}>
                <Skeleton className={styles["securityTitle"]} />
                <Skeleton className={styles["securityDescription"]} />
                <Skeleton className={styles["securityDescription"]} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
