<!-- @format -->
<script lang="ts">
  import {help, techInfo, ui} from "@/data";
  // Bindable open flag; parent can bind:open, and we set open=false to close
  let {open = $bindable(false)} = $props();

  let container: HTMLDivElement | null = $state(null);
  let panel: HTMLDivElement | null = $state(null);
  let closeBtn: HTMLButtonElement | null = $state(null);
  let previouslyFocused: HTMLElement | null = null;

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
      // restore focus
      previouslyFocused?.focus?.();
      return;
    }
    previouslyFocused = document.activeElement as HTMLElement | null;
    // prevent background scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // focus after next tick
    requestAnimationFrame(() => focusFirstElement());
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  });
</script>

{#if open}
  <!-- Overlay -->
  <div
    bind:this={container}
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm 2xsm:p-2 xsm:p-4 sm:p-6"
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
      class="w-full shadow-2xl transform border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-black overflow-hidden max-h-[90vh] overflow-y-auto rounded-lg 2xsm:rounded-xl md:rounded-2xl p-4 xsm:p-5 sm:p-6 md:p-8 max-w-[calc(100%-0.5rem)] xsm:max-w-[calc(100%-1rem)] sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl 2xl:max-w-4xl 3xl:max-w-5xl"
      tabindex="-1"
      onkeydown={handleKeydown}>
      <header class="flex items-center justify-between mb-4 sm:mb-6">
        <div class="flex items-center">
          <div
            class="w-8 h-8 xsm:w-9 xsm:h-9 md:w-10 md:h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mr-2 sm:mr-3"
            aria-hidden="true">
            <svg
              class="w-5 h-5 xsm:w-5 xsm:h-5 md:w-6 md:h-6 text-white"
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
          <h3
            id="help-dialog-title"
            class="text-xl xsm:text-[22px] sm:text-2xl md:text-3xl font-bold text-black dark:text-white transition-colors duration-300">
            {help.title}
          </h3>
        </div>
        <button
          bind:this={closeBtn}
          onclick={() => (open = false)}
          class="transition-all duration-200 hover:scale-110 p-2 rounded-lg border text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
          aria-label={ui.buttons.close}>
          <svg
            class="w-5 h-5 sm:w-6 sm:h-6"
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

      <!-- Description (for screen readers) -->
      <p
        id="help-dialog-description"
        class="sr-only">{help.title}</p>

      <!-- Technical Information Table -->
      <div class="overflow-x-auto">
        <table
          class="min-w-full divide-y border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-lg text-[13px] xsm:text-sm">
          <caption class="sr-only">{help.title}</caption>
          <thead class="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th
                scope="col"
                class="px-3 xsm:px-4 sm:px-6 py-2 xsm:py-2.5 sm:py-3 text-left text-[11px] xsm:text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {ui.labels.property}
              </th>
              <th
                scope="col"
                class="px-3 xsm:px-4 sm:px-6 py-2 xsm:py-2.5 sm:py-3 text-left text-[11px] xsm:text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {ui.labels.value}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700 bg-gray-50 dark:bg-gray-900">
            <tr>
              <th
                scope="row"
                class="px-3 xsm:px-4 sm:px-6 py-3 whitespace-nowrap text-sm font-medium text-black dark:text-white">{ui.labels.version}</th>
              <td class="px-3 xsm:px-4 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded-md font-mono"
                  >{techInfo.version}</span>
              </td>
            </tr>
            <tr>
              <th
                scope="row"
                class="px-3 xsm:px-4 sm:px-6 py-3 whitespace-nowrap text-sm font-medium text-black dark:text-white"
                >{ui.labels.commitSha}</th>
              <td class="px-3 xsm:px-4 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                <span
                  class="px-2 py-1 rounded-md font-mono border bg-gray-100 dark:bg-gray-800 text-black dark:text-white border-gray-200 dark:border-gray-700"
                  >{techInfo.commitSha}</span>
              </td>
            </tr>
            <tr>
              <th
                scope="row"
                class="px-3 xsm:px-4 sm:px-6 py-3 whitespace-nowrap text-sm font-medium text-black dark:text-white"
                >{ui.labels.deployDate}</th>
              <td class="px-3 xsm:px-4 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{techInfo.deployDate}</td>
            </tr>
            <tr>
              <th
                scope="row"
                class="px-3 xsm:px-4 sm:px-6 py-3 whitespace-nowrap text-sm font-medium text-black dark:text-white"
                >{ui.labels.lastUpdated}</th>
              <td class="px-3 xsm:px-4 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{techInfo.lastUpdated}</td>
            </tr>
            <tr>
              <th
                scope="row"
                class="px-3 xsm:px-4 sm:px-6 py-3 whitespace-nowrap text-sm font-medium text-black dark:text-white"
                >{ui.labels.cloudProvider}</th>
              <td class="px-3 xsm:px-4 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                <div class="flex items-center">
                  <svg
                    class="w-4 h-4 xsm:w-5 xsm:h-5 mr-2 text-blue-600"
                    viewBox="0 0 96 96"
                    fill="currentColor"
                    aria-hidden="true">
                    <path d="M47.5 24.2L25.9 37.1v25.7l21.6 12.9 21.6-12.9V37.1L47.5 24.2z" />
                  </svg>
                  {techInfo.cloudProvider} ({techInfo.region})
                </div>
              </td>
            </tr>
            <tr>
              <th
                scope="row"
                class="px-3 xsm:px-4 sm:px-6 py-3 whitespace-nowrap text-sm font-medium text-black dark:text-white"
                >{ui.labels.framework}</th>
              <td class="px-3 xsm:px-4 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                <div class="flex items-center">
                  <svg
                    class="w-4 h-4 xsm:w-5 xsm:h-5 mr-2 text-orange-500"
                    viewBox="0 0 98.1 118"
                    fill="currentColor"
                    aria-hidden="true">
                    <path
                      d="M91.8 15.6C80.9-.1 59.2-4.7 43.6 5.2L16.1 22.8C8.6 27.5 3.4 35.2 1.9 43.9c-1.3 7.3-.2 14.8 3.3 21.3-2.4 3.6-4 7.6-4.7 11.8-1.6 8.9.5 18.1 5.7 25.4 11 15.7 32.6 20.3 48.2 10.4l27.5-17.5c7.5-4.7 12.7-12.4 14.2-21.1 1.3-7.3.2-14.8-3.3-21.3 2.4-3.6 4-7.6 4.7-11.8 1.7-9-.4-18.2-5.7-25.5" />
                  </svg>
                  {techInfo.framework}
                </div>
              </td>
            </tr>
            <tr>
              <th
                scope="row"
                class="px-3 xsm:px-4 sm:px-6 py-3 whitespace-nowrap text-sm font-medium text-black dark:text-white"
                >{ui.labels.sourceCode}</th>
              <td class="px-3 xsm:px-4 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                <a
                  href={techInfo.sourceCodeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors duration-200">
                  <svg
                    class="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true">
                    <path
                      d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  {ui.labels.viewRepository ?? "View repository"}
                  <svg
                    class="w-3 h-3 ml-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </td>
            </tr>
            <tr>
              <th
                scope="row"
                class="px-3 xsm:px-4 sm:px-6 py-3 whitespace-nowrap text-sm font-medium text-black dark:text-white"
                >{ui.labels.buildTime}</th>
              <td class="px-3 xsm:px-4 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{techInfo.buildTime}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Dependencies Section -->
      <section class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h4 class="text-base sm:text-lg font-semibold mb-3 text-black dark:text-white">
          {ui.labels.dependencies}
        </h4>
        <div class="grid grid-cols-1 xsm:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {#each techInfo.dependencies as dep}
            <div class="rounded-lg p-2 sm:p-3 text-center border bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <div class="font-medium text-black dark:text-white truncate">{dep.name}</div>
              <div class="text-[11px] xsm:text-xs text-gray-500 dark:text-gray-400">
                {dep.version}
              </div>
            </div>
          {/each}
        </div>
      </section>

      <!-- Footer -->
      <footer class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onclick={() => (open = false)}
          class="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg text-sm sm:text-base">
          {ui.buttons.close}
        </button>
      </footer>
    </div>
  </div>
{/if}
