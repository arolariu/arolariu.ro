/**
 * Route-level loading skeleton for the /about hub page.
 * Server component using Skeleton from @arolariu/components.
 * Mirrors the page.tsx layout 1:1 (7 sections).
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
          <div className={styles["heroButtons"]}>
            <Skeleton className={styles["heroButton"]} />
            <Skeleton className={styles["heroButton"]} />
          </div>
        </section>

        {/* ========== Mission Section ========== */}
        <div className={styles["section"]}>
          <div className={styles["sectionContainer"]}>
            <div className={styles["sectionHeader"]}>
              <Skeleton className={styles["sectionTitle"]} />
              <Skeleton className={styles["sectionStatement"]} />
              <Skeleton className={styles["sectionSubtitle"]} />
            </div>
            <div className={styles["missionGrid"]}>
              {Array.from({length: 3}).map((_, i) => (
                <Skeleton
                  key={`mission-${i.toString()}`}
                  className={styles["missionCard"]}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ========== Values Section ========== */}
        <div className={styles["section"]}>
          <div className={styles["sectionContainer"]}>
            <div className={styles["sectionHeader"]}>
              <Skeleton className={styles["sectionTitle"]} />
              <Skeleton className={styles["sectionSubtitle"]} />
            </div>
            <div className={styles["valuesGrid"]}>
              {Array.from({length: 6}).map((_, i) => (
                <Skeleton
                  key={`value-${i.toString()}`}
                  className={styles["valueCard"]}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ========== Stats Section ========== */}
        <div className={styles["section"]}>
          <div className={styles["sectionContainer"]}>
            <div className={styles["sectionHeader"]}>
              <Skeleton className={styles["sectionTitle"]} />
              <Skeleton className={styles["sectionSubtitle"]} />
            </div>
            <div className={styles["statsGrid"]}>
              {Array.from({length: 4}).map((_, i) => (
                <Skeleton
                  key={`stat-${i.toString()}`}
                  className={styles["statCard"]}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ========== Navigation Section ========== */}
        <div className={styles["section"]}>
          <div className={styles["sectionContainer"]}>
            <div className={styles["sectionHeader"]}>
              <Skeleton className={styles["sectionTitle"]} />
              <Skeleton className={styles["sectionSubtitle"]} />
            </div>
            <div className={styles["navGrid"]}>
              {Array.from({length: 2}).map((_, i) => (
                <Skeleton
                  key={`nav-${i.toString()}`}
                  className={styles["navCard"]}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ========== FAQ Section ========== */}
        <div className={styles["section"]}>
          <div className={styles["sectionContainer"]}>
            <div className={styles["sectionHeader"]}>
              <Skeleton className={styles["faqIcon"]} />
              <Skeleton className={styles["sectionTitle"]} />
              <Skeleton className={styles["sectionSubtitle"]} />
            </div>
            <div className={styles["faqList"]}>
              {Array.from({length: 4}).map((_, i) => (
                <Skeleton
                  key={`faq-${i.toString()}`}
                  className={styles["faqItem"]}
                />
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
