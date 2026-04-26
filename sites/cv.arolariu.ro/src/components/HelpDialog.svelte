<script lang="ts">
  import {cx} from "@/lib/utils";
  import {help, techInfo, ui} from "@/data";
  import styles from "./HelpDialog.module.scss";

  // Bindable open flag; parent can bind:open, and we set open=false to close
  let {open = $bindable(false)} = $props();

  let container: HTMLDivElement | null = $state(null);
  let panel: HTMLDivElement | null = $state(null);
  let closeBtn: HTMLButtonElement | null = $state(null);
  let previouslyFocused: HTMLElement | null = null;
  let activeTab = $state<"info" | "shortcuts" | "features">("info");

  function focusFirstElement() {
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    (first ?? closeBtn ?? panel).focus();
  }

  function trapTab(e: KeyboardEvent) {
    if (!open || !panel) return;
    if (e.key !== "Tab") return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    const active = document.activeElement as HTMLElement | null;

    if (e.shiftKey) {
      if (active === first || !panel.contains(active)) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (active === last) {
        first.focus();
        e.preventDefault();
      }
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      e.preventDefault();
      open = false;
    } else if (e.key === "Tab") {
      trapTab(e);
    }
  }

  function handleOverlayClick(e: MouseEvent) {
    if (!open) return;
    if (e.target === container) {
      open = false;
    }
  }

  $effect(() => {
    if (!open) {
      previouslyFocused?.focus?.();
      return;
    }
    previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => focusFirstElement());
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  });

  // Keyboard shortcuts data
  const shortcuts = [
    {keys: ["⌘", "K"], description: "Open command palette", category: "Navigation"},
    {keys: ["Esc"], description: "Close dialogs/modals", category: "Navigation"},
    {keys: ["↑", "↓"], description: "Navigate command palette", category: "Navigation"},
    {keys: ["Enter"], description: "Select command", category: "Navigation"},
    {keys: ["Tab"], description: "Move focus forward", category: "Accessibility"},
    {keys: ["Shift", "Tab"], description: "Move focus backward", category: "Accessibility"},
  ];

  // Features data
  const features = [
    {
      icon: "document",
      title: "Multiple Formats",
      description: "View CV in human-readable, PDF, or JSON format",
    },
    {
      icon: "moon",
      title: "Dark/Light Mode",
      description: "Toggle between themes based on preference",
    },
    {
      icon: "command",
      title: "Command Palette",
      description: "Quick actions with ⌘K keyboard shortcut",
    },
    {
      icon: "chart",
      title: "Interactive Skills",
      description: "Radar chart visualization of skill proficiency",
    },
    {
      icon: "timeline",
      title: "Career Timeline",
      description: "Expandable work history with details",
    },
    {
      icon: "accessibility",
      title: "Accessible",
      description: "WCAG compliant with keyboard navigation",
    },
  ];

  function getFeatureIcon(icon: string): string {
    const icons: Record<string, string> = {
      document: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      moon: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
      command:
        "M18 3a3 3 0 00-3 3v12a3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3H6a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3V6a3 3 0 00-3-3 3 3 0 00-3 3 3 3 0 003 3h12a3 3 0 003-3 3 3 0 00-3-3z",
      chart:
        "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
      timeline: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      accessibility: "M13 10V3L4 14h7v7l9-11h-7z",
    };
    return icons[icon] ?? icons["document"] ?? "";
  }
</script>

{#if open}
  <!-- Overlay -->
  <div
    bind:this={container}
    class={styles.overlay}
    role="presentation"
    onclick={handleOverlayClick}
    onkeydown={handleKeydown}>
    <!-- Dialog panel -->
    <div
      bind:this={panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-dialog-title"
      aria-describedby="help-dialog-description"
      class={styles.panel}
      tabindex="-1"
      onkeydown={handleKeydown}>
      <!-- Header -->
      <header class={styles.header}>
        <div class={styles.headerTitleGroup}>
          <div class={styles.headerIconFrame}>
            <svg
              class={styles.headerIcon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3
              id="help-dialog-title"
              class={styles.title}>
              {help.title}
            </h3>
            <p class={styles.subtitle}>Learn about this CV website</p>
          </div>
        </div>
        <button
          bind:this={closeBtn}
          onclick={() => (open = false)}
          class={styles.closeButton}
          aria-label={ui.buttons.close}>
          <svg
            class={styles.closeIcon}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      <!-- Tabs -->
      <div class={styles.tabs}>
        <button
          onclick={() => (activeTab = "info")}
          class={cx(styles.tab, activeTab === "info" ? styles.tabActive : styles.tabIdle)}>
          Technical Info
        </button>
        <button
          onclick={() => (activeTab = "shortcuts")}
          class={cx(styles.tab, activeTab === "shortcuts" ? styles.tabActive : styles.tabIdle)}>
          Keyboard Shortcuts
        </button>
        <button
          onclick={() => (activeTab = "features")}
          class={cx(styles.tab, activeTab === "features" ? styles.tabActive : styles.tabIdle)}>
          Features
        </button>
      </div>

      <!-- Content -->
      <div class={styles.content}>
        <p
          id="help-dialog-description"
          class={styles.screenReaderOnly}>{help.title}</p>

        {#if activeTab === "info"}
          <!-- Technical Information -->
          <div class={styles.stackLarge}>
            <!-- Quick Stats -->
            <div class={styles.statsGrid}>
              <div class={styles.statCard}>
                <div class={cx(styles.statValue, styles.statPurple)}>{techInfo.version}</div>
                <div class={styles.statLabel}>Version</div>
              </div>
              <div class={styles.statCard}>
                <div class={cx(styles.statValue, styles.statBlue)}>{techInfo.framework}</div>
                <div class={styles.statLabel}>Framework</div>
              </div>
              <div class={styles.statCard}>
                <div class={cx(styles.statValue, styles.statGreen)}>100</div>
                <div class={styles.statLabel}>Lighthouse Score</div>
              </div>
              <div class={styles.statCard}>
                <div class={cx(styles.statValue, styles.statPink)}>PWA</div>
                <div class={styles.statLabel}>Installable</div>
              </div>
            </div>

            <!-- Info Table -->
            <div class={styles.tableFrame}>
              <table class={styles.table}>
                <tbody>
                  <tr class={styles.tableRow}>
                    <td class={styles.tableLabel}>{ui.labels.cloudProvider}</td>
                    <td class={styles.tableValueInline}>
                      <svg
                        class={styles.inlineIconBlue}
                        viewBox="0 0 96 96"
                        fill="currentColor">
                        <path d="M47.5 24.2L25.9 37.1v25.7l21.6 12.9 21.6-12.9V37.1L47.5 24.2z" />
                      </svg>
                      {techInfo.cloudProvider} ({techInfo.region})
                    </td>
                  </tr>
                  <tr class={styles.tableRow}>
                    <td class={styles.tableLabel}>{ui.labels.commitSha}</td>
                    <td class={styles.tableValue}>
                      <code class={styles.code}>
                        {techInfo.commitSha}
                      </code>
                    </td>
                  </tr>
                  <tr class={styles.tableRow}>
                    <td class={styles.tableLabel}>{ui.labels.buildTime}</td>
                    <td class={styles.tableValue}>{techInfo.buildTime}</td>
                  </tr>
                  <tr class={styles.tableRow}>
                    <td class={styles.tableLabel}>{ui.labels.sourceCode}</td>
                    <td class={styles.tableValue}>
                      <a
                        href={techInfo.sourceCodeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        class={styles.sourceLink}>
                        <svg
                          class={styles.sourceIcon}
                          fill="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        View Repository
                        <svg
                          class={styles.externalIcon}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Dependencies -->
            <div>
              <h4 class={styles.subheading}>{ui.labels.dependencies}</h4>
              <div class={styles.dependencyList}>
                {#each techInfo.dependencies as dep}
                  <span class={styles.dependencyPill}>
                    <span class={styles.dependencyName}>{dep.name}</span>
                    <span class={styles.dependencyVersion}>{dep.version}</span>
                  </span>
                {/each}
              </div>
            </div>
          </div>
        {:else if activeTab === "shortcuts"}
          <!-- Keyboard Shortcuts -->
          <div class={styles.stackMedium}>
            <p class={styles.helperText}> Use these keyboard shortcuts for faster navigation and actions. </p>
            <div class={styles.shortcutList}>
              {#each shortcuts as shortcut}
                <div class={styles.shortcutRow}>
                  <div class={styles.shortcutKeyGroup}>
                    <div class={styles.keyGroup}>
                      {#each shortcut.keys as key}
                        <kbd class={styles.shortcutKey}>
                          {key}
                        </kbd>
                      {/each}
                    </div>
                  </div>
                  <div class={styles.shortcutDescription}>
                    <span class={styles.shortcutText}>{shortcut.description}</span>
                    <span class={styles.shortcutCategory}>
                      {shortcut.category}
                    </span>
                  </div>
                </div>
              {/each}
            </div>
            <div class={styles.proTip}>
              <div class={styles.proTipContent}>
                <svg
                  class={styles.proTipIcon}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p class={styles.proTipTitle}>Pro Tip</p>
                  <p class={styles.proTipText}>
                    Press <kbd class={styles.proTipKey}>⌘</kbd> +
                    <kbd class={styles.proTipKey}>K</kbd> anywhere to quickly access any action
                    or navigate to any section.
                  </p>
                </div>
              </div>
            </div>
          </div>
        {:else if activeTab === "features"}
          <!-- Features Grid -->
          <div class={styles.featureGrid}>
            {#each features as feature, i}
              <div
                class={styles.featureCard}
                style="animation-delay: {i * 50}ms;">
                <div class={styles.featureCardContent}>
                  <div class={styles.featureIconFrame}>
                    <svg
                      class={styles.featureIcon}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d={getFeatureIcon(feature.icon)} />
                    </svg>
                  </div>
                  <div>
                    <h4 class={styles.featureTitle}>{feature.title}</h4>
                    <p class={styles.featureDescription}>{feature.description}</p>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <footer class={styles.footer}>
        <div class={styles.footerContent}>
          <p class={styles.footerText}> Built with care using modern web technologies </p>
          <button
            onclick={() => (open = false)}
            class={styles.footerButton}>
            {ui.buttons.close}
          </button>
        </div>
      </footer>
    </div>
  </div>
{/if}

