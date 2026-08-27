---
name: CV Svelte
description: Svelte and SvelteKit rules for the standalone CV site.
applyTo: "sites/cv.arolariu.ro/**/*.svelte,sites/cv.arolariu.ro/**/*.ts,sites/cv.arolariu.ro/**/*.js,sites/cv.arolariu.ro/**/*.scss"
---

# CV Svelte

## Scope

Owns Svelte behavior unique to the standalone CV site.

## Required Inputs

- `sites/cv.arolariu.ro/AGENTS.md`
- The current route/component and neighboring styles

## Rules

- Preserve static-first prerendering.
- Do not import another monorepo package.
- Use current Svelte runes and SvelteKit conventions already present nearby.
- Keep state and effects local to the smallest component.
- Preserve semantic HTML, keyboard behavior, and accessible names.
- Keep portfolio interactions intentionally small.
- Use the site's existing styling approach.

## Reference Catalog

Open `references/svelte.md` only when the task needs one of:

- confirming the standalone boundary before reusing markup/logic that exists
  in `@arolariu/components` or another site/package;
- a runes decision beyond the rules above (shared state as a `*.svelte.ts`
  class versus component-local `$state`, or `$derived` versus
  `$derived.by`);
- a prerendering/page-option question for a new or changed route;
- an effect/lifecycle edge case (global listener singleton, an `$effect`
  that must reference a derived value to re-run);
- an accessibility decision for a custom widget, or a styling/token question
  beyond the rules above;
- a test-boundary question (Vitest/Testing Library unit versus Playwright
  behavior/a11y coverage) or a SvelteKit module-mock setup question.

The catalog does not redefine these rules or the verification/escalation
sections below; it only adds repository-specific examples and anti-patterns.

## Validation

Run the CV build and the smallest relevant test.

## Escalation

Ask before dependencies, deployment behavior, cross-package coupling, or a
significant UX change.
