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
  import Icon from "@/presentation/Icon.svelte";
  import Footer from "@/presentation/Footer.svelte";

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
      gradient: "from-blue-500 to-purple-600",
      icon: "user",
      action: () => goto("/human"),
    },
    {
      id: "pdf",
      title: "CV - PDF Format",
      description: "Traditional resume format optimized for printing and ATS systems",
      gradient: "from-green-500 to-teal-600",
      icon: "file",
      action: () => goto("/pdf"),
    },
    {
      id: "json",
      title: "CV - JSON Format",
      description:
        "Structured resume data following the JSON Resume schema standard. Perfect for developers, APIs, and automated processing systems.",
      gradient: "from-orange-500 to-red-600",
      icon: "json",
      action: () => goto("/json"),
    },
    {
      id: "help",
      title: landing.panels.help.title,
      description: landing.panels.help.description,
      gradient: "from-purple-500 to-pink-600",
      icon: "help",
      action: () => (showHelpDialog = true),
    },
  ] as const;
</script>

<div
  class="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-all duration-300 flex items-center justify-center p-6 overflow-hidden relative">
  <!-- Animated Background Blobs -->
  <div
    class="absolute inset-0 overflow-hidden pointer-events-none"
    aria-hidden="true">
    <!-- Blob 1 - Blue -->
    <div
      class="absolute w-[500px] h-[500px] rounded-full opacity-20 dark:opacity-10 blur-3xl animate-blob-1"
      style="background: radial-gradient(circle, #3b82f6 0%, transparent 70%); top: -10%; left: -10%;">
    </div>

    <!-- Blob 2 - Purple -->
    <div
      class="absolute w-[400px] h-[400px] rounded-full opacity-20 dark:opacity-10 blur-3xl animate-blob-2"
      style="background: radial-gradient(circle, #8b5cf6 0%, transparent 70%); top: 50%; right: -5%;">
    </div>

    <!-- Blob 3 - Pink -->
    <div
      class="absolute w-[350px] h-[350px] rounded-full opacity-15 dark:opacity-10 blur-3xl animate-blob-3"
      style="background: radial-gradient(circle, #ec4899 0%, transparent 70%); bottom: -5%; left: 30%;">
    </div>

    <!-- Blob 4 - Cyan (smaller accent) -->
    <div
      class="absolute w-[250px] h-[250px] rounded-full opacity-15 dark:opacity-5 blur-2xl animate-blob-4"
      style="background: radial-gradient(circle, #06b6d4 0%, transparent 70%); top: 20%; right: 20%;">
    </div>

    <!-- Subtle grid pattern overlay -->
    <div
      class="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
      style="background-image: radial-gradient(circle, currentColor 1px, transparent 1px); background-size: 40px 40px;">
    </div>
  </div>

  <div class="fixed top-6 right-6 z-50">
    <ThemeToggle />
  </div>

  <div class="relative z-10 max-w-6xl mx-auto">
    <!-- Header with stark contrast -->
    <div class="text-center mb-12">
      <h1 class="text-4xl md:text-6xl font-bold mb-4 font-['Caudex'] text-black dark:text-white transition-colors duration-300">
        Alexandru-Razvan
        <span class="text-blue-600 dark:text-blue-400">Olariu</span>
      </h1>
      <p class="text-xl mb-8 text-gray-600 dark:text-gray-400 transition-colors duration-300">
        {landing.subtitle}
      </p>
    </div>

    <div class="grid md:grid-cols-2 gap-6 lg:gap-8">
      {#each panels as panel, i}
        <button
          type="button"
          class="panel-card group relative backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl text-left cursor-pointer transform focus:outline-none focus:ring-4 focus:ring-blue-500/40"
          style="animation: panelFadeIn 0.5s ease-out {i * 100}ms both;"
          aria-label={panel.title}
          onclick={panel.action}
          data-panel={panel.id}>
          <div
            class="absolute inset-0 bg-gradient-to-r {panel.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300"
          ></div>
          <div class="relative mb-6">
            <div
              class="w-16 h-16 bg-gradient-to-r {panel.gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <Icon
                name={panel.icon as any}
                class="w-8 h-8 text-white" />
            </div>
          </div>
          <div class="relative">
            <h3
              class="text-2xl font-bold mb-3 text-black dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
              {panel.title}
            </h3>
            {#if panel.description}
              <p class="leading-relaxed text-gray-600 dark:text-gray-400 transition-colors duration-300">
                {panel.description}
              </p>
            {/if}
          </div>
          {#if panel.id !== "help"}
            <div class="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Icon
                name="arrow-right"
                class="w-6 h-6 text-blue-600 dark:text-blue-400" />
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

<style>
  @keyframes panelFadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes blob-float-1 {
    0%,
    100% {
      transform: translate(0, 0) scale(1);
    }
    25% {
      transform: translate(30px, -30px) scale(1.05);
    }
    50% {
      transform: translate(60px, 20px) scale(0.95);
    }
    75% {
      transform: translate(20px, 40px) scale(1.02);
    }
  }

  @keyframes blob-float-2 {
    0%,
    100% {
      transform: translate(0, 0) scale(1);
    }
    33% {
      transform: translate(-40px, 30px) scale(1.1);
    }
    66% {
      transform: translate(-20px, -40px) scale(0.9);
    }
  }

  @keyframes blob-float-3 {
    0%,
    100% {
      transform: translate(0, 0) scale(1);
    }
    20% {
      transform: translate(50px, -20px) scale(1.05);
    }
    40% {
      transform: translate(30px, 30px) scale(0.95);
    }
    60% {
      transform: translate(-20px, 20px) scale(1.08);
    }
    80% {
      transform: translate(-40px, -10px) scale(0.98);
    }
  }

  @keyframes blob-float-4 {
    0%,
    100% {
      transform: translate(0, 0) scale(1) rotate(0deg);
    }
    50% {
      transform: translate(-30px, 30px) scale(1.15) rotate(180deg);
    }
  }

  .animate-blob-1 {
    animation: blob-float-1 20s ease-in-out infinite;
  }

  .animate-blob-2 {
    animation: blob-float-2 25s ease-in-out infinite;
  }

  .animate-blob-3 {
    animation: blob-float-3 22s ease-in-out infinite;
  }

  .animate-blob-4 {
    animation: blob-float-4 18s ease-in-out infinite;
  }

  /* Reduce motion for accessibility */
  @media (prefers-reduced-motion: reduce) {
    .animate-blob-1,
    .animate-blob-2,
    .animate-blob-3,
    .animate-blob-4 {
      animation: none;
    }

    .panel-card {
      animation: none !important;
      opacity: 1;
    }
  }
</style>
