---
name: Component Library
description: Domain-agnostic @arolariu/components architecture and styling constraints.
applyTo: "packages/components/**/*.ts,packages/components/**/*.tsx,packages/components/**/*.css"
---

# Component Library

## Scope

Owns constraints unique to `@arolariu/components`.

## Required Inputs

- `packages/components/AGENTS.md`
- RFC 1006 and RFC 1008 for architecture changes
- A sibling Base UI component, CSS Module, test, and story
- `packages/components/src/index.ts`

## Rules

- Keep public components domain-agnostic.
- Do not import from `sites/**`.
- Prefer Base UI `render` composition.
- Keep `asChild` only for backward-compatible existing APIs.
- Use `React.forwardRef` when a public component exposes a DOM ref.
- Compose classes with the existing `cn()` helper.
- Style with a colocated CSS Module; no inline style objects.
- Preserve keyboard, focus, disabled, and ARIA behavior.
- Colocate a focused test and Storybook story.
- Export every public component and public type from `src/index.ts`.

## Validation

Run the component-library build and the smallest relevant component test.

## Escalation

Ask before adding a dependency, changing a public component contract, or
modifying the library when the user's task did not explicitly include it.
