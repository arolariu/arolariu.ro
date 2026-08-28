---
name: React Semantics
description: Common React semantics plus routing to client, server, hook, action, store, i18n, auth, and compiler workflows.
applyTo: "**/*.tsx,**/*.jsx,sites/arolariu.ro/**/hooks/**/*.ts,sites/arolariu.ro/**/_hooks/**/*.ts,sites/arolariu.ro/**/use*.ts,sites/arolariu.ro/**/hooks/**/*.js,sites/arolariu.ro/**/_hooks/**/*.js,sites/arolariu.ro/**/use*.js,packages/components/**/hooks/**/*.ts,packages/components/**/use*.ts,packages/components/**/hooks/**/*.js,packages/components/**/use*.js"
---

# React Semantics

## Scope

Owns React behavior shared across artifact types and routes each task to one
artifact workflow. Client/server identity still comes from directives and the
import graph, not the filename alone.

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

## Artifact Routing

| Artifact or decision | Workflow |
| --- | --- |
| App Router page/layout/framework route artifact or proven server component | `react-server-component` |
| Extracted interactive component or island that directly needs client capabilities | `react-client-component` |
| Custom Hook | `react-client-hook` |
| Export from a `"use server"` module | `react-server-action` |
| Approved Zustand/global client state | `react-client-store` |
| Locale dictionaries, typed selectors, ICU schema, metadata/email messages, or generated declarations | `react-internationalization` |
| Clerk matcher, server redirect, guest/public/shared/owner policy, or authorization behavior | `react-auth` |
| React Compiler audit/adoption/remediation | `react-compiler` |

For a defect, test-only request, refactor, or dependency migration, route first
to the corresponding cross-cutting skill and use the React artifact workflow
for the affected implementation boundary.

## Reference Catalogs

Open `references/react.md` only when the task needs one of:

- initially distinguishing client, server, Hook, Server Action, store, i18n,
  auth, or compiler ownership;
- a memoization or component-identity decision beyond the default rule above;
- accessibility work on an interactive, focus, or keyboard-sensitive element;
- a framework-independent render-purity or derived-state decision.

Open `references/react-client.md` only after directives and the import graph
prove client execution, and only when the task needs one of:

- a Strict Mode replay, owned cleanup/supersession abort, stale async commit,
  or browser-response validation edge case;
- a Context provider, latest-value ref, stable callback, or provider-value
  identity decision that crosses component and Hook boundaries;
- a first-client-render mismatch caused by browser-only, persisted, locale,
  or theme state after a server handoff.

Open `references/react-server.md` only after tracing consumers and imports,
and only when the task needs one of:

- distinguishing exclusively server-only execution from server-compatible or
  directive-free code that is currently client-bundled;
- deciding whether server-owned work belongs in a private `server-only`
  helper or requires a browser-callable Server Action adapter;
- reasoning about the smallest React-serializable RSC-to-client handoff or a
  live server-boundary debt example.

Do not open either semantic catalog merely because of a filename, directory,
the absence of `"use client"`, or the presence of `page.tsx`. These catalogs
do not replace the artifact skills or redefine these rules.

## Validation

Use colocated Testing Library/Vitest coverage for changed behavior. Test user
outcomes rather than implementation details.

## Escalation

Ask when a change alters UX/auth behavior, creates a new global state boundary,
changes React Compiler/configuration, or requires a dependency.
