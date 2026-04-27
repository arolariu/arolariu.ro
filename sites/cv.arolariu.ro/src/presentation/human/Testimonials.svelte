<script lang="ts">
  import {AnimatedSection} from "@/components/motion";
  import {testimonialsAsArray} from "@/data/testimonials";
  import styles from "./Testimonials.module.scss";
</script>

<section
  id="testimonials"
  class={styles.section}>
  <div class={styles.container}>
    <AnimatedSection
      id="testimonials-title"
      animation="fade-up">
      <div class={styles.title}>
        <h2
          id="testimonials-heading"
          class={styles.heading}>
          What <span class={styles.accent}>Colleagues Say</span>
        </h2>
        <p class={styles.description}> Authentic testimonials from Microsoft colleagues who have worked alongside Alexandru. </p>
      </div>
    </AnimatedSection>

    <div class={styles.grid}>
      {#each testimonialsAsArray as testimonial, index}
        <AnimatedSection
          animation="fade-up"
          delay={100 * index}>
          <div class={styles.card}>
            <div class={styles.quoteIcon}>
              <svg
                class={styles.quoteSvg}
                fill="currentColor"
                viewBox="0 0 24 24">
                <path
                  d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z" />
              </svg>
            </div>

            <div class={styles.content}>
              <blockquote class={styles.quote}> "{testimonial.quote}" </blockquote>
            </div>

            <div class={styles.authorSection}>
              <div class={styles.avatar}>
                <span class={styles.avatarInitial}>
                  {testimonial.author.charAt(0)}
                </span>
              </div>
              <h4 class={styles.authorName}>
                {testimonial.author}
              </h4>
              <p class={styles.authorPosition}>
                {testimonial.position}
              </p>
              <p class={styles.authorCompany}>
                {testimonial.company}
              </p>
            </div>
          </div>
        </AnimatedSection>
      {/each}
    </div>
  </div>
</section>
