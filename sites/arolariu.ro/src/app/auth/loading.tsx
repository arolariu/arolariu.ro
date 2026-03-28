/**
 * @fileoverview Loading UI for authentication routes.
 * @module app/auth/loading
 */

import {Skeleton} from "@arolariu/components";
import styles from "./loading.module.scss";

/**
 * Renders the loading skeleton for authentication pages.
 */
export default function Loading(): React.JSX.Element {
  return (
    <section className={styles["loadingSection"]}>
      <div className={styles["loadingContainer"]}>
        {/* Hero Header Skeleton */}
        <div className={styles["loadingHeader"]}>
          <div className={styles["loadingBadge"]}>
            <Skeleton className={styles["skBadge"]} />
          </div>

          <Skeleton className={styles["loadingTitle"]} />

          <div className={styles["loadingSubtitle"]}>
            <Skeleton className={styles["skTextFull"]} />
            <Skeleton className={styles["skText4of5"]} />
          </div>

          <div className={styles["loadingTrustBadges"]}>
            <Skeleton className={styles["skTrustPillSm"]} />
            <Skeleton className={styles["skTrustPillMd"]} />
            <Skeleton className={styles["skTrustPillXs"]} />
          </div>
        </div>

        {/* Separator */}
        <div className={styles["loadingSeparator"]}>
          <Skeleton className={styles["skDivider"]} />
        </div>

        {/* Cards Grid Skeleton */}
        <div className={styles["loadingCardsGrid"]}>
          {/* Card 1 - Sign Up */}
          <article className={styles["loadingCard"]}>
            <div className={styles["loadingCardHeader"]}>
              <Skeleton className={styles["skIcon"]} />
              <Skeleton className={styles["skStepLabel"]} />
            </div>

            <div className={styles["loadingCardIllustration"]}>
              <Skeleton className={styles["skIllustration"]} />
            </div>

            <div className={styles["loadingCardContent"]}>
              <Skeleton className={styles["skCardTitle48"]} />
              <Skeleton className={styles["skDescFull"]} />
              <Skeleton className={styles["skDesc4of5"]} />
            </div>

            <div className={styles["loadingCardBullets"]}>
              <div className={styles["loadingCardBulletItem"]}>
                <Skeleton className={styles["skDot"]} />
                <Skeleton className={styles["skBulletFull"]} />
              </div>
              <div className={styles["loadingCardBulletItem"]}>
                <Skeleton className={styles["skDot"]} />
                <Skeleton className={styles["skBullet5of6"]} />
              </div>
              <div className={styles["loadingCardBulletItem"]}>
                <Skeleton className={styles["skDot"]} />
                <Skeleton className={styles["skBullet4of5"]} />
              </div>
            </div>

            <div className={styles["loadingCardCta"]}>
              <Skeleton className={styles["skCtaBtn"]} />
              <Skeleton className={styles["skCtaText48"]} />
            </div>
          </article>

          {/* Card 2 - Sign In */}
          <article className={styles["loadingCard"]}>
            <div className={styles["loadingCardHeader"]}>
              <Skeleton className={styles["skIcon"]} />
              <Skeleton className={styles["skStepLabel"]} />
            </div>

            <div className={styles["loadingCardIllustration"]}>
              <Skeleton className={styles["skIllustration"]} />
            </div>

            <div className={styles["loadingCardContent"]}>
              <Skeleton className={styles["skCardTitle44"]} />
              <Skeleton className={styles["skDescFull"]} />
              <Skeleton className={styles["skDesc3of4"]} />
            </div>

            <div className={styles["loadingCardBullets"]}>
              <div className={styles["loadingCardBulletItem"]}>
                <Skeleton className={styles["skDot"]} />
                <Skeleton className={styles["skBulletFull"]} />
              </div>
              <div className={styles["loadingCardBulletItem"]}>
                <Skeleton className={styles["skDot"]} />
                <Skeleton className={styles["skBullet5of6"]} />
              </div>
              <div className={styles["loadingCardBulletItem"]}>
                <Skeleton className={styles["skDot"]} />
                <Skeleton className={styles["skBullet3of4"]} />
              </div>
            </div>

            <div className={styles["loadingCardCta"]}>
              <Skeleton className={styles["skCtaBtn"]} />
              <Skeleton className={styles["skCtaText44"]} />
            </div>
          </article>
        </div>

        {/* Footer */}
        <div className={styles["loadingFooter"]}>
          <Skeleton className={styles["skFooterFull"]} />
          <Skeleton className={styles["skFooter3of4"]} />
        </div>
      </div>
    </section>
  );
}
