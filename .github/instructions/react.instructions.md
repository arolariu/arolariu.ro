---
name: React Semantics
description: React component, hook, accessibility, and state-lifetime rules.
applyTo: "**/*.tsx,**/*.jsx,sites/arolariu.ro/**/hooks/**/*.ts,sites/arolariu.ro/**/_hooks/**/*.ts,sites/arolariu.ro/**/use*.ts,sites/arolariu.ro/**/hooks/**/*.js,sites/arolariu.ro/**/_hooks/**/*.js,sites/arolariu.ro/**/use*.js,packages/components/**/hooks/**/*.ts,packages/components/**/use*.ts,packages/components/**/hooks/**/*.js,packages/components/**/use*.js"
---

# React Semantics

## Scope

Owns React behavior independent of routing or product architecture.

## Required Inputs

- The component and its parent/consumers
- A nearby component using the same repository pattern
- Existing tests and accessibility semantics

## Rules

- Keep render logic pure.
- Use `Readonly<Props>` for component props.
- Keep state at the narrowest owner.
- Use effects to synchronize with an external system or for the narrow
  latest-value ref pattern that keeps an explicitly stable callback current.
  Derive ordinary render state instead.
- Include complete dependencies and return cleanup for subscriptions,
  observers, timers, and abortable work.
- Do not copy props into state without a demonstrated synchronization need.
- Prefer semantic HTML and native interaction before ARIA.
- Give icon-only controls an accessible name.
- Preserve keyboard behavior, focus order, loading, error, and empty states.
- Avoid unnecessary memoization; add it only for measured or structural need.
- Do not define components inside another component's render body.

## Reference Catalog

Open `references/react.md` only when the task needs one of:

- an effect dependency, cleanup, cancellation, or stale-closure decision;
- a memoization or component-identity decision beyond the default rule above;
- accessibility work on an interactive, focus, or keyboard-sensitive element;
- a state-lifetime or Context-splitting decision for shared component/hook
  state.

The catalog does not redefine these rules or the verification/escalation
sections below; it only adds repository-specific examples and anti-patterns.

## Validation

Use colocated Testing Library/Vitest coverage for changed behavior. Test user
outcomes rather than implementation details.

## Escalation

Ask when a change alters UX behavior, creates a new global state boundary, or
requires a dependency.
