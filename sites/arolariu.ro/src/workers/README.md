# `@/workers` — Web Worker foundation

This module is the shared substrate for off-main-thread work in `sites/arolariu.ro`.
All workers in this codebase use the `createWorkerHost` factory from `@/workers`.

> **Background:** Architectural decisions and rationale live in the team's
> design-spec workspace (gitignored locally). For an overview of the
> contract this module exposes, read the rest of this README — it covers
> the public API, lifecycle, errors, and known limitations.

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

1. **Construct workers only inside the `load` callback you pass to
   `createWorkerHost`.** No `new Worker(...)` outside `createWorkerHost`'s
   call sites — the foundation owns lifecycle, error handling, and
   teardown for every worker. Anywhere else, hold a `WorkerHost<T>` and
   use its proxy.

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
- `WorkerTimeoutError` — per-call timeout fired. Has `.method` and `.elapsedMs`.
- `WorkerDeadError` — call attempted on dead/disposed host.
- `WorkerNotAvailableError` — SSR or `globalThis.Worker` missing.

### Why we wrap handler errors in a `__workerError` envelope

The worker side of the foundation deliberately throws a plain
`{__workerError: true, name, message, stack}` object instead of re-throwing
the original `Error`. This is **not** an oversight — it is the only way we
can preserve the original error's identity across the structured-clone
boundary that Comlink uses internally:

- Comlink's default `throwTransferHandler`
  ([`comlink/src/comlink.ts`](https://github.com/GoogleChromeLabs/comlink))
  only round-trips `name`, `message`, and `stack`. Anything else on the
  thrown `Error` (custom subclass identity, `cause`, additional fields) is
  silently dropped.
- WHATWG HTML §2.7.3 (StructuredSerialize) further normalizes `Error.name`
  to one of the seven standard names (`Error`, `TypeError`, etc.) on the
  receiving side. A custom `MyDomainError` becomes a generic `Error`.

The host's proxy unwraps the envelope into a `WorkerError` whose `.cause`
holds the original payload. **Don't "simplify" this back to a real Error
throw** — you'll lose every field that isn't one of the three above.

## Per-call timeout

Every proxy method call runs against a `defaultCallTimeoutMs` budget
(default **30 seconds**). When the budget fires, the consumer's promise
rejects with `WorkerTimeoutError(method, elapsedMs)`. Configure per-host:

```typescript
createWorkerHost({
  name: "feature-x",
  load: () => new Worker(/* ... */),
  defaultCallTimeoutMs: 5_000, // 5s
});
```

Set to `0` or `Infinity` (or any non-finite value) to disable.

The timer starts **after** the boot handshake completes, so boot latency
is not charged to the consumer's budget. Boot has its own 10-second
budget that surfaces as `WorkerCrashError` when exceeded.

> **NOTE:** The timeout rejects the consumer's promise but does **not**
> cancel the worker-side handler — Comlink has no cancellation protocol.
> A hung handler keeps occupying the worker until the next `restart()`.

## Capabilities

`host.capabilities` is a snapshot taken at host construction:

```typescript
{
  crossOriginIsolated: boolean; // SAB available?
  hardwareConcurrency?: number; // CPU cores
  deviceMemory?: number;         // GB, Chromium-only
  hasWebGpu: boolean;            // navigator.gpu present?
}
```

Workers receive the same shape via the bootstrap message and can read it
via `getBootstrapCapabilities()` from `@/workers/runtime`.

## Lifecycle hooks

`host.subscribe(listener)` returns an `unsubscribe` function.

> **MUST contract:** Consumers MUST call `unsubscribe` before the
> subscribing scope unmounts. Subscriber callbacks hold strong references
> to their captured closures; failing to unsubscribe leaks the closure
> and any DOM nodes it captured.

In React, the canonical pattern is:

```tsx
useEffect(() => {
  const unsubscribe = host.subscribe(setState);
  return unsubscribe;
}, [host]);
```

## Playground

A live developer playground is available **in development only**:

```
http://localhost:3000/playground/workers/
```

It exercises every state transition and is the canonical worked example.
It returns **404 in production** (the route is gated). The playground
worker chunk itself is still emitted by the bundler, but it's tiny and
only reachable via the gated route.

## Known limitations

- **Per-call timeout cancels the consumer, not the worker.**
  `WorkerTimeoutError` rejects the proxy promise; the worker-side handler
  continues to run because Comlink has no cancellation protocol. Use
  `host.restart()` to reclaim a hung worker.

- **Worker-side `AbortSignal` propagation is parent-side-only in v1.** The
  parent rejects the consumer's promise when the signal aborts (synchronously
  if pre-aborted, asynchronously if mid-flight). The worker handler never
  receives the signal, so it runs to completion. To stop in-worker work, the
  worker must use its own internal cancellation mechanism (e.g., a worker-scope
  flag updated via a separate RPC).

- **No worker-side OpenTelemetry SDK.** Workers emit structured events via
  `emitEvent`; the parent forwards them to the existing logger. Full W3C trace
  propagation is on the roadmap.

- **`Error.cause` does not survive the worker boundary.** The `__workerError`
  envelope round-trips `name`, `message`, and `stack` but does not include
  `cause` (Comlink's transfer handler can't traverse it reliably). If your
  handler needs to communicate structured failure context, return a
  `Result<T, E>`-style discriminated union from the API method instead of
  throwing.

- **Comlink's `AsyncIterable` proxying is not officially documented.** Treat
  any cross-port iterable as accidental and prefer the dedicated `eventPort`
  for streaming worker → parent updates.

## Testing

Foundation unit tests use an in-memory `MockWorker` that runs the worker
runtime synchronously inside the test process. **MockWorker has known
fidelity gaps** vs. a real `Worker`:

- **Realm isolation:** closures share the host realm; non-cloneable values
  pass through silently rather than throwing the way structured-clone would.
- **`messageerror` event:** never fired by MockWorker; tests must dispatch
  manually if needed.
- **Boot latency:** synchronous; real workers have ~1–10ms startup.
- **Parallel `terminate()`:** synchronous; real `terminate()` is an async
  task per WHATWG HTML §10.2.4.
- **Off-thread execution:** runs on the main thread, so racy worker code
  may pass MockWorker tests and fail in production.

End-to-end coverage of these gaps lives in the Playwright suite at
`src/app/playground/workers/worker-playground.spec.ts`.
