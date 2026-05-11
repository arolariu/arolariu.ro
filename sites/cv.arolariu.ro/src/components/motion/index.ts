/**
 * @fileoverview Barrel re-export for the `motion` component family.
 *
 * Currently a single export: `AnimatedSection`, a viewport-triggered
 * scroll-in wrapper used across the `/human`, `/json`, and `/pdf` views.
 * Built on Svelte's `Tween` + a custom `intersect` action.
 */

export {default as AnimatedSection} from "./AnimatedSection.svelte";
