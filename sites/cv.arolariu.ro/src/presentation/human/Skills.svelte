<script lang="ts">
  import {skills} from "@/data/skills";
  import {AnimatedSection} from "@/components/motion";
  import {onMount} from "svelte";
  import {cx} from "@/lib/utils/classNames";
  import styles from "./Skills.module.scss";

  let skillBarsVisible = $state(false);
  let sectionRef: HTMLElement | null = null;

  onMount(() => {
    if (!sectionRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            skillBarsVisible = true;
            observer.disconnect();
          }
        });
      },
      {threshold: 0.2},
    );

    observer.observe(sectionRef);
    return () => observer.disconnect();
  });

  // Color palette for skill categories
  const categoryColors = [
    {
      bg: styles.paletteBlueBg,
      light: styles.paletteBlueLight,
      text: styles.paletteBlueText,
      border: styles.paletteBlueBorder,
    },
    {
      bg: styles.palettePurpleBg,
      light: styles.palettePurpleLight,
      text: styles.palettePurpleText,
      border: styles.palettePurpleBorder,
    },
    {
      bg: styles.paletteEmeraldBg,
      light: styles.paletteEmeraldLight,
      text: styles.paletteEmeraldText,
      border: styles.paletteEmeraldBorder,
    },
    {
      bg: styles.paletteOrangeBg,
      light: styles.paletteOrangeLight,
      text: styles.paletteOrangeText,
      border: styles.paletteOrangeBorder,
    },
    {
      bg: styles.palettePinkBg,
      light: styles.palettePinkLight,
      text: styles.palettePinkText,
      border: styles.palettePinkBorder,
    },
    {
      bg: styles.paletteCyanBg,
      light: styles.paletteCyanLight,
      text: styles.paletteCyanText,
      border: styles.paletteCyanBorder,
    },
  ];
</script>

<section
  bind:this={sectionRef}
  id="skills"
  class={styles.section}>
  <div class={styles.container}>
    <AnimatedSection
      id="skills-title"
      animation="fade-up">
      <div class={styles.title}>
        <h2
          id="skills-heading"
          class={styles.heading}>
          Professional <span class={styles.accent}>Skills</span>
        </h2>
        <p class={styles.description}> Technical expertise and proficiency levels across different domains </p>
      </div>
    </AnimatedSection>

    <div class={styles.grid}>
      {#each skills as category, categoryIndex}
        {@const colors = categoryColors[categoryIndex % categoryColors.length]}
        {@const avgLevel = Math.round(category.skills.reduce((sum, s) => sum + (s.level ?? 0), 0) / category.skills.length)}
        <AnimatedSection
          id="skill-category-{categoryIndex}"
          animation="fade-up"
          delay={categoryIndex * 100}>
          <div class={cx(styles.card, colors.border)}>
            <div class={cx(styles.cardBackgroundHover, colors.light)}></div>

            <div class={styles.cardHeader}>
              <div class={cx(styles.iconWrapper, colors.bg)}>
                <svg
                  class={styles.iconSvg}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div class={styles.categoryInfo}>
                <h3 class={styles.categoryTitle}>
                  {category.title}
                </h3>
                <span class={cx(styles.categoryAverage, colors.text)}>{avgLevel}% avg proficiency</span>
              </div>
            </div>

            <div class={styles.skillList}>
              {#each category.skills as skill, skillIndex}
                {@const level = Math.max(0, Math.min(100, skill.level ?? 0))}
                <div class={styles.skillItem}>
                  <div class={styles.skillHeader}>
                    <span class={styles.skillName}>
                      {skill.name}
                    </span>
                    <span class={styles.skillLevel}>
                      {level}%
                    </span>
                  </div>
                  <div
                    class={styles.progressBar}
                    role="progressbar"
                    aria-label="{skill.name} proficiency"
                    aria-valuenow={level}
                    aria-valuemin={0}
                    aria-valuemax={100}>
                    <div
                      class={cx(styles.progressFill, colors.bg)}
                      style="transform: scaleX({skillBarsVisible ? level / 100 : 0}); transition-delay: {categoryIndex * 100 +
                        skillIndex * 50}ms;">
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </AnimatedSection>
      {/each}
    </div>

    <AnimatedSection
      id="skills-summary"
      animation="fade-up"
      delay={skills.length * 100 + 100}>
      <div class={styles.summary}>
        <p class={styles.summaryLabel}>Key Technologies</p>
        <div class={styles.tagList}>
          {#each skills.flatMap((c) => c.skills.filter((s) => (s.level ?? 0) >= 80).slice(0, 3)) as skill, i}
            <span
              class={styles.tag}
              style="--tag-delay: {i * 50}ms;">
              {skill.name}
            </span>
          {/each}
        </div>
      </div>
    </AnimatedSection>
  </div>
</section>
