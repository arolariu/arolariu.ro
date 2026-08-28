# TypeScript, React, Svelte, and Node Review

Use after the changed boundary is known to execute as TypeScript, React,
Svelte, browser-worker, or Node code. Read the nearest project guide and
matching instructions; this resource adds review-specific failure modes rather
than implementation procedure.

## Trust and contract boundaries

- Unknown HTTP/provider/storage data must pass through the real runtime parser
  before domain state. A cast or partial object fallback can turn contract
  drift into later UI corruption.
- Browser-callable Server Actions require input validation, established
  authentication/authorization, shared transport/error mapping, and a stable
  discriminated result.
- Public package barrels, default exports required by frameworks/workers, and
  literal/discriminated TypeScript shapes are runtime or consumer contracts,
  not import-style preferences.
- A client graph must not receive `server-only` imports, secrets, provider
  clients, request objects, or non-serializable RSC props.

## React client and server failures

Review directives plus the transitive import graph, not filenames:

- a Server Component moved client-side can expose server dependencies or
  broaden shipped code;
- a directive-free component imported by a client must remain client-safe;
- effect cleanup must release the owned generation and prevent stale or
  post-unmount commits;
- Strict Mode replay must not duplicate listeners, timers, workers, requests,
  or user-visible errors;
- hydration must distinguish server output, first client render, and settled
  persisted/browser state;
- a stable callback/latest-ref pattern must preserve both callback identity and
  current payload;
- accessibility is a correctness finding only when role/name, keyboard,
  focus, disabled behavior, or announcements materially regress.

State changes need the right lifetime. Flag a new global/persisted owner that
changes behavior or leaks stale data, not merely a different hook arrangement.

## Svelte and standalone sites

- Browser-only work at module evaluation can break SSR or test collection.
- Rune dependencies, singleton lifetime, and global listener ownership must
  survive mount/unmount and prerender behavior.
- A standalone Svelte site must not gain an unsupported website/package
  dependency.
- Timer/RAF/observer cleanup and reduced-motion behavior need deterministic
  evidence when changed.

## Workers and Node tooling

- Inputs/results crossing worker boundaries must remain structured-cloneable.
- Preserve worker entry export shape, module URL, working directory, config
  resolution, fail-fast order, cancellation, and cleanup.
- Command/path construction must not permit injection or escape an intended
  repository boundary.
- Flag unbounded loops, queues, output accumulation, repeated process/network
  work, or resource leaks on reachable hot paths.

## Test evidence

Tests must execute the repository owner of the behavior. Module aliases,
repository fakes, or mocks that replace the parser/store/action/component being
reviewed cannot prove it. Check changed branches, negative outcomes, cleanup,
and transport/public shape - not private implementation details.

Live authorities include the TypeScript, React, frontend, component, Svelte,
and local project instructions plus the matching `code-*` and React skills.
