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
            <Skeleton className='h-8 w-32 rounded-full' />
          </div>

          <Skeleton className={`${styles["loadingTitle"]} h-14 w-80 max-w-full sm:h-16 lg:h-20`} />

          <div className={styles["loadingSubtitle"]}>
            <Skeleton className='mx-auto h-5 w-full' />
            <Skeleton className='mx-auto h-5 w-4/5' />
          </div>

          <div className={styles["loadingTrustBadges"]}>
            <Skeleton className='h-7 w-24 rounded-full' />
            <Skeleton className='h-7 w-28 rounded-full' />
            <Skeleton className='h-7 w-20 rounded-full' />
          </div>
        </div>

        {/* Separator */}
        <div className={styles["loadingSeparator"]}>
          <Skeleton className='h-px w-full' />
        </div>

        {/* Cards Grid Skeleton */}
        <div className={styles["loadingCardsGrid"]}>
          {/* Card 1 - Sign Up */}
          <article className={styles["loadingCard"]}>
            <div className={styles["loadingCardHeader"]}>
              <Skeleton className='h-12 w-12 rounded-xl' />
              <Skeleton className='h-5 w-14' />
            </div>

            <div className={styles["loadingCardIllustration"]}>
              <Skeleton className='h-48 w-48 rounded-2xl sm:h-56 sm:w-56' />
            </div>

            <div className={styles["loadingCardContent"]}>
              <Skeleton className='mx-auto h-9 w-48' />
              <Skeleton className='mx-auto h-5 w-full max-w-xs' />
              <Skeleton className='mx-auto h-5 w-4/5 max-w-xs' />
            </div>

            <div className={styles["loadingCardBullets"]}>
              <div className={styles["loadingCardBulletItem"]}>
                <Skeleton className='h-2 w-2 rounded-full' />
                <Skeleton className='h-4 w-full' />
              </div>
              <div className={styles["loadingCardBulletItem"]}>
                <Skeleton className='h-2 w-2 rounded-full' />
                <Skeleton className='h-4 w-5/6' />
              </div>
              <div className={styles["loadingCardBulletItem"]}>
                <Skeleton className='h-2 w-2 rounded-full' />
                <Skeleton className='h-4 w-4/5' />
              </div>
            </div>

            <div className={styles["loadingCardCta"]}>
              <Skeleton className='h-12 w-full rounded-lg' />
              <Skeleton className='mx-auto h-4 w-48' />
            </div>
          </article>

          {/* Card 2 - Sign In */}
          <article className={styles["loadingCard"]}>
            <div className={styles["loadingCardHeader"]}>
              <Skeleton className='h-12 w-12 rounded-xl' />
              <Skeleton className='h-5 w-14' />
            </div>

            <div className={styles["loadingCardIllustration"]}>
              <Skeleton className='h-48 w-48 rounded-2xl sm:h-56 sm:w-56' />
            </div>

            <div className={styles["loadingCardContent"]}>
              <Skeleton className='mx-auto h-9 w-44' />
              <Skeleton className='mx-auto h-5 w-full max-w-xs' />
              <Skeleton className='mx-auto h-5 w-3/4 max-w-xs' />
            </div>

            <div className={styles["loadingCardBullets"]}>
              <div className={styles["loadingCardBulletItem"]}>
                <Skeleton className='h-2 w-2 rounded-full' />
                <Skeleton className='h-4 w-full' />
              </div>
              <div className={styles["loadingCardBulletItem"]}>
                <Skeleton className='h-2 w-2 rounded-full' />
                <Skeleton className='h-4 w-5/6' />
              </div>
              <div className={styles["loadingCardBulletItem"]}>
                <Skeleton className='h-2 w-2 rounded-full' />
                <Skeleton className='h-4 w-3/4' />
              </div>
            </div>

            <div className={styles["loadingCardCta"]}>
              <Skeleton className='h-12 w-full rounded-lg' />
              <Skeleton className='mx-auto h-4 w-44' />
            </div>
          </article>
        </div>

        {/* Footer */}
        <div className={styles["loadingFooter"]}>
          <Skeleton className='mx-auto h-4 w-full' />
          <Skeleton className='mx-auto h-4 w-3/4' />
        </div>
      </div>
    </section>
  );
}
