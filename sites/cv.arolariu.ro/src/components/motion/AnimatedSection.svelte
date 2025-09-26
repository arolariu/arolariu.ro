<script lang="ts">
  import {Tween, prefersReducedMotion} from "svelte/motion";
  import {intersect} from "./intersection";
  import {onMount} from "svelte";

  type AnimationType = "fade-up" | "fade-down" | "fade-left" | "fade-right" | "fade-in" | "scale-up";

  type Props = {
    children?: any;
    class?: string;
    // Delay before the animation starts. Accepts milliseconds.
    // Backwards-compat: if value <= 10, it's treated as seconds.
    delay?: number; // ms (or seconds when <= 10)
    duration?: number; // seconds
    id?: string;
    animation?: AnimationType;
    threshold?: number;
  };

  let {children, class: className = "", delay = 0, duration = 0.7, id, animation = "fade-up", threshold = 0.1}: Props = $props();

  let hasAnimated = $state(false);
  let sectionEl: HTMLElement | null = null;

  const animationStyles: Record<AnimationType, {x?: number; y?: number; scale?: number; opacity: number}> = {
    "fade-up": {y: 8, opacity: 0},
    "fade-down": {y: -8, opacity: 0},
    "fade-left": {x: 8, opacity: 0},
    "fade-right": {x: -8, opacity: 0},
    "fade-in": {opacity: 0},
    "scale-up": {scale: 0.95, opacity: 0},
  };

  // initialize motion values from the selected animation preset
  const init = animationStyles[animation] ?? {x: 0, y: 0, scale: 1, opacity: 0};
  const x = new Tween(init.x ?? 0);
  const y = new Tween(init.y ?? 0);
  const scale = new Tween(init.scale ?? 1);
  const opacity = new Tween(init.opacity ?? 0);

  function runAnimation() {
    if (hasAnimated) return;
    hasAnimated = true;
    const reduce = prefersReducedMotion.current;
    const ms = reduce ? 0 : Math.max(0, duration) * 1000;
    // Support both ms and s: treat small values (<=10) as seconds, otherwise ms
    const dl = reduce
      ? 0
      : (() => {
          const val = Math.max(0, delay);
          return val <= 10 ? val * 1000 : val;
        })();
    x.set(0, {duration: ms, delay: dl});
    y.set(0, {duration: ms, delay: dl});
    scale.set(1, {duration: ms, delay: dl});
    opacity.set(1, {duration: ms, delay: dl});
  }

  // If the element is already in view on mount (landing mid-page), trigger immediately.
  onMount(() => {
    try {
      const el = sectionEl as HTMLElement | undefined;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const vw = window.innerWidth || document.documentElement.clientWidth;
      const inView = rect.bottom >= 0 && rect.right >= 0 && rect.top <= vh && rect.left <= vw;
      if (inView) {
        runAnimation();
      }
    } catch {}
  });

  // Safety fallback: if IO never fires (rare), reveal content after a short delay
  $effect(() => {
    const timer = setTimeout(() => {
      if (!hasAnimated) {
        const reduce = prefersReducedMotion.current;
        const ms = reduce ? 0 : Math.max(0, duration) * 1000;
        x.set(0, {duration: ms});
        y.set(0, {duration: ms});
        scale.set(1, {duration: ms});
        opacity.set(1, {duration: ms});
        hasAnimated = true;
      }
    }, 1200);
    return () => clearTimeout(timer);
  });
</script>

<section
  bind:this={sectionEl}
  use:intersect={{threshold, once: true, onEnter: runAnimation}}
  {id}
  class={className}
  style={`transform: translate(${x.current.toFixed(2)}px, ${y.current.toFixed(2)}px) scale(${scale.current.toFixed(3)}); opacity: ${opacity.current};`}
  aria-label={id ? `Section: ${id}` : "Content section"}>
  {@render children?.()}
</section>
