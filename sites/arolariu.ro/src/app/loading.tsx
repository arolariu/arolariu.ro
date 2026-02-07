/**
 * A server-rendered loading component that displays immediately.
 * Uses CSS animations instead of JavaScript to work during Next.js compilation.
 * Uses a div wrapper instead of main to avoid duplicate landmark violations when
 * page content also renders a main element during streaming/hydration.
 * @returns A loading component.
 */

import {Skeleton} from "@arolariu/components";
import styles from "./loading.module.scss";

export default function Loading(): React.JSX.Element {
  return (
    <div className={styles["page"]}>
      {/* Hero section skeleton */}
      <section className={styles["heroSection"]}>
        <div className={styles["heroContainer"]}>
          <div className={styles["heroGrid"]}>
            {/* Left side - Text */}
            <div className={styles["heroText"]}>
              <Skeleton className={styles["heroBadge"]} />
              <h1 className={styles["heroTitle"]}>Loading...</h1>
              <Skeleton className={styles["heroLine"]} />
              <Skeleton className={styles["heroLine"]} />
              <div className={styles["heroButtons"]}>
                <Skeleton className={styles["heroButton"]} />
                <Skeleton className={styles["heroButton"]} />
              </div>
            </div>

            {/* Right side - Sphere placeholder */}
            <div className={styles["heroVisual"]}>
              <div className={styles["sphereWrapper"]}>
                <Skeleton className={styles["sphere"]} />
                <div className={styles["orbitRing"]} />
                <div className={styles["orbitRingReverse"]} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology cards section */}
      <section className={styles["cardsSection"]}>
        <div className={styles["cardsContainer"]}>
          <div className={styles["cardsHeader"]}>
            <Skeleton className={styles["cardsHeaderBadge"]} />
            <Skeleton className={styles["cardsHeaderTitle"]} />
            <Skeleton className={styles["cardsHeaderSubtitle"]} />
          </div>

          <div className={styles["cardsGrid"]}>
            {[1, 2, 3, 4, 5, 6].map((key) => (
              <Skeleton
                key={key}
                className={styles["cardSkeleton"]}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
