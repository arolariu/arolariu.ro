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
      <main className={styles["loadingContainer"]}>
        {/* Hero Header Skeleton */}
        <header className={styles["loadingHeader"]}>
          <main className={styles["loadingBadge"]}>
            <Skeleton className='h-8 w-32 rounded-full' />
          </main>

          <Skeleton className={`${styles["loadingTitle"]} h-14 w-80 max-w-full sm:h-16 lg:h-20`} />

          <main className={styles["loadingSubtitle"]}>
            <Skeleton className='mx-auto h-5 w-full' />
            <Skeleton className='mx-auto h-5 w-4/5' />
          </main>

          <main className={styles["loadingTrustBadges"]}>
            <Skeleton className='h-7 w-24 rounded-full' />
            <Skeleton className='h-7 w-28 rounded-full' />
            <Skeleton className='h-7 w-20 rounded-full' />
          </main>
        </header>

        {/* Separator */}
        <main className={styles["loadingSeparator"]}>
          <Skeleton className='h-px w-full' />
        </main>

        {/* Cards Grid Skeleton */}
        <main className={styles["loadingCardsGrid"]}>
          {/* Card 1 - Sign Up */}
          <article className={styles["loadingCard"]}>
            <main className={styles["loadingCardHeader"]}>
              <Skeleton className='h-12 w-12 rounded-xl' />
              <Skeleton className='h-5 w-14' />
            </main>

            <main className={styles["loadingCardIllustration"]}>
              <Skeleton className='h-48 w-48 rounded-2xl sm:h-56 sm:w-56' />
            </main>

            <main className={styles["loadingCardContent"]}>
              <Skeleton className='mx-auto h-9 w-48' />
              <Skeleton className='mx-auto h-5 w-full max-w-xs' />
              <Skeleton className='mx-auto h-5 w-4/5 max-w-xs' />
            </main>

            <main className={styles["loadingCardBullets"]}>
              <main className={styles["loadingCardBulletItem"]}>
                <Skeleton className='h-2 w-2 rounded-full' />
                <Skeleton className='h-4 w-full' />
              </main>
              <main className={styles["loadingCardBulletItem"]}>
                <Skeleton className='h-2 w-2 rounded-full' />
                <Skeleton className='h-4 w-5/6' />
              </main>
              <main className={styles["loadingCardBulletItem"]}>
                <Skeleton className='h-2 w-2 rounded-full' />
                <Skeleton className='h-4 w-4/5' />
              </main>
            </main>

            <main className={styles["loadingCardCta"]}>
              <Skeleton className='h-12 w-full rounded-lg' />
              <Skeleton className='mx-auto h-4 w-48' />
            </main>
          </article>

          {/* Card 2 - Sign In */}
          <article className={styles["loadingCard"]}>
            <main className={styles["loadingCardHeader"]}>
              <Skeleton className='h-12 w-12 rounded-xl' />
              <Skeleton className='h-5 w-14' />
            </main>

            <main className={styles["loadingCardIllustration"]}>
              <Skeleton className='h-48 w-48 rounded-2xl sm:h-56 sm:w-56' />
            </main>

            <main className={styles["loadingCardContent"]}>
              <Skeleton className='mx-auto h-9 w-44' />
              <Skeleton className='mx-auto h-5 w-full max-w-xs' />
              <Skeleton className='mx-auto h-5 w-3/4 max-w-xs' />
            </main>

            <main className={styles["loadingCardBullets"]}>
              <main className={styles["loadingCardBulletItem"]}>
                <Skeleton className='h-2 w-2 rounded-full' />
                <Skeleton className='h-4 w-full' />
              </main>
              <main className={styles["loadingCardBulletItem"]}>
                <Skeleton className='h-2 w-2 rounded-full' />
                <Skeleton className='h-4 w-5/6' />
              </main>
              <main className={styles["loadingCardBulletItem"]}>
                <Skeleton className='h-2 w-2 rounded-full' />
                <Skeleton className='h-4 w-3/4' />
              </main>
            </main>

            <main className={styles["loadingCardCta"]}>
              <Skeleton className='h-12 w-full rounded-lg' />
              <Skeleton className='mx-auto h-4 w-44' />
            </main>
          </article>
        </main>

        {/* Footer */}
        <main className={styles["loadingFooter"]}>
          <Skeleton className='mx-auto h-4 w-full' />
          <Skeleton className='mx-auto h-4 w-3/4' />
        </main>
      </main>
    </section>
  );
}
