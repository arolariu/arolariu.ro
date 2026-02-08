/**
 * Route-level loading skeleton for the about/the-platform page.
 * Server component using Skeleton from @arolariu/components.
 * Mirrors the page.tsx layout 1:1 (6 sections).
 */

import {Skeleton} from "@arolariu/components";
import styles from "./loading.module.scss";

export default function Loading(): React.JSX.Element {
  return (
    <div className={styles["page"]}>
      <div className={styles["inner"]}>
        {/* ========== Hero Section ========== */}
        <section className={styles["hero"]}>
          <Skeleton className={styles["heroBadge"]} />
          <Skeleton className={styles["heroTitle"]} />
          <Skeleton className={styles["heroSubtitle"]} />
          <div className={styles["heroPills"]}>
            {Array.from({length: 3}).map((_, i) => (
              <Skeleton
                key={`pill-${i.toString()}`}
                className={styles["heroPill"]}
              />
            ))}
          </div>
          <div className={styles["heroButtons"]}>
            <Skeleton className={styles["heroButton"]} />
            <Skeleton className={styles["heroButton"]} />
          </div>
        </section>

        {/* ========== Features Section ========== */}
        <div className={styles["section"]}>
          <div className={styles["sectionContainer"]}>
            <div className={styles["sectionHeader"]}>
              <Skeleton className={styles["sectionBadge"]} />
              <Skeleton className={styles["sectionTitle"]} />
              <Skeleton className={styles["sectionSubtitle"]} />
            </div>
            <div className={styles["featuresGrid"]}>
              {Array.from({length: 9}).map((_, i) => (
                <Skeleton
                  key={`feat-${i.toString()}`}
                  className={i === 0 ? styles["featureCardHero"] : styles["featureCard"]}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ========== Architecture Section ========== */}
        <div className={styles["section"]}>
          <div className={styles["sectionContainer"]}>
            <div className={styles["sectionHeader"]}>
              <Skeleton className={styles["sectionBadge"]} />
              <Skeleton className={styles["sectionTitle"]} />
              <Skeleton className={styles["sectionSubtitle"]} />
            </div>
            <div className={styles["architectureGrid"]}>
              {Array.from({length: 8}).map((_, i) => (
                <Skeleton
                  key={`arch-${i.toString()}`}
                  className={styles["architectureCard"]}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ========== TechStack Section (with merged stats) ========== */}
        <div className={styles["section"]}>
          <div className={styles["sectionContainer"]}>
            <div className={styles["sectionHeader"]}>
              <Skeleton className={styles["sectionBadge"]} />
              <Skeleton className={styles["sectionTitle"]} />
              <Skeleton className={styles["sectionSubtitle"]} />
            </div>
            <Skeleton className={styles["tabBar"]} />
            <div className={styles["techGrid"]}>
              {Array.from({length: 6}).map((_, i) => (
                <Skeleton
                  key={`tech-${i.toString()}`}
                  className={styles["techCard"]}
                />
              ))}
            </div>
            <div className={styles["statsGrid"]}>
              {Array.from({length: 8}).map((_, i) => (
                <Skeleton
                  key={`stat-${i.toString()}`}
                  className={styles["statCard"]}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ========== Timeline Section ========== */}
        <div className={styles["section"]}>
          <div className={styles["sectionContainer"]}>
            <div className={styles["sectionHeader"]}>
              <Skeleton className={styles["sectionBadge"]} />
              <Skeleton className={styles["sectionTitle"]} />
              <Skeleton className={styles["sectionSubtitle"]} />
            </div>
            <div className={styles["timelineWrapper"]}>
              {Array.from({length: 8}).map((_, i) => (
                <div
                  key={`timeline-${i.toString()}`}
                  className={styles["timelineItem"]}>
                  <Skeleton className={styles["timelineCircle"]} />
                  <Skeleton className={styles["timelineCard"]} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ========== CTA Section ========== */}
        <div className={styles["ctaSection"]}>
          <Skeleton className={styles["ctaTitle"]} />
          <Skeleton className={styles["ctaSubtitle"]} />
          <div className={styles["ctaButtons"]}>
            <Skeleton className={styles["ctaButton"]} />
            <Skeleton className={styles["ctaButton"]} />
          </div>
        </div>
      </div>
    </div>
  );
}
