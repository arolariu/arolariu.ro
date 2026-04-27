<script lang="ts">
  import {AnimatedSection} from "@/components/motion";
  import {certificationsAsArray} from "@/data/certifications";
  import {educationAsArray} from "@/data/education";
  import {cx} from "@/lib/utils/classNames";
  import styles from "./Education.module.scss";
</script>

<section
  id="education"
  class={styles.section}>
  <div class={styles.container}>
    <AnimatedSection
      id="education-title"
      animation="fade-up">
      <div class={styles.title}>
        <h2
          id="education-heading"
          class={styles.heading}>
          Education <span class={styles.accent}>& Certifications</span>
        </h2>
      </div>
    </AnimatedSection>

    <div class={styles.contentWrapper}>
      <!-- Education -->
      <div class={styles.categorySection}>
        <div class={styles.categoryTitle}>
          <h3
            id="academic-background"
            class={styles.categoryHeading}>
            Academic <span class={styles.accent}>Background</span>
          </h3>
        </div>
        <div class={styles.itemList}>
          {#each educationAsArray as education, index}
            <AnimatedSection
              id="education-{index}"
              animation="fade-up"
              delay={index * 200}>
              <div class={styles.card}>
                <div class={styles.cardHeader}>
                  <div class={styles.cardContent}>
                    <h4 class={styles.cardTitle}>
                      {education.degree}
                    </h4>
                    <p class={styles.cardInstitution}>
                      {education.institution}
                    </p>
                    <p class={styles.cardLocation}>{education.location}</p>
                    <p class={styles.cardDescription}>
                      {education.description}
                    </p>
                  </div>
                  <div class={styles.cardMeta}>
                    <div class={styles.periodBadge}>
                      {education.period}
                    </div>
                    <span
                      class={cx(styles.statusBadge, education.status === "Completed" ? styles.statusCompleted : styles.statusInProgress)}>
                      {education.status}
                    </span>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          {/each}
        </div>
      </div>

      <!-- Certifications -->
      <div class={styles.categorySection}>
        <div class={styles.categoryTitle}>
          <h3
            id="professional-certifications"
            class={styles.categoryHeading}>
            Professional <span class={styles.accent}>Certifications</span>
          </h3>
        </div>
        <div class={styles.grid}>
          {#each certificationsAsArray as cert, index}
            <AnimatedSection
              id="cert-{index}"
              animation="fade-up"
              delay={index * 200}>
              <div class={styles.certCard}>
                <div class={styles.certHeader}>
                  <div class={styles.certContent}>
                    <h4 class={styles.certTitle}>
                      {cert.name}
                    </h4>
                    <p class={styles.certCode}>Code: {cert.code}</p>
                    <p class={styles.certIssuer}>{cert.issuer}</p>
                  </div>
                  <span class={styles.certDate}>
                    {cert.issueDate}
                  </span>
                </div>
                <p class={styles.certDescription}>
                  {cert.description}
                </p>
              </div>
            </AnimatedSection>
          {/each}
        </div>
      </div>
    </div>
  </div>
</section>
