import {Skeleton} from "@arolariu/components";
import styles from "./loading.module.scss";

/**
 * Loading skeleton for the upload scans page.
 */
export default function Loading(): React.JSX.Element {
  return (
    <main className={styles["wrapper"]}>
      <main className={styles["headerBlock"]}>
        <Skeleton className={styles["titleSkeleton"]} style={{height: "2.5rem", width: "16rem"}} />
        <Skeleton className={styles["subtitleSkeleton"]} style={{height: "1.5rem", width: "12rem"}} />
      </main>
      <section className={styles["contentSection"]}>
        <Skeleton className={styles["bodySkeleton"]} style={{height: "16rem"}} />
      </section>
    </main>
  );
}
