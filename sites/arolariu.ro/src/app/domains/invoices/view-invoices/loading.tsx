/**
 * @fileoverview Loading skeleton for the view-invoices route.
 * @module domains/invoices/view-invoices/loading
 *
 * @remarks
 * Rendered automatically by Next.js while the server component
 * (`page.tsx`) is suspended on data fetching. The shimmer is a
 * 1:1 placeholder of the eventual layout (welcome header,
 * `InvoicesHeader`, tabs row, `FilterBar`, `TableView`) so the
 * user perceives no layout shift when real content swaps in.
 *
 * Responsive across all breakpoints (mirrors the `respond-to` /
 * `respond-below` rules used by the underlying components).
 */

import {Skeleton} from "@arolariu/components";
import styles from "./loading.module.scss";

const TABLE_ROW_COUNT = 6;

/**
 * Renders the loading skeleton for the invoice list page with table layout.
 *
 * @remarks
 * **Rendering Context**: Server Component (Next.js loading.tsx special file).
 *
 * **Automatic Activation**: Next.js displays this component when:
 * - User navigates to `/domains/invoices/view-invoices`
 * - `page.tsx` performs async operations (auth check, data fetching)
 * - Suspense boundary is triggered by the client island component
 *
 * **Layout Structure** (1:1 mapping to actual page):
 * 1. **Welcome Header**: Personalized title with 4 subtitle lines (mirrors `page.module.scss .headerSection`)
 * 2. **InvoicesHeader**: Title, description, and 4 action buttons (3 secondary + 1 primary)
 * 3. **Tabs Row**: 3 tab placeholders for view mode switching (All/Active/Archived)
 * 4. **FilterBar**: Search input, filter button, and view toggle (grid/table)
 * 5. **Table**: Header row with 6 columns + 6 data rows with checkboxes and actions
 *
 * **Column Structure**:
 * - Checkbox column (selection)
 * - Merchant name (strong/primary)
 * - Status pill (hidden on mobile via `.cellHidden`)
 * - Date (hidden on mobile via `.cellHidden`)
 * - Amount (always visible)
 * - Actions (always visible)
 *
 * **Responsive Design**: Uses SCSS mixins (`respond-to`, `respond-below`) to hide
 * non-essential columns on mobile devices. Status and date columns are marked with
 * `.cellHidden` class for responsive visibility control.
 *
 * **Performance Characteristics**:
 * - Zero JavaScript required (static HTML + CSS)
 * - No layout shift when real content loads (dimensions pre-allocated)
 * - Fast First Contentful Paint (FCP)
 * - Constant row count (6 rows) matches typical viewport capacity
 *
 * **Accessibility**: Skeleton components from `@arolariu/components` include proper
 * ARIA attributes (`role="status"`, `aria-busy="true"`) for screen reader support.
 * Table structure maintains semantic HTML for assistive technologies.
 *
 * **CSS Modules**: Uses scoped styles from `loading.module.scss` matching the
 * production layout styles from `page.module.scss` and `island.module.scss`.
 *
 * @returns Static skeleton UI with table layout matching the invoice list structure.
 * Includes personalized header section, invoice management controls (tabs, filters),
 * and a 6-row table with responsive column visibility for mobile optimization.
 *
 * @example
 * ```tsx
 * // Next.js automatically renders this when user navigates to view invoices
 * // User sees skeleton table while page.tsx performs:
 * // 1. Auth check: await fetchAaaSUserFromAuthService()
 * // 2. Metadata generation: await generateMetadata()
 * // 3. Island component initialization with Suspense boundary
 *
 * // Typical flow (desktop):
 * // [User clicks "View Invoices"]
 * //   → Loading() renders with full 6-column table
 * //   → page.tsx async operations complete (~100-300ms)
 * //   → Real table content replaces skeleton with same dimensions
 *
 * // Mobile flow:
 * // [User navigates on mobile]
 * //   → Loading() renders with 3 visible columns (checkbox, merchant, amount, actions)
 * //   → Status and date columns hidden via .cellHidden class
 * //   → Real content swaps in with matching responsive layout
 * ```
 *
 * @see {@link Skeleton} - Shared skeleton component from @arolariu/components
 * @see {@link ViewInvoicesPage} - Target page triggering this loading state
 * @see {@link RenderViewInvoicesScreen} - Client island with actual invoice table
 * @see RFC 1001 - OpenTelemetry observability (loading states traced)
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming}
 */
export default function Loading(): React.JSX.Element {
  return (
    <div className={styles["pageMain"]}>
      {/* Welcome header (mirrors page.module.scss .headerSection) */}
      <section className={styles["headerSection"]}>
        <Skeleton className={styles["headerTitle"]} />
        <Skeleton className={styles["headerSubtitleLine"]} />
        <Skeleton className={styles["headerSubtitleLine"]} />
        <Skeleton className={styles["headerSubtitleLineNarrow"]} />
      </section>

      <section>
        <section className={styles["section"]}>
          {/* InvoicesHeader skeleton */}
          <article className={styles["invoicesHeader"]}>
            <div className={styles["invoicesHeaderText"]}>
              <Skeleton className={styles["invoicesHeaderTitle"]} />
              <Skeleton className={styles["invoicesHeaderDescription"]} />
            </div>
            <div className={styles["invoicesHeaderActions"]}>
              <Skeleton className={styles["actionButton"]} />
              <Skeleton className={styles["actionButton"]} />
              <Skeleton className={styles["actionButton"]} />
              <Skeleton className={styles["actionButtonPrimary"]} />
            </div>
          </article>

          {/* Tabs row */}
          <div className={styles["tabsRow"]}>
            <Skeleton className={styles["tabSkeleton"]} />
            <Skeleton className={styles["tabSkeleton"]} />
            <Skeleton className={styles["tabSkeleton"]} />
          </div>

          {/* FilterBar skeleton */}
          <div className={styles["filterBar"]}>
            <Skeleton className={styles["searchSkeleton"]} />
            <Skeleton className={styles["filterButtonSkeleton"]} />
            <div className={styles["viewToggleSkeleton"]}>
              <Skeleton className={styles["viewToggleButton"]} />
              <Skeleton className={styles["viewToggleButton"]} />
            </div>
          </div>

          {/* Table skeleton */}
          <div className={styles["tableWrapper"]}>
            <div className={styles["tableHeaderRow"]}>
              <Skeleton className={styles["checkboxSkeleton"]} />
              <Skeleton className={styles["cellStrong"]} />
              <Skeleton className={`${styles["cellMuted"]} ${styles["cellHidden"]}`} />
              <Skeleton className={`${styles["cellMuted"]} ${styles["cellHidden"]}`} />
              <Skeleton className={styles["cellMuted"]} />
              <Skeleton className={styles["cellMuted"]} />
            </div>

            {Array.from({length: TABLE_ROW_COUNT}).map((_, index) => (
              <div
                key={`invoice-skeleton-row-${String(index)}`}
                className={styles["tableBodyRow"]}>
                <Skeleton className={styles["checkboxSkeleton"]} />
                <Skeleton className={styles["cellStrong"]} />
                <Skeleton className={`${styles["cellPill"]} ${styles["cellHidden"]}`} />
                <Skeleton className={`${styles["cellMuted"]} ${styles["cellHidden"]}`} />
                <Skeleton className={styles["cellMuted"]} />
                <Skeleton className={styles["cellActions"]} />
              </div>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
