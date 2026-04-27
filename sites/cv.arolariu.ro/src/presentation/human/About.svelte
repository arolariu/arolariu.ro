<script lang="ts">
  import {AnimatedSection} from "@/components/motion";
  import {biography} from "@/data";
  import styles from "./About.module.scss";
</script>

<section
  id="about"
  class={styles.section}>
  <div class={styles.background}></div>

  <div class={styles.container}>
    <AnimatedSection
      id="about-title"
      animation="fade-up">
      <div class={styles.title}>
        <h2
          id="about-heading"
          class={styles.heading}>
          About <span class={styles.accent}>Me</span>
        </h2>
      </div>
    </AnimatedSection>

    <div class={styles.contentWrapper}>
      <div class={styles.grid}>
        <AnimatedSection
          id="about-left"
          animation="fade-right"
          delay={200}>
          <div class={styles.card}>
            <div class={styles.cardTitle}>
              <h3
                id="about-professional"
                class={styles.cardHeading}>
                Professional <span class={styles.accent}>Journey</span>
              </h3>
            </div>
            <div class={styles.cardContent}>
              <p>{biography.firstPoint}</p>
              <p>{biography.secondPoint}</p>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection
          id="about-right"
          animation="fade-left"
          delay={400}>
          <div class={styles.card}>
            <div class={styles.cardTitle}>
              <h3
                id="about-interests"
                class={styles.cardHeading}>
                Interests <span class={styles.accent}>& Passion</span>
              </h3>
            </div>
            <div class={styles.cardContent}>
              <p>{biography.thirdPoint}</p>
              <p>{biography.fourthPoint}</p>
            </div>
          </div>
        </AnimatedSection>
      </div>

      <AnimatedSection
        id="about-collaboration"
        animation="fade-up"
        delay={600}>
        <div class={styles.collaborationCard}>
          <div class={styles.collaborationTitle}>
            <h3
              id="about-collaboration-heading"
              class={styles.cardHeading}>
              Open for <span class={styles.accent}>Collaboration</span>
            </h3>
          </div>
          <p class={styles.collaborationContent}>
            {biography.fifthPoint}
          </p>
        </div>
      </AnimatedSection>
    </div>
  </div>
</section>
