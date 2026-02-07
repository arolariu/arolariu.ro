import {Skeleton} from "@arolariu/components";
import styles from "./loading.module.scss";

/**
 * Loading skeleton for the view scans page.
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
