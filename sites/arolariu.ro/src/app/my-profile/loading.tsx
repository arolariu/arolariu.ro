/**
 * Route-level loading skeleton for the my-profile page.
 * Server component using Skeleton from @arolariu/components.
 * Matches the sidebar + content layout shape.
 */

import {Skeleton} from "@arolariu/components";
import styles from "./loading.module.scss";

export default function Loading(): React.JSX.Element {
  return (
    <div className={styles["page"]}>
      {/* Header skeleton */}
      <section className={styles["headerGrid"]}>
        <div className={styles["profileCard"]}>
          <Skeleton className={styles["profileBanner"]} />
          <div className={styles["profileInfo"]}>
            <Skeleton className={styles["avatarSkeleton"]} />
            <div className={styles["textLines"]}>
              <Skeleton className='h-6 w-48' />
              <Skeleton className='h-4 w-32' />
              <div className={styles["badgeRow"]}>
                <Skeleton className='h-5 w-24' />
                <Skeleton className='h-5 w-24' />
                <Skeleton className='h-5 w-24' />
              </div>
            </div>
          </div>
        </div>

        <div className={styles["statsCard"]}>
          <Skeleton className='h-10 w-20' />
          <Skeleton className='h-4 w-24' />
          <Skeleton className='h-3 w-32' />
        </div>
      </section>

      {/* Layout skeleton: sidebar + content */}
      <div className={styles["layoutRow"]}>
        <div className={styles["sidebarSkeleton"]}>
          {Array.from({length: 7}).map((_, index) => (
            <Skeleton
              key={`sidebar-pill-${index.toString()}`}
              className={styles["sidebarPill"]}
            />
          ))}
        </div>

        <div className={styles["contentSkeleton"]}>
          <div className={styles["contentGrid"]}>
            {Array.from({length: 4}).map((_, index) => (
              <Skeleton
                key={`content-card-${index.toString()}`}
                className={styles["cardSkeleton"]}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
