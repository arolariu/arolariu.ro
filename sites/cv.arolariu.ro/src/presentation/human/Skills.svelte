<script lang="ts">
  import {AnimatedSection} from "@/components/motion";
  import {skills} from "@/data/skills";
  import {cx} from "@/lib/utils/classNames";
  import styles from "./Skills.module.scss";

  function sizeClass(size: string): string {
    return styles[`size${size.charAt(0).toUpperCase()}${size.slice(1)}`];
  }

  function accentClass(accent: string | undefined): string | undefined {
    if (!accent) return undefined;
    return styles[`accent${accent.charAt(0).toUpperCase()}${accent.slice(1)}`];
  }
</script>

<section
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
          What I <span class={styles.accent}>Build With</span>
        </h2>
        <p class={styles.description}>
          Curated by importance, not self-rated by percentage.
        </p>
      </div>
    </AnimatedSection>

    <div class={styles.grid}>
      {#each skills as skill, i}
        <AnimatedSection
          id="skill-tile-{i}"
          animation="fade-up"
          delay={i * 40 + (skill.size === "hero" ? 150 : 0)}>
          <div
            class={cx(styles.tile, sizeClass(skill.size), accentClass(skill.accent))}
            data-skill-tile
            data-skill-size={skill.size}>
            {#if skill.label}
              <span class={styles.label}>{skill.label}</span>
            {/if}
            <span class={styles.name}>{skill.name}</span>
            {#if skill.caption}
              <span class={styles.caption}>{skill.caption}</span>
            {/if}
          </div>
        </AnimatedSection>
      {/each}
    </div>
  </div>
</section>
