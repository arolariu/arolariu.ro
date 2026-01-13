<script lang="ts">
  import {page} from "$app/state";

  // Only show scroll progress on /human route (main CV view)
  let showProgress = $derived(page.url.pathname === "/human");
</script>

{#if showProgress}
  <div
    class="scroll-progress-container"
    role="progressbar"
    aria-label="Page scroll progress"
    aria-valuemin={0}
    aria-valuemax={100}>
    <div class="scroll-progress-bar"></div>
  </div>
{/if}

<style>
  .scroll-progress-container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    z-index: 9999;
    background: transparent;
    pointer-events: none;
  }

  .scroll-progress-bar {
    height: 100%;
    width: 100%;
    background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
    transform-origin: left;
    transform: scaleX(0);
    animation: scroll-progress linear;
    animation-timeline: scroll(root);
  }

  @keyframes scroll-progress {
    to {
      transform: scaleX(1);
    }
  }

  /* Fallback for browsers without scroll-timeline support */
  @supports not (animation-timeline: scroll()) {
    .scroll-progress-bar {
      display: none;
    }
  }

  /* Respect reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .scroll-progress-bar {
      animation: none;
      transform: scaleX(1);
      opacity: 0.3;
    }
  }
</style>
