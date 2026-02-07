import {Skeleton} from "@arolariu/components";
import styles from "./loading.module.scss";

/**
 * Loading skeleton for the view scans page.
 */
export default function Loading(): React.JSX.Element {
  return (
    <main className={styles["wrapper"]}>
      <section className={styles["container"]}>
        {/* Header skeleton */}
        <main className={styles["headerRow"]}>
          <main>
            <Skeleton style={{height: "2rem", width: "12rem", marginBottom: "0.5rem"}} />
            <Skeleton style={{height: "1rem", width: "8rem"}} />
          </main>
          <Skeleton style={{height: "2.5rem", width: "10rem"}} />
        </main>

        {/* Grid skeleton */}
        <main className={styles["grid"]}>
          {Array.from({length: 8}).map((_, i) => (
            <main
              key={`skeleton-${String(i)}`}
              className={styles["skeletonCard"]}>
              <Skeleton style={{aspectRatio: "4 / 3"}} />
              <main className={styles["skeletonCardBody"]}>
                <Skeleton style={{height: "1rem", width: "75%", marginBottom: "0.5rem"}} />
                <Skeleton style={{height: "0.75rem", width: "50%"}} />
              </main>
            </main>
          ))}
        </main>
      </section>
    </main>
  );
}
