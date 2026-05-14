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
 * Renders the loading skeleton for the invoice list page.
 *
 * @returns Server-rendered skeleton matching the live layout.
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
