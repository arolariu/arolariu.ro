---
name: CV Svelte
description: Svelte and SvelteKit rules for the standalone CV site.
applyTo: "sites/cv.arolariu.ro/**/*.svelte,sites/cv.arolariu.ro/**/*.ts"
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

## Validation

Run the CV build and the smallest relevant test.

## Escalation

Ask before dependencies, deployment behavior, cross-package coupling, or a
significant UX change.
