<script lang="ts">
  import {page} from "$app/state";
  import styles from "./ScrollProgress.module.scss";

  // Only show scroll progress on /human route (main CV view)
  let showProgress = $derived(page.url.pathname === "/human");
</script>

{#if showProgress}
  <div
    class={styles.container}
    role="progressbar"
    aria-label="Page scroll progress"
    aria-valuemin={0}
    aria-valuemax={100}>
    <div class={styles.bar}></div>
  </div>
{/if}
