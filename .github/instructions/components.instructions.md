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
- A sibling Base UI component, its test/story, and its CSS Module when it owns visual styling
- `packages/components/src/index.ts`

## Rules

- Keep public components domain-agnostic.
- Do not import from `sites/**`.
- Prefer Base UI `render` composition.
- Expose canonical `render` composition only; do not reintroduce removed deprecated props, aliases or legacy adapters.
- Use the package's React 19 ref-as-prop contract with precise DOM types and callback cleanup.
- Compose classes with the existing `cn()` helper.
- Style-owning components use a colocated CSS Module; intentional style-free composition primitives may omit one. Do not use inline style
  objects.
- Preserve keyboard, focus, disabled, and ARIA behavior.
- Follow `packages/components/ACCESSIBILITY.md` for applicable WCAG 2.2 A/AA criteria and component/consumer verification boundaries.
- Colocate a focused test and Storybook story.
- Export every public component and public type from `src/index.ts`.

## Reference Catalog

Open `references/components.md` only when the task needs one of:

- designing or changing a public component's variant/ref/`render` API;
- composing a new Base UI wrapper or non-native interactive element;
- accessibility/focus work on an overlay, compound, or interactive component;
- a story/test/barrel-export decision for a new or changed public component.

The catalog does not redefine these rules or the verification/escalation sections below; it only adds repository-specific examples and
anti-patterns.

## Validation

Run the component-library build and the smallest relevant component test.

## Escalation

Ask before adding a dependency, changing a public component contract, or modifying the library when the user's task did not explicitly
include it.
