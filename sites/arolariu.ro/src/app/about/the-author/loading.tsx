/**
 * Route-level loading skeleton for the about/the-author page.
 * Server component using Skeleton from @arolariu/components.
 * Mirrors the page.tsx layout 1:1.
 */

import {Skeleton} from "@arolariu/components";
import styles from "./loading.module.scss";

export default function Loading(): React.JSX.Element {
  return (
    <div className={styles["page"]}>
      <div className={styles["inner"]}>
        {/* ========== Hero Section ========== */}
        <section className={styles["hero"]}>
          <Skeleton className={styles["heroAvatar"]} />
          <Skeleton className={styles["heroTitle"]} />
          <Skeleton className={styles["heroSubtitle"]} />
        </section>

        {/* ========== Biography Section ========== */}
        <div className={styles["section"]}>
          <div className={styles["sectionContainer"]}>
            <div className={styles["sectionHeader"]}>
              <Skeleton className={styles["sectionTitle"]} />
            </div>
            <div className={styles["biographyCard"]}>
              {Array.from({length: 5}).map((_, i) => (
                <Skeleton
                  key={`bio-${i.toString()}`}
                  className={styles["biographyLine"]}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ========== Competencies Section ========== */}
        <div className={styles["sectionMuted"]}>
          <div className={styles["sectionContainer"]}>
            <div className={styles["sectionHeader"]}>
              <Skeleton className={styles["sectionTitle"]} />
              <Skeleton className={styles["sectionSubtitle"]} />
            </div>
            <div className={styles["competenciesGrid"]}>
              {Array.from({length: 6}).map((_, i) => (
                <Skeleton
                  key={`comp-${i.toString()}`}
                  className={styles["competencyCard"]}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ========== Experience Section ========== */}
        <div className={styles["sectionMuted"]}>
          <div className={styles["sectionContainer"]}>
            <div className={styles["sectionHeader"]}>
              <Skeleton className={styles["sectionTitle"]} />
              <Skeleton className={styles["sectionSubtitle"]} />
            </div>
            <div className={styles["experienceGrid"]}>
              <div className={styles["timelineSkeleton"]}>
                {Array.from({length: 5}).map((_, i) => (
                  <div
                    key={`timeline-${i.toString()}`}
                    className={styles["timelineItem"]}>
                    <Skeleton className={styles["timelineCircle"]} />
                    <div className={styles["timelineLines"]}>
                      <Skeleton className={styles["timelineLine1"]} />
                      <Skeleton className={styles["timelineLine2"]} />
                    </div>
                  </div>
                ))}
              </div>
              <Skeleton className={styles["experienceCardSkeleton"]} />
            </div>
          </div>
        </div>

        {/* ========== Education Section ========== */}
        <div className={styles["section"]}>
          <div className={styles["sectionContainer"]}>
            <div className={styles["sectionHeader"]}>
              <Skeleton className={styles["sectionTitle"]} />
              <Skeleton className={styles["sectionSubtitle"]} />
            </div>
            <div className={styles["educationGrid"]}>
              {Array.from({length: 2}).map((_, i) => (
                <Skeleton
                  key={`edu-${i.toString()}`}
                  className={styles["educationCard"]}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ========== Certifications Section ========== */}
        <div className={styles["section"]}>
          <div className={styles["sectionContainer"]}>
            <div className={styles["sectionHeader"]}>
              <Skeleton className={styles["sectionTitle"]} />
              <Skeleton className={styles["sectionSubtitle"]} />
            </div>
            <div className={styles["certificationsGrid"]}>
              {Array.from({length: 2}).map((_, i) => (
                <Skeleton
                  key={`cert-${i.toString()}`}
                  className={styles["certificationCard"]}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ========== Perspectives Section ========== */}
        <div className={styles["section"]}>
          <div className={styles["sectionContainer"]}>
            <div className={styles["sectionHeader"]}>
              <Skeleton className={styles["sectionTitle"]} />
              <Skeleton className={styles["sectionSubtitle"]} />
            </div>
            <div className={styles["perspectivesGrid"]}>
              {Array.from({length: 6}).map((_, i) => (
                <Skeleton
                  key={`persp-${i.toString()}`}
                  className={styles["perspectiveCard"]}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ========== Contact Section ========== */}
        <div className={styles["section"]}>
          <div className={styles["sectionContainer"]}>
            <div className={styles["sectionHeader"]}>
              <Skeleton className={styles["sectionTitle"]} />
              <Skeleton className={styles["sectionSubtitle"]} />
            </div>
            <div className={styles["contactGrid"]}>
              {Array.from({length: 2}).map((_, i) => (
                <Skeleton
                  key={`contact-${i.toString()}`}
                  className={styles["contactCard"]}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
