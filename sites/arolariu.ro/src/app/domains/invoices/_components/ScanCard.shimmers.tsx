"use client";

/**
 * @fileoverview Shimmer placeholders for the ScanCard component.
 * @module sites/arolariu.ro/src/app/domains/invoices/_components/ScanCard.shimmers
 *
 * @remarks
 * Colocated with ScanCard.tsx so the shimmer styles + markup live together
 * as a single self-contained unit. The shimmer is rendered in two places
 * today:
 *
 * 1. **Pre-hydration loading grid** — `ScansGrid` shows a fixed set of
 *    shimmers before the Zustand store has hydrated from IndexedDB.
 * 2. **Deferred-mount placeholder** — inside `<DeferredMount>` as the
 *    placeholder for cards not yet scrolled into the viewport.
 *
 * Sharing one component keeps the visual layout consistent across both
 * call sites.
 */

import {Skeleton} from "@arolariu/components";
import styles from "./ScanCard.shimmers.module.scss";

/**
 * Skeleton placeholder matching a ScanCard's outer dimensions (4:3 preview
 * image + two text lines for the file name and meta row).
 */
export function CardShimmer(): React.JSX.Element {
  return (
    <div className={styles["skeletonCard"]}>
      <Skeleton className={styles["skeletonImage"]} />
      <div className={styles["skeletonInfo"]}>
        <Skeleton className={styles["skeletonName"]} />
        <Skeleton className={styles["skeletonMeta"]} />
      </div>
    </div>
  );
}
