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
 * Renders the loading skeleton for the upload scans page.
 *
 * @returns Server-rendered skeleton matching the live layout.
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
