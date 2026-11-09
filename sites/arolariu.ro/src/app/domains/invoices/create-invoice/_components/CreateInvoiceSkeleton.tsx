import {Skeleton} from "@arolariu/components";
import styles from "./CreateInvoiceSkeleton.module.scss";

/**
 * Loading skeleton matching the create invoice wizard structure.
 *
 * @remarks
 * Shared by the route `loading.tsx` fallback and the island scan check so both hold states keep identical geometry.
 * Displays:
 * - Step indicator at top
 * - Content area with skeletons
 * - Navigation buttons at bottom
 *
 * @returns JSX element with loading skeleton
 */
export default function CreateInvoiceSkeleton(): React.JSX.Element {
  return (
    <div className={styles["container"]}>
      {/* Step indicator skeleton */}
      <div className={styles["stepIndicator"]}>
        <Skeleton className={styles["stepDot"]} />
        <Skeleton className={styles["stepDot"]} />
        <Skeleton className={styles["stepDot"]} />
      </div>

      {/* Content area skeleton */}
      <div className={styles["content"]}>
        <Skeleton className={styles["title"]} />
        <Skeleton className={styles["subtitle"]} />

        <div className={styles["grid"]}>
          <Skeleton className={styles["card"]} />
          <Skeleton className={styles["card"]} />
          <Skeleton className={styles["card"]} />
          <Skeleton className={styles["card"]} />
        </div>
      </div>

      {/* Navigation buttons skeleton */}
      <div className={styles["navigation"]}>
        <Skeleton className={styles["button"]} />
        <Skeleton className={styles["button"]} />
      </div>
    </div>
  );
}
