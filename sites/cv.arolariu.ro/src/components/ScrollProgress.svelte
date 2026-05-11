<script lang="ts">
  import {page} from "$app/state";
  import {onMount} from "svelte";
  import styles from "./ScrollProgress.module.scss";

  // Only show scroll progress on /human route (main CV view).
  const showProgress = $derived(page.url.pathname === "/human");

  let scrollPercent = $state<number>(0);

  function computeScrollPercent(): number {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (scrollHeight <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((scrollTop / scrollHeight) * 100)));
  }

  onMount(() => {
    const handler = (): void => {
      scrollPercent = computeScrollPercent();
    };
    handler(); // initial value
    window.addEventListener("scroll", handler, {passive: true});
    window.addEventListener("resize", handler, {passive: true});
    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  });
</script>

{#if showProgress}
  <div
    class={styles.container}
    role="progressbar"
    aria-label="Page scroll progress"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={scrollPercent}
    style="--scroll-progress: {scrollPercent / 100};">
    <div class={styles.bar}></div>
  </div>
{/if}
