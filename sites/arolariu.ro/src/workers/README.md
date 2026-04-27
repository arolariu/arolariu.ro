# `@/workers` — Web Worker foundation

This module is the shared substrate for off-main-thread work in `sites/arolariu.ro`.
All workers in this codebase use the `createWorkerHost` factory from `@/workers`.

> **Background:** Architectural decisions and rationale are in
> `docs/superpowers/specs/2026-04-27-web-workers-foundation-design.md`. Read it
> before adding non-trivial workers.

## Quick start

A new feature called `feature-X` that needs a Web Worker:

```
src/app/domains/<feature-area>/_workers/
├── feature-x.api.ts            ← shared TypeScript types (no runtime code)
├── feature-x.implementation.ts ← the testable logic
├── feature-x.worker.ts         ← 2-line entry; not unit-tested
└── useFeatureXWorker.ts        ← optional thin React hook
```

```typescript
// feature-x.api.ts
export type FeatureXApi = {
  doThing: (input: string) => Promise<number>;
};

// feature-x.implementation.ts
export function createFeatureXImplementation(): FeatureXApi {
  return {
    doThing: async (input) => input.length,
  };
}

// feature-x.worker.ts
import {expose} from "@/workers/runtime";
import {createFeatureXImplementation} from "./feature-x.implementation";
expose(createFeatureXImplementation());
```

```typescript
// inside the feature
import {createWorkerHost} from "@/workers";
import type {FeatureXApi} from "./feature-x.api";

const host = createWorkerHost<FeatureXApi>({
  name: "feature-x",
  load: () => new Worker(new URL("./feature-x.worker.ts", import.meta.url), {type: "module"}),
});

const result = await host.api.doThing("hello");
```

## Rules

1. **`createWorkerHost` is the only sanctioned path to spin up a worker.**
   Do not write `new Worker(...)` outside `src/workers/host/createWorkerHost.ts`.

2. **Worker entry files end in `.worker.ts`.** It's a bundler signal and a
   grep-able convention.

3. **`new URL(literal, import.meta.url)` must use a literal, not a variable.**
   Turbopack's static analysis can't follow variables; the bundler emits a
   separate chunk per literal worker entry.

4. **Don't unit-test through the worker.** Test the api implementation
   (`*.implementation.ts`) directly. The `*.worker.ts` entry is treated like a
   Next.js page file: trivial entry, not unit-tested.

5. **`AbortSignal` is always the last argument** to a method that supports
   cancellation. The host detects it and rejects the consumer's promise — both
   when the signal is already aborted at call time AND when it aborts mid-flight.
   The signal is **not forwarded to the worker**; in-worker handlers run to
   completion. This is a documented limitation; see "Known limitations" below.

## Lifecycle

```
idle → starting → ready ⇄ (lazy reboot, invisible)
                  ↓
                 dead → (call restart()) → ready
                  ↓
                disposed (terminal)
```

After `state === "dead"`, you must call `host.restart()` to recover.
Disposed hosts are unrecoverable; construct a new host.

Default idle timeout: 5 minutes. Override with `idleTimeoutMs`.

## Errors

- `WorkerError` — your handler threw. Has `.cause` and `.method`.
- `WorkerCrashError` — worker terminated unexpectedly.
- `WorkerTimeoutError` — per-call timeout fired (opt-in).
- `WorkerDeadError` — call attempted on dead/disposed host.
- `WorkerNotAvailableError` — SSR or `globalThis.Worker` missing.

## Capabilities

`host.capabilities` is a snapshot taken at first boot:

```typescript
{
  crossOriginIsolated: boolean; // SAB available?
  hardwareConcurrency?: number; // CPU cores
  deviceMemory?: number;         // GB, Chromium-only
  hasWebGpu: boolean;            // navigator.gpu present?
}
```

Workers receive the same shape via the bootstrap message.

## Playground

A live developer playground is available **in development only**:

```
http://localhost:3000/playground/workers/
```

It exercises every state transition and is the canonical worked example.
It returns 404 in production builds.

## Known limitations

- **Worker-side `AbortSignal` propagation is parent-side-only in v1.** The
  parent rejects the consumer's promise when the signal aborts (synchronously
  if pre-aborted, asynchronously if mid-flight). The worker handler never
  receives the signal, so it runs to completion. To stop in-worker work, the
  worker must use its own internal cancellation mechanism (e.g., a worker-scope
  flag updated via a separate RPC).

- **No worker-side OpenTelemetry SDK.** Workers emit structured events via
  `emitEvent`; the parent forwards them to the existing logger. Full W3C trace
  propagation is on the roadmap.
