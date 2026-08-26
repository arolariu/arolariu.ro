---
name: React Semantics
description: React component, hook, accessibility, and state-lifetime rules.
applyTo: "**/*.tsx,**/*.jsx"
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
- Use effects only to synchronize with an external system.
- Include complete dependencies and return cleanup for subscriptions,
  observers, timers, and abortable work.
- Do not copy props into state without a demonstrated synchronization need.
- Prefer semantic HTML and native interaction before ARIA.
- Give icon-only controls an accessible name.
- Preserve keyboard behavior, focus order, loading, error, and empty states.
- Avoid unnecessary memoization; add it only for measured or structural need.
- Do not define components inside another component's render body.

## Validation

Use colocated Testing Library/Vitest coverage for changed behavior. Test user
outcomes rather than implementation details.

## Escalation

Ask when a change alters UX behavior, creates a new global state boundary, or
requires a dependency.
