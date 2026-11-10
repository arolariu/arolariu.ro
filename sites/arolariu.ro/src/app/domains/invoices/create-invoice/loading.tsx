import {Skeleton} from "@arolariu/components";
import skeletonStyles from "./_components/CreateInvoiceSkeleton.module.scss";
import styles from "./page.module.scss";

/**
 * Loading fallback for the create invoice page.
 *
 * @remarks
 * Renders only skeleton primitives so this route fallback does not import wizard components.
 *
 * @returns JSX element with loading skeleton
 */
export default function CreateInvoiceLoading(): React.JSX.Element {
  return (
    <div className={styles["page"]}>
      <div className={skeletonStyles["container"]}>
        <div className={skeletonStyles["stepIndicator"]}>
          <Skeleton className={skeletonStyles["stepDot"]} />
          <Skeleton className={skeletonStyles["stepDot"]} />
          <Skeleton className={skeletonStyles["stepDot"]} />
        </div>

        <div className={skeletonStyles["content"]}>
          <Skeleton className={skeletonStyles["title"]} />
          <Skeleton className={skeletonStyles["subtitle"]} />

          <div className={skeletonStyles["grid"]}>
            <Skeleton className={skeletonStyles["card"]} />
            <Skeleton className={skeletonStyles["card"]} />
            <Skeleton className={skeletonStyles["card"]} />
            <Skeleton className={skeletonStyles["card"]} />
          </div>
        </div>

        <div className={skeletonStyles["navigation"]}>
          <Skeleton className={skeletonStyles["button"]} />
          <Skeleton className={skeletonStyles["button"]} />
        </div>
      </div>
    </div>
  );
}
