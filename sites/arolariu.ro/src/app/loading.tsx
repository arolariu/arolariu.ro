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
    <main className={styles["page"]}>
      {/* Hero section skeleton */}
      <section className={styles["heroSection"]}>
        <main className={styles["heroContainer"]}>
          <main className={styles["heroGrid"]}>
            {/* Left side - Text */}
            <main className={styles["heroText"]}>
              <Skeleton className={styles["heroBadge"]} />
              <h1 className={styles["heroTitle"]}>Loading...</h1>
              <Skeleton className={styles["heroLine"]} />
              <Skeleton className={styles["heroLine"]} />
              <main className={styles["heroButtons"]}>
                <Skeleton className={styles["heroButton"]} />
                <Skeleton className={styles["heroButton"]} />
              </main>
            </main>

            {/* Right side - Sphere placeholder */}
            <main className={styles["heroVisual"]}>
              <main className={styles["sphereWrapper"]}>
                <Skeleton className={styles["sphere"]} />
                <main className={styles["orbitRing"]} />
                <main className={styles["orbitRingReverse"]} />
              </main>
            </main>
          </main>
        </main>
      </section>

      {/* Technology cards section */}
      <section className={styles["cardsSection"]}>
        <main className={styles["cardsContainer"]}>
          <main className={styles["cardsHeader"]}>
            <Skeleton className={styles["cardsHeaderBadge"]} />
            <Skeleton className={styles["cardsHeaderTitle"]} />
            <Skeleton className={styles["cardsHeaderSubtitle"]} />
          </main>

          <main className={styles["cardsGrid"]}>
            {[1, 2, 3, 4, 5, 6].map((key) => (
              <Skeleton
                key={key}
                className={styles["cardSkeleton"]}
              />
            ))}
          </main>
        </main>
      </section>
    </main>
  );
}
