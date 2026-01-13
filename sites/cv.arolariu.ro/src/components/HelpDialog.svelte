<script lang="ts">
  import {help, techInfo, ui} from "@/data";

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
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    (first ?? closeBtn ?? panel).focus();
  }

  function trapTab(e: KeyboardEvent) {
    if (!open || !panel) return;
    if (e.key !== "Tab") return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
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
      command: "M18 3a3 3 0 00-3 3v12a3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3H6a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3V6a3 3 0 00-3-3 3 3 0 00-3 3 3 3 0 003 3h12a3 3 0 003-3 3 3 0 00-3-3z",
      chart: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
      timeline: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      accessibility: "M13 10V3L4 14h7v7l9-11h-7z",
    };
    return icons[icon] || icons.document;
  }
</script>

{#if open}
  <!-- Overlay -->
  <div
    bind:this={container}
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
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
      class="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[90vh] animate-slide-up"
      tabindex="-1"
      onkeydown={handleKeydown}>
      <!-- Header -->
      <header class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 id="help-dialog-title" class="text-xl font-bold text-gray-900 dark:text-white">
              {help.title}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">Learn about this CV website</p>
          </div>
        </div>
        <button
          bind:this={closeBtn}
          onclick={() => (open = false)}
          class="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          aria-label={ui.buttons.close}>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      <!-- Tabs -->
      <div class="flex border-b border-gray-200 dark:border-gray-700 px-6">
        <button
          onclick={() => (activeTab = "info")}
          class="px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer {activeTab === 'info'
            ? 'border-purple-500 text-purple-600 dark:text-purple-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}">
          Technical Info
        </button>
        <button
          onclick={() => (activeTab = "shortcuts")}
          class="px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer {activeTab === 'shortcuts'
            ? 'border-purple-500 text-purple-600 dark:text-purple-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}">
          Keyboard Shortcuts
        </button>
        <button
          onclick={() => (activeTab = "features")}
          class="px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer {activeTab === 'features'
            ? 'border-purple-500 text-purple-600 dark:text-purple-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}">
          Features
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto max-h-[60vh]">
        <p id="help-dialog-description" class="sr-only">{help.title}</p>

        {#if activeTab === "info"}
          <!-- Technical Information -->
          <div class="space-y-6">
            <!-- Quick Stats -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">{techInfo.version}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Version</div>
              </div>
              <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{techInfo.framework}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Framework</div>
              </div>
              <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                <div class="text-2xl font-bold text-green-600 dark:text-green-400">100</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Lighthouse Score</div>
              </div>
              <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                <div class="text-2xl font-bold text-pink-600 dark:text-pink-400">PWA</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Installable</div>
              </div>
            </div>

            <!-- Info Table -->
            <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{ui.labels.cloudProvider}</td>
                    <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                      <svg class="w-4 h-4 text-blue-500" viewBox="0 0 96 96" fill="currentColor">
                        <path d="M47.5 24.2L25.9 37.1v25.7l21.6 12.9 21.6-12.9V37.1L47.5 24.2z" />
                      </svg>
                      {techInfo.cloudProvider} ({techInfo.region})
                    </td>
                  </tr>
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{ui.labels.commitSha}</td>
                    <td class="px-4 py-3 text-sm">
                      <code class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300 font-mono text-xs">
                        {techInfo.commitSha}
                      </code>
                    </td>
                  </tr>
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{ui.labels.buildTime}</td>
                    <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{techInfo.buildTime}</td>
                  </tr>
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{ui.labels.sourceCode}</td>
                    <td class="px-4 py-3 text-sm">
                      <a
                        href={techInfo.sourceCodeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        View Repository
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Dependencies -->
            <div>
              <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">{ui.labels.dependencies}</h4>
              <div class="flex flex-wrap gap-2">
                {#each techInfo.dependencies as dep}
                  <span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm">
                    <span class="font-medium text-gray-900 dark:text-white">{dep.name}</span>
                    <span class="text-gray-500 dark:text-gray-400">{dep.version}</span>
                  </span>
                {/each}
              </div>
            </div>
          </div>
        {:else if activeTab === "shortcuts"}
          <!-- Keyboard Shortcuts -->
          <div class="space-y-4">
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Use these keyboard shortcuts for faster navigation and actions.
            </p>
            <div class="space-y-2">
              {#each shortcuts as shortcut}
                <div class="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div class="flex items-center gap-3">
                    <div class="flex items-center gap-1">
                      {#each shortcut.keys as key}
                        <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs font-mono text-gray-700 dark:text-gray-300 min-w-[24px] text-center">
                          {key}
                        </kbd>
                      {/each}
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-sm text-gray-700 dark:text-gray-300">{shortcut.description}</span>
                    <span class="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 dark:text-gray-400">
                      {shortcut.category}
                    </span>
                  </div>
                </div>
              {/each}
            </div>
            <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div class="flex items-start gap-3">
                <svg class="w-5 h-5 text-blue-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p class="text-sm font-medium text-blue-900 dark:text-blue-100">Pro Tip</p>
                  <p class="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Press <kbd class="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs font-mono">⌘</kbd> + <kbd class="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs font-mono">K</kbd> anywhere to quickly access any action or navigate to any section.
                  </p>
                </div>
              </div>
            </div>
          </div>
        {:else if activeTab === "features"}
          <!-- Features Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each features as feature, i}
              <div
                class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-500/50 dark:hover:border-purple-400/50 transition-all hover:shadow-md group"
                style="animation-delay: {i * 50}ms;">
                <div class="flex items-start gap-3">
                  <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getFeatureIcon(feature.icon)} />
                    </svg>
                  </div>
                  <div>
                    <h4 class="font-semibold text-gray-900 dark:text-white">{feature.title}</h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">{feature.description}</p>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <footer class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div class="flex items-center justify-between">
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Built with care using modern web technologies
          </p>
          <button
            onclick={() => (open = false)}
            class="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-medium rounded-lg transition-all hover:shadow-lg cursor-pointer">
            {ui.buttons.close}
          </button>
        </div>
      </footer>
    </div>
  </div>
{/if}

<style>
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.2s ease-out;
  }

  .animate-slide-up {
    animation: slide-up 0.3s ease-out;
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-fade-in,
    .animate-slide-up {
      animation: none;
    }
  }
</style>
