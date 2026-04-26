<script lang="ts">
  import {AnimatedSection} from "@/components/motion";
  import {experiencesAsArray, parseList} from "@/data/experiences";
  import Badge from "@/presentation/Badge.svelte";
  import {cx} from "@/lib/utils/classNames";
  import styles from "./Experience.module.scss";

  let expandedIndex = $state<number | null>(null);

  function toggleExpanded(index: number) {
    expandedIndex = expandedIndex === index ? null : index;
  }
</script>

<section
  id="experience"
  class={styles.section}>
  <div class={styles.background}></div>

  <div class={styles.container}>
    <AnimatedSection
      id="experience-title"
      animation="fade-up">
      <div class={styles.title}>
        <h2
          id="experience-heading"
          class={styles.heading}>
          Professional <span class={styles.accent}>Experience</span>
        </h2>
        <p class={styles.hint}>Click on a role to expand details</p>
      </div>
    </AnimatedSection>

    <div class={styles.contentWrapper}>
      <div class={styles.timeline}>
        <div class={styles.timelineLine}></div>

        <div class={styles.itemList}>
          {#each experiencesAsArray as experience, index}
            {@const isExpanded = expandedIndex === index}
            {@const isEven = index % 2 === 0}
            <AnimatedSection
              id="experience-{index}"
              animation={isEven ? "fade-right" : "fade-left"}
              delay={index * 150}>
              <div class={cx(styles.item, isEven ? "" : styles.itemReversed)}>
                <div class={styles.timelineDot}></div>

                <div class={styles.dateBadgeMobile}>
                  <span class={styles.dateBadge}>
                    {experience.period}
                  </span>
                </div>

                <div class={cx(styles.cardWrapper, isEven ? styles.cardWrapperLeft : styles.cardWrapperRight)}>
                  <button
                    onclick={() => toggleExpanded(index)}
                    class={cx(
                      styles.cardButton,
                      isExpanded ? styles.cardButtonExpanded : styles.cardButtonCollapsed,
                    )}
                    aria-expanded={isExpanded}>
                    <div class={styles.cardHeader}>
                      <div class={styles.cardHeaderContent}>
                        <div class={styles.cardTitleRow}>
                          <div>
                            <h3 class={styles.cardTitle}>
                              {experience.title}
                            </h3>
                            <p class={styles.cardCompany}>{experience.company}</p>
                          </div>
                          <div class={cx(styles.expandIcon, isExpanded && styles.expandIconRotated)}>
                            <svg
                              class={styles.expandIconSvg}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor">
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                        <p class={styles.cardLocation}>{experience.location}</p>
                      </div>
                      <div class={styles.dateBadgeContainer}>
                        <span class={styles.dateBadgeLarge}>
                          {experience.period}
                        </span>
                      </div>
                    </div>

                    <p class={styles.cardDescription}>
                      {experience.description}
                    </p>
                  </button>

                  {#if isExpanded}
                    <div class={styles.expandedContent}>
                      {#if experience.responsibilities && experience.responsibilities.trim()}
                        <div class={styles.expandedSection}>
                          <h4 class={styles.expandedTitle}>
                            <span class={cx(styles.titleDot, styles.titleDotBlue)}></span>
                            Key Responsibilities
                          </h4>
                          <ul class={styles.expandedList}>
                            {#each parseList(experience.responsibilities) as item, i}
                              <li
                                class={styles.expandedListItem}
                                style={`--delay:${i * 50}ms`}>
                                <span class={cx(styles.listIcon, styles.listIconBlue)}>▶</span>
                                <span class={styles.listItemText}>{item}</span>
                              </li>
                            {/each}
                          </ul>
                        </div>
                      {/if}

                      {#if experience.achievements && experience.achievements.trim()}
                        <div class={styles.expandedSection}>
                          <h4 class={styles.expandedTitle}>
                            <span class={cx(styles.titleDot, styles.titleDotGreen)}></span>
                            Key Achievements
                          </h4>
                          <ul class={styles.expandedList}>
                            {#each parseList(experience.achievements) as item, i}
                              <li
                                class={styles.expandedListItem}
                                style={`--delay:${i * 50 + 100}ms`}>
                                <span class={cx(styles.listIcon, styles.listIconGreen)}>✓</span>
                                <span class={styles.listItemText}>{item}</span>
                              </li>
                            {/each}
                          </ul>
                        </div>
                      {/if}

                      <div class={styles.expandedSection}>
                        <h4 class={styles.expandedTitle}>
                          <span class={cx(styles.titleDot, styles.titleDotPurple)}></span>
                          Technologies & Skills
                        </h4>
                        <div class={styles.badgeContainer}>
                          {#each parseList(experience.techAndSkills) as skill, skillIndex}
                            <Badge
                              text={skill}
                              color="blue"
                              size="sm"
                              variant="outline"
                              class="stagger-animation"
                              style={`--delay:${skillIndex * 30 + 200}ms`} />
                          {/each}
                        </div>
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
            </AnimatedSection>
          {/each}
        </div>
      </div>
    </div>
  </div>
</section>
