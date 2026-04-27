<script lang="ts">
  import {AnimatedSection} from "@/components/motion";
  import {competencies} from "@/data";
  import styles from "./Competencies.module.scss";

  const displayedCompetencies = [
    {
      ...competencies.engineeringExcellence,
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    {
      ...competencies.testDrivenDevelopment,
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    },
    {
      ...competencies.domainDrivenDesign,
      icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    },
    {
      ...competencies.customerCentric,
      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    },
    {
      ...competencies.agileMethodologies,
      icon: "M13 10V3L4 14h7v7l9-11h-7z",
    },
    {
      ...competencies.algorithmicSkills,
      icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z",
    },
  ];
</script>

<section class={styles.section}>
  <div class={styles.background}></div>

  <div class={styles.container}>
    <AnimatedSection
      id="competencies-title"
      animation="fade-up">
      <div class={styles.title}>
        <h2
          id="competencies"
          class={styles.heading}>
          Core <span class={styles.accent}>Competencies</span>
        </h2>
        <p class={styles.description}>
          A showcase of Alexandru's technical skills and professional competencies that drive his success.
        </p>
      </div>
    </AnimatedSection>

    <div class={styles.contentWrapper}>
      <div class={styles.grid}>
        {#each displayedCompetencies as competency, index}
          <AnimatedSection
            id="competency-{index}"
            animation="fade-up"
            delay={index * 150}>
            <div class={styles.card}>
              <div class={styles.cardHeader}>
                <div class={styles.icon}>
                  <svg
                    class={styles.iconSvg}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d={competency.icon}></path>
                  </svg>
                </div>
                <h3 class={styles.cardTitle}>
                  {competency.title}
                </h3>
              </div>
              <p class={styles.cardDescription}>
                {competency.description}
              </p>
            </div>
          </AnimatedSection>
        {/each}
      </div>
    </div>
  </div>
</section>
