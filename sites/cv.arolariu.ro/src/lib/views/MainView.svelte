<!--
@component MainView

Landing page presenting CV format options as an interactive panel grid with animated background.

@remarks
**Rendering Context**: SvelteKit page component (SSR + hydration).

**Purpose**: Serves as the entry point for the CV site, allowing visitors
to choose their preferred CV format (Human-readable, PDF, or JSON).

**Visual Features**:
- Animated floating gradient blobs in the background
- Smooth panel hover animations
- Dark/light mode support

**Panels**:
1. **Human** - Interactive web-based CV with animations
2. **PDF** - Traditional printable format (ATS-optimized)
3. **JSON** - Structured data for developers/APIs
4. **Help** - Opens help dialog modal

@example
```svelte
<MainView />
```
-->
<script lang="ts">
  import {landing} from "@/data";
  import ThemeToggle from "@/components/ThemeToggle.svelte";
  import HelpDialog from "@/components/HelpDialog.svelte";
  import {goto} from "$app/navigation";
  import {cx} from "@/lib/utils";
  import Icon, {type IconName} from "@/presentation/Icon.svelte";
  import Footer from "@/presentation/Footer.svelte";
  import styles from "./MainView.module.scss";

  /** Controls visibility of the help dialog modal. */
  let showHelpDialog = $state<boolean>(false);

  /**
   * Panel configuration for the landing page grid.
   */
  const panels = [
    {
      id: "human",
      title: "CV - Human Readable Format",
      description: "Interactive web-based resume with modern design and animations",
      gradient: "bluePurple",
      icon: "user" satisfies IconName,
      action: () => goto("/human"),
    },
    {
      id: "pdf",
      title: "CV - PDF Format",
      description: "Traditional resume format optimized for printing and ATS systems",
      gradient: "greenTeal",
      icon: "file" satisfies IconName,
      action: () => goto("/pdf"),
    },
    {
      id: "json",
      title: "CV - JSON Format",
      description:
        "Structured resume data following the JSON Resume schema standard. Perfect for developers, APIs, and automated processing systems.",
      gradient: "orangeRed",
      icon: "json" satisfies IconName,
      action: () => goto("/json"),
    },
    {
      id: "help",
      title: landing.panels.help.title,
      description: landing.panels.help.description,
      gradient: "purplePink",
      icon: "help" satisfies IconName,
      action: () => (showHelpDialog = true),
    },
  ] as const;

  const gradientClasses = {
    bluePurple: styles.gradientBluePurple,
    greenTeal: styles.gradientGreenTeal,
    orangeRed: styles.gradientOrangeRed,
    purplePink: styles.gradientPurplePink,
  } as const;
</script>

<div class={styles.shell}>
  <!-- Animated Background Blobs -->
  <div
    class={styles.background}
    aria-hidden="true">
    <!-- Blob 1 - Blue -->
    <div class={cx(styles.blob, styles.blobBlue)}></div>

    <!-- Blob 2 - Purple -->
    <div class={cx(styles.blob, styles.blobPurple)}></div>

    <!-- Blob 3 - Pink -->
    <div class={cx(styles.blob, styles.blobPink)}></div>

    <!-- Blob 4 - Cyan (smaller accent) -->
    <div class={cx(styles.blob, styles.blobCyan)}></div>

    <!-- Subtle grid pattern overlay -->
    <div class={styles.gridOverlay}></div>
  </div>

  <div class={styles.themeToggle}>
    <ThemeToggle />
  </div>

  <div class={styles.content}>
    <!-- Header with stark contrast -->
    <div class={styles.hero}>
      <h1 class={styles.title}>
        Alexandru-Razvan
        <span class={styles.titleAccent}>Olariu</span>
      </h1>
      <p class={styles.subtitle}>
        {landing.subtitle}
      </p>
    </div>

    <div class={styles.panelGrid}>
      {#each panels as panel, i}
        <button
          type="button"
          class={styles.panelCard}
          style="--panel-delay: {i * 100}ms;"
          aria-label={panel.title}
          onclick={panel.action}
          data-panel={panel.id}>
          <div class={cx(styles.panelGradientOverlay, gradientClasses[panel.gradient])}></div>
          <div class={styles.panelIconWrap}>
            <div class={cx(styles.panelIconFrame, gradientClasses[panel.gradient])}>
              <Icon
                name={panel.icon}
                class={styles.panelIcon} />
            </div>
          </div>
          <div class={styles.panelContent}>
            <h3 class={styles.panelTitle}>
              {panel.title}
            </h3>
            {#if panel.description}
              <p class={styles.panelDescription}>
                {panel.description}
              </p>
            {/if}
          </div>
          {#if panel.id !== "help"}
            <div class={styles.panelArrow}>
              <Icon
                name="arrow-right"
                class={styles.panelArrowIcon} />
            </div>
          {/if}
        </button>
      {/each}
    </div>

    <!-- Footer -->
    <Footer />
  </div>

  <HelpDialog bind:open={showHelpDialog} />
</div>
