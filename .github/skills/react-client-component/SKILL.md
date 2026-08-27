---
name: react-client-component
description: Create or modify an interactive React Client Component or island using repository accessibility, state-lifetime, CSS Module, i18n, and Vitest patterns.
---

# React Client Component

## When to Use

- Create or change a component that directly needs hooks, event handlers,
  browser APIs, client Context, Zustand selectors, or interactive state.
- Extract the smallest client island from an otherwise server-rendered route.
- Add component-owned accessibility, focus, pointer/keyboard, loading/error,
  responsive, theme, or motion behavior.
- Modify an explicitly requested client component in `packages/components`.

## When Not to Use

- Use `react-server-component` for pages, layouts, metadata, server data, route
  boundaries (including framework-required client `error.tsx` files), or a
  proven server-only component.
- Use `react-client-hook` for reusable client logic with no owned markup.
- Use `react-server-action` for `"use server"` exports.
- Use `react-client-store` for global state implementation.
- Use `react-internationalization` for dictionary/schema/generation work.
- Use `react-auth` for access-control behavior changes.

## Required Inputs

- Owning route/package, consumers, expected user behavior, and reuse scope.
- Why the file itself needs `"use client"` rather than only a smaller child.
- Props/events, local or scoped state, external systems synchronized by
  effects, and any existing actions/stores/hooks consumed.
- Keyboard, focus, pointer, loading, error, empty, responsive, theme, and
  reduced-motion expectations.
- Nearest guides and instructions plus a same-scope sibling and its tests.

## Decision Points

1. Is the component route-local, website-shared, or explicitly shared-library
   owned?
2. What exact client capability requires the boundary?
3. Does state belong in render derivation, an event, local state, Context, an
   existing store, or another artifact?
4. Should reusable logic move to `react-client-hook`?
5. Which native element or shared primitive owns interaction and focus?
6. Which behavior needs unit, story, or browser-level proof?

## Core Procedure

1. Read the consumer, all public consumers when changing a contract, and a
   same-category sibling with tests/styles.
2. Search route-local, website-shared, and component-library exports before
   creating another abstraction.
3. Write the smallest failing user-behavior test using roles/names and
   `userEvent`; mock only true external boundaries.
4. Keep `"use client"` on the smallest module that directly needs client
   capabilities. Do not spread the client graph upward for convenience.
5. Define precise readonly props and explicit returns. Pass server data in a
   React-serializable shape.
6. Keep render pure; derive values during render, update from events, and use
   effects only for external synchronization or the established latest-ref
   stabilization pattern.
7. Use native semantics or an existing `@arolariu/components` primitive.
   Preserve accessible names, keyboard/pointer parity, focus, and observable
   disabled/loading/error/empty states.
8. Apply the owning CSS Module convention and preserve responsive, theme,
   focus-visible, and reduced-motion behavior.
9. For `packages/components`, also preserve Base UI composition/ref behavior,
   update the barrel and story, and follow the local guide.
10. Run the targeted component test and smallest owning-project validation.

## Resource Triggers

| Trigger | Load |
| --- | --- |
| Before choosing reuse scope, client boundary, state lifetime, or shared-library ownership | [Reuse and boundary decisions](references/reuse-and-boundary-decisions.md) |
| Native control, icon-only name, disabled state, or loading announcement | [Native control accessibility](references/native-control-accessibility.md) |
| Dialog, popover, tooltip, or focus entry/return/recovery | [Overlay and focus accessibility](references/overlay-focus-accessibility.md) |
| Composite widget, live region/error, or dynamic list semantics | [Dynamic widget accessibility](references/dynamic-widget-accessibility.md) |
| Motion, theme, contrast, or forced-colors behavior | [Motion and theme accessibility](references/motion-theme-accessibility.md) |
| Need a current client component or package client primitive | [Live client components](examples/live-client-components.md) |
| A sibling confirms a matching client component/test shape | [Stable client component patterns](templates/stable-client-component-patterns.md) |
| Before selecting client-component tests | [Client component test matrix](checklists/client-component-test-matrix.md) |
| Concrete hydration, effect-loop, stale-closure, focus, CSS Module, cleanup, or export failure | [Troubleshooting](references/troubleshooting.md) |

## Verification

- The client boundary is no broader than the capability requires.
- Props/state/effects have one owner and no reusable hook/store/action logic is
  embedded in the component.
- Accessibility and all changed user states are covered.
- Styling follows the owning website or component-library convention.
- Targeted tests and smallest relevant build pass.

## Stop and Ask

- New dependency or global state owner.
- Authentication/security or material UX behavior change.
- Incidental shared-library move or public package API change.
- Unclear server/client import graph or non-serializable boundary.

## Completion Contract

Report the client capability, boundary size, reuse/state/effect ownership,
accessibility behavior, tests, and only material residual risk.
