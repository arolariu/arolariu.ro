# Motion and Theme Accessibility

Open only for reduced-motion, animation meaning, theme, contrast, or
forced-colors behavior.

- Preserve meaning when animation is disabled. Do not rely on motion alone to
  show selection, progress, or hierarchy.
- Website modules use the live reduced-motion mixin; inspect
  `sites/arolariu.ro/src/app/domains/invoices/_components/OnboardingOverlay.module.scss`
  and `sites/arolariu.ro/src/styles/abstracts/_mixins.scss`.
- Shared-library CSS can use the current media-query pattern, for example
  `packages/components/src/motion/Collapse.module.css`.
- JavaScript-driven `motion/react` animation needs its own reduced-motion
  branch (for example `useReducedMotion` or conditional animation props);
  SCSS/media-query handling does not disable JavaScript animation. Inspect
  `sites/arolariu.ro/src/app/about/_components/Hero.tsx`; its missing JS
  reduced-motion gate is live drift, not a pattern to copy.
- Verify focus indicators and contrast in both themes and
  high-contrast/forced-colors settings when the changed control is visually
  custom.
