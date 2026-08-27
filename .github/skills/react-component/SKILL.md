---
name: react-component
description: Create or modify a React component using current repository patterns. Use for server/client component boundaries, accessibility, CSS Modules, Readonly props, and colocated Vitest tests; inspect a sibling component before editing.
---

# React Component

## When to Use

- Create or change a route-local, website-shared, or explicitly requested
  component-library React component.
- Split or narrow a Server/Client Component boundary.
- Add component-owned interaction, state, accessibility, or styling behavior.
- Add focused Testing Library/Vitest coverage for a component contract.

## When Not to Use

- Use `nextjs-page` when metadata, route data, route boundaries, or page-level
  ownership changes.
- Use `zustand-store` for an approved global state change.
- Do not extract a component solely to reduce line count when no ownership or
  reuse boundary improves.
- Do not move product behavior into `@arolariu/components`; the library is
  domain-agnostic and is out of scope unless explicitly requested.

## Required Inputs

- Owning project, current consumer(s), and expected user-observable behavior.
- Reuse scope: route-local, website-shared, or component library.
- Server/client responsibilities, props/events, state lifetime, and external
  systems synchronized by effects.
- Keyboard, focus, pointer, disabled/loading, error/empty, responsive, theme,
  and reduced-motion expectations.
- Nearest guide; matching TypeScript/React/frontend/components instructions;
  relevant RFC sections; a same-scope sibling with its style, tests, and story
  when applicable.

## Decision Points

Before editing, decide:

1. The narrowest reuse owner and whether a current primitive/component already
   satisfies the need.
2. Whether the component can remain server-compatible or needs a client
   directive at the smallest interactive boundary.
3. Whether state is derived during render, updated by an event, local, scoped
   Context, or approved global state.
4. Whether an effect synchronizes a real external system and what cleanup or
   cancellation it requires.
5. Which native semantics or existing Base UI primitive own interaction and
   focus behavior.
6. Which behavior categories need a failing test and whether browser-level
   focus/layout behavior needs a story or E2E check.

## Core Procedure

1. Read the consumer, all direct public consumers when changing a contract, and
   a current sibling with the same reuse and interaction category.
2. Search existing route-local, website-shared, and component-library exports
   before creating a new abstraction.
3. Write the smallest failing user-behavior test. Query by role/name and use
   `userEvent`; mock only true external boundaries.
4. Place the component at the narrowest owner. Keep it server-compatible unless
   hooks, handlers, browser APIs, client context, or client state require
   `"use client"`.
5. Define precise readonly props and explicit exported function return types.
   Reuse domain types and guards; do not introduce `any` or broad assertions.
6. Keep render pure. Derive values during render and handle user actions in
   callbacks. Use effects for external synchronization or the narrow
   latest-value ref pattern needed by an explicitly stable callback; include
   complete dependencies and cleanup whenever the synchronized resource needs
   it.
7. Compose native HTML or the existing `@arolariu/components` primitive. Add
   accessible names, keyboard/pointer parity, focus behavior, and observable
   disabled/loading/error/empty states.
8. Add or change the owning project's colocated CSS Module. Preserve
   responsive, theme, focus-visible, and reduced-motion behavior; do not add
   inline style objects.
9. Implement until the behavior test passes. For explicitly requested public
   library work, also preserve Base UI composition/ref behavior, update the
   barrel, and add/update the colocated story.
10. Run the targeted test and the smallest owning-project build/check that
    proves the import and styling boundary.

## Resource Triggers

| Named trigger | Resource |
| --- | --- |
| Before choosing reuse scope, Server/Client, state lifetime, effect ownership, or Base UI composition | [Reuse and boundary decisions](references/reuse-and-boundary-decisions.md) |
| Native interactive control, icon-only name, disabled state, or loading announcement | [Native control accessibility](references/native-control-accessibility.md) |
| Dialog, popover, tooltip, focus entry/return, or focus recovery | [Overlay and focus accessibility](references/overlay-focus-accessibility.md) |
| Composite keyboard widget, live region/error, or dynamic list/item semantics | [Dynamic widget accessibility](references/dynamic-widget-accessibility.md) |
| Reduced-motion, animation meaning, theme, contrast, or forced-colors behavior | [Motion and theme accessibility](references/motion-theme-accessibility.md) |
| Need a current same-category sibling | [Live components](examples/live-components.md) |
| A live sibling confirms the readonly-props, client-boundary, CSS Module, ref, or user-test shape | [Stable component tests and shapes](templates/stable-component-tests.md) |
| Before selecting component behavior tests | [Component test matrix](checklists/component-test-matrix.md) |
| Only after an invalid-hook, hydration, effect-loop, stale-closure, focus, CSS Module, cleanup, or export failure | [Component troubleshooting](references/troubleshooting.md) |

## Verification

- Reuse scope and client boundary are no broader than required.
- Props and public returns are precise/readonly; render is pure; effects have a
  demonstrated external owner or latest-ref stabilization need, complete
  dependencies, and cleanup when they own a disposable resource.
- Native/Base UI semantics, keyboard and pointer paths, focus, accessible names,
  and all changed UI states are preserved.
- Styling follows the owner, including theme, responsive, focus-visible, and
  reduced-motion behavior.
- Colocated behavior tests pass. Explicit public library work also has its
  required story/export and library validation.

## Stop and Ask

- New dependency
- Public shared-component API change
- Incidental move into `@arolariu/components`
- Material UX behavior decision
- New Context/global state boundary, authentication/security behavior, or a
  component contract with materially different valid semantics

## Completion Contract

Report the component behavior, reuse and Server/Client boundary, state/effect
ownership, accessibility behavior covered, exact tests/validation run, and only
material residual risk or incomplete validation.
