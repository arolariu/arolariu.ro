import {Skeleton} from "@arolariu/components";
import styles from "./loading.module.scss";

/**
 * Loading skeleton for the create invoice page.
 *
 * @remarks
 * Displays a skeleton UI matching the wizard structure:
 * - Step indicator at top
 * - Content area with skeletons
 * - Navigation buttons at bottom
 *
 * @returns JSX element with loading skeleton
 */
export default function CreateInvoiceLoading(): React.JSX.Element {
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
