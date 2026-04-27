<script lang="ts">
  import {author} from "@/data";
  import {cx} from "@/lib/utils/classNames";
  import styles from "./Hero.module.scss";

  let heroVisible = $state(false);
  let imageLoaded = $state(false);

  // Trigger hero animation shortly after mount
  $effect(() => {
    const t = setTimeout(() => (heroVisible = true), 200);
    return () => clearTimeout(t);
  });

  function handleImageLoad() {
    imageLoaded = true;
  }
</script>

<section
  class={styles.section}
  style="view-transition-name: hero-section;">
  <div class={styles.backgroundWrapper}>
    <div class={styles.backgroundOrb1}></div>
    <div class={styles.backgroundOrb2}></div>
  </div>

  <div class={styles.container}>
    <div class={styles.profileImageWrapper}>
      <div class={cx(styles.imageGlow, !imageLoaded && styles.imageGlowHidden)}></div>
      <img
        src="/author.jpeg"
        alt={author.name}
        onload={handleImageLoad}
        class={cx(
          styles.avatar,
          heroVisible && imageLoaded ? styles.visible : styles.hidden,
          heroVisible ? styles.scaleIn : styles.scaleOut,
        )}
        style="view-transition-name: profile-image;" />
    </div>

    <div class={cx(styles.nameWrapper, heroVisible ? styles.fadeVisible : styles.fadeHidden)}>
      <h1 class={styles.name}>
        <span class={styles.firstName}>Alexandru-Razvan</span>
        <span class={styles.lastName}> Olariu </span>
      </h1>
    </div>

    <div class={cx(styles.taglineWrapper, heroVisible ? styles.fadeVisible : styles.fadeHidden)}>
      <p class={styles.tagline}>
        <span class={styles.taglineItem}>
          Software Engineer
          <span class={cx(styles.taglineUnderline, styles.underlineBlue, heroVisible ? styles.underlineVisible : styles.underlineHidden)}
          ></span>
        </span>
        <span class={styles.separator}>|</span>
        <span class={styles.taglineItem}>
          Solution Architect
          <span class={cx(styles.taglineUnderline, styles.underlinePurple, heroVisible ? styles.underlineVisible : styles.underlineHidden)}
          ></span>
        </span>
        <span class={styles.separator}>|</span>
        <span class={styles.taglineItem}>
          Mentor
          <span class={cx(styles.taglineUnderline, styles.underlinePink, heroVisible ? styles.underlineVisible : styles.underlineHidden)}
          ></span>
        </span>
      </p>
    </div>

    <div class={cx(styles.descriptionWrapper, heroVisible ? styles.fadeVisible : styles.fadeHidden)}>
      <p class={styles.description}>
        {new Date().getFullYear() - 2000}-year-old passionate software engineer based in {author.location}, dedicated to creating innovative
        solutions and building exceptional digital experiences.
      </p>
    </div>

    <div class={cx(styles.ctaWrapper, heroVisible ? styles.fadeVisible : styles.fadeHidden)}>
      <a
        href="#contact"
        class={cx(styles.ctaButton, styles.ctaPrimary)}>
        <span class={styles.buttonContent}>
          Get In Touch
          <svg
            class={styles.buttonIcon}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </span>
      </a>
      <a
        href="#experience"
        class={cx(styles.ctaButton, styles.ctaSecondary)}>
        <span class={styles.buttonContent}>
          View My Work
          <svg
            class={styles.buttonIcon}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </span>
      </a>
    </div>
  </div>
</section>
