---
name: react-component
description: Create or modify a React component using current repository patterns. Use for server/client component boundaries, accessibility, CSS Modules, Readonly props, and colocated Vitest tests; inspect a sibling component before editing.
---

# React Component

## Use When

- Creating a website or shared React component
- Splitting a client boundary
- Adding component interaction or accessibility behavior

## Inputs

- Owning project and consumer
- Server or client responsibilities
- Props and interaction behavior
- Reuse scope: route-local, website-shared, or component library

## Procedure

1. Read the nearest local guide, matching TypeScript/React instructions, the
   consumer, and a sibling component with the same reuse scope.
2. Keep the component server-side unless hooks, browser APIs, state, or event
   handlers require a client boundary.
3. Define precise readonly props and an explicit return type.
4. Use semantic HTML and preserve keyboard, focus, loading, error, and empty
   states.
5. Use the owning project's existing CSS Module pattern.
6. Write a colocated failing behavior test.
7. Implement the smallest component and run the targeted test/build.
8. For shared components, add a Storybook story and barrel export.

## Completion

State the component boundary, behavior, reuse scope, and validation evidence.

## Stop and Ask

- New dependency
- Public shared-component API change
- Incidental move into `@arolariu/components`
- Material UX behavior decision
