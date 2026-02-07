/**
 * Route-level loading skeleton for the my-profile page.
 * Server component using Skeleton from @arolariu/components.
 * Mirrors the island.tsx layout 1:1: bento header, sidebar, content, bottom nav.
 */

import {Skeleton} from "@arolariu/components";
import styles from "./loading.module.scss";

export default function Loading(): React.JSX.Element {
  return (
    <div className={styles["page"]}>
      {/* ========== Bento Grid Header (mirrors island.tsx bentoGrid) ========== */}
      <section className={styles["headerGrid"]}>
        {/* Profile Card (spans 2 cols on md+) */}
        <div className={styles["profileCard"]}>
          <Skeleton className={styles["profileBanner"]} />
          <div className={styles["profileInfo"]}>
            <Skeleton className={styles["avatarSkeleton"]} />
            <div className={styles["textLines"]}>
              {/* Name */}
              <Skeleton className='h-6 w-48' />
              {/* Email */}
              <Skeleton className='h-4 w-32' />
              {/* Badges row (3 badges) */}
              <div className={styles["badgeRow"]}>
                <Skeleton className='h-5 w-28' />
                <Skeleton className='h-5 w-28' />
                <Skeleton className='h-5 w-24' />
              </div>
            </div>
          </div>
          {/* Progress bar area */}
          <div className={styles["progressArea"]}>
            <div className={styles["progressHeader"]}>
              <Skeleton className='h-3 w-28' />
              <Skeleton className='h-3 w-8' />
            </div>
            <Skeleton className='h-2 w-full' />
          </div>
        </div>

        {/* Stats Summary Card */}
        <div className={styles["statsCard"]}>
          <Skeleton className='h-10 w-16' />
          <Skeleton className='h-4 w-24' />
          <div className={styles["statsMeta"]}>
            <Skeleton className='h-3 w-20' />
            <Skeleton className='h-3 w-16' />
          </div>
        </div>
      </section>

      {/* ========== Layout Row: sidebar + content (mirrors island.tsx layoutRow) ========== */}
      <div className={styles["layoutRow"]}>
        {/* Desktop Sidebar (hidden on mobile, mirrors 7 nav items) */}
        <div className={styles["sidebarSkeleton"]}>
          {Array.from({length: 7}).map((_, index) => (
            <Skeleton
              key={`sidebar-pill-${index.toString()}`}
              className={styles["sidebarPill"]}
            />
          ))}
        </div>

        {/* Content Panel (mirrors default "profile" panel = QuickStats) */}
        <div className={styles["contentSkeleton"]}>
          {/* Section header (title + description) */}
          <div className={styles["sectionHeader"]}>
            <Skeleton className='h-6 w-36' />
            <Skeleton className='h-4 w-64' />
          </div>

          {/* 6 Stat Cards in 1→2→3 grid */}
          <div className={styles["statCardsGrid"]}>
            {Array.from({length: 6}).map((_, index) => (
              <Skeleton
                key={`stat-card-${index.toString()}`}
                className={styles["statCardSkeleton"]}
              />
            ))}
          </div>

          {/* Storage Card */}
          <Skeleton className={styles["storageCardSkeleton"]} />
        </div>
      </div>

      {/* ========== Bottom Nav (mobile/tablet, mirrors 7 tab icons) ========== */}
      <div className={styles["bottomNav"]}>
        {Array.from({length: 7}).map((_, index) => (
          <div
            key={`bottom-nav-${index.toString()}`}
            className={styles["bottomNavPill"]}>
            <Skeleton className='h-5 w-5' />
            <Skeleton className='h-2 w-8' />
          </div>
        ))}
      </div>
    </div>
  );
}
