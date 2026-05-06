"use client";

/**
 * @fileoverview Client interactive UI for the worker playground.
 * @module app/playground/workers/island
 *
 * @remarks
 * This page is **dev-only** (`/playground/workers/`) and is gated to
 * 404 in production by the parent route. Because of that, all UI strings
 * here are hardcoded English — they are never seen by end users, and
 * routing them through `next-intl` would only add noise to the message
 * catalogs without any user-facing benefit.
 *
 * Structure:
 * - `@arolariu/components` primitives (Card, Button, Badge, Alert) for
 *   visual consistency with the rest of the site.
 * - Discriminated `CallState` machine (idle/pending/success/error) so
 *   each branch is rendered explicitly.
 * - `aria-live="polite"` status region announces call outcomes; `aria-busy`
 *   flips on action buttons during pending.
 * - Stress-test buttons drive scenarios that MockWorker cannot fake
 *   (real boot latency, realm isolation, per-call timeout) — see the
 *   Playwright suite for the assertions.
 */

import {Alert, AlertDescription, AlertTitle, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components";
import {WorkerCrashError, WorkerDeadError, WorkerError, WorkerTimeoutError, createWorkerHost, type WorkerCapabilities, type WorkerEvent, type WorkerHost, type WorkerHostState} from "@/workers";
import {useEffect, useRef, useState} from "react";

import type {PlaygroundWorkerApi} from "./playground.worker";

type Log = Readonly<{ts: number; level: string; line: string}>;

/** Discriminated state machine for the most recent worker call. */
type CallState =
  | Readonly<{status: "idle"}>
  | Readonly<{status: "pending"; method: string}>
  | Readonly<{status: "success"; method: string; result: unknown}>
  | Readonly<{status: "error"; method: string; error: Error}>;

/**
 * Map a thrown value to a stable, screen-reader-friendly error category
 * label. Defensive against non-Error throws (rare but possible from
 * worker handlers that throw raw objects).
 */
function classifyError(err: unknown): string {
  if (err instanceof WorkerTimeoutError) return "timeout";
  if (err instanceof WorkerCrashError) return "crash";
  if (err instanceof WorkerDeadError) return "dead";
  if (err instanceof WorkerError) return "handler";
  if (err instanceof Error && err.message.includes("aborted")) return "aborted";
  return "unknown";
}

/**
 * Coerce a thrown value into an Error instance so downstream UI can rely
 * on `.name`/`.message` without further narrowing.
 */
function asError(err: unknown): Error {
  if (err instanceof Error) return err;
  return new Error(String(err));
}

/** Maximum number of retained event-log lines (older entries are dropped). */
const MAX_LOG_ENTRIES = 200;

export function WorkerPlaygroundIsland(): React.JSX.Element {
  const [state, setState] = useState<WorkerHostState>("idle");
  const [logs, setLogs] = useState<ReadonlyArray<Log>>([]);
  const [callState, setCallState] = useState<CallState>({status: "idle"});
  const [caps, setCaps] = useState<WorkerCapabilities | null>(null);
  const [windowProbe, setWindowProbe] = useState<string | null>(null);
  const echoInputRef = useRef<HTMLInputElement>(null);
  const sleepAcRef = useRef<AbortController | null>(null);

  /**
   * Host instance is held in `useState` (not `useMemo`) so React 19 / Next 16
   * Strict Mode's mount → unmount → remount cycle in development doesn't
   * trap us with a permanently-disposed singleton.
   *
   * Why this pattern: `useMemo([], () => create())` returns the SAME instance
   * across the strict-mode remount, but the first effect cleanup calls
   * `host.dispose()` — which is terminal (`restart()` rejects on disposed
   * hosts). The second mount would inherit the dead host and every
   * `host.api.*` call would reject with `WorkerDeadError`. Using `useState`
   * with a lazy initializer + a "is-disposed → re-create" branch in the
   * effect lets each strict-mode cycle have its own fresh host.
   *
   * In production (no Strict Mode double-mount) this collapses to the
   * normal create-once-dispose-on-unmount lifecycle.
   */
  const buildHost = (): WorkerHost<PlaygroundWorkerApi> =>
    createWorkerHost<PlaygroundWorkerApi>({
      name: "playground",
      load: () => new Worker(new URL("./playground.worker.ts", import.meta.url), {type: "module"}),
      idleTimeoutMs: 60_000,
      onEvent: (e: WorkerEvent) => {
        setLogs((prev) => {
          const next = [...prev, {ts: Date.now(), level: e.kind, line: JSON.stringify(e)}];
          // Cap the log so a stress test can't blow up the DOM.
          return next.length > MAX_LOG_ENTRIES ? next.slice(-MAX_LOG_ENTRIES) : next;
        });
      },
    });

  const [host, setHost] = useState<WorkerHost<PlaygroundWorkerApi>>(buildHost);

  useEffect(() => {
    if (host.state === "disposed") {
      // Strict-mode remount inherited a host disposed by the previous
      // cycle's cleanup. Replace it with a fresh instance and let the
      // re-render trigger this effect again with the new host.
      setHost(buildHost());
      return;
    }
    const unsub = host.subscribe(setState);
    setState(host.state);
    return () => {
      unsub();
      void host.dispose();
    };
    // buildHost is stable closure; intentional [host] only so the effect
    // re-runs when the strict-mode remount swaps in a fresh host above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host]);

  /**
   * Higher-order helper that wires a worker call into the {@link CallState}
   * machine so the consumer receives loading/error/success branches without
   * boilerplate. Errors are classified for the aria-live region.
   */
  const runCall = async <T,>(method: string, fn: () => Promise<T>): Promise<void> => {
    setCallState({status: "pending", method});
    try {
      const result = await fn();
      setCallState({status: "success", method, result});
    } catch (err) {
      setCallState({status: "error", method, error: asError(err)});
    }
  };

  const onEcho = (): Promise<void> =>
    runCall("echo", async () => {
      const v = echoInputRef.current?.value ?? "";
      return host.api.echo(v);
    });

  const onPing = (): Promise<void> => runCall("ping", () => host.api.ping());

  const onSleep10s = async (): Promise<void> => {
    sleepAcRef.current = new AbortController();
    await runCall("sleep", () => host.api.sleep(10_000, sleepAcRef.current!.signal));
  };

  const onAbortSleep = (): void => {
    sleepAcRef.current?.abort(new Error("user aborted"));
  };

  const onCrash = (): Promise<void> => runCall("crash", () => host.api.crash());

  const onRestart = (): Promise<void> => runCall("restart", () => host.restart());

  const onCapabilities = (): Promise<void> =>
    runCall("reportCapabilities", async () => {
      const c = await host.api.reportCapabilities();
      setCaps(c);
      return c;
    });

  const onEmitEvents = (): Promise<void> => runCall("emitEvents", () => host.api.emitEvents(5));

  const onThrowHandlerError = (): Promise<void> =>
    runCall("throwError", () => host.api.throwError("playground-demo"));

  // Stress: dedicated host with a tiny per-call timeout that is guaranteed
  // to fire against a 5s worker sleep.
  const onTriggerTimeout = async (): Promise<void> => {
    setCallState({status: "pending", method: "timeoutSlow"});
    const transient = createWorkerHost<PlaygroundWorkerApi>({
      name: "playground-timeout",
      load: () => new Worker(new URL("./playground.worker.ts", import.meta.url), {type: "module"}),
      defaultCallTimeoutMs: 100,
    });
    try {
      await transient.api.sleep(5_000);
      setCallState({status: "success", method: "timeoutSlow", result: "no timeout (unexpected)"});
    } catch (err) {
      setCallState({status: "error", method: "timeoutSlow", error: asError(err)});
    } finally {
      void transient.dispose();
    }
  };

  // Stress: ask the worker realm for `typeof window`. Real Workers report
  // "undefined"; MockWorker reports "object" because it shares the host realm.
  const onProbeWindow = (): Promise<void> =>
    runCall("whatIsWindow", async () => {
      const result = await host.api.whatIsWindow();
      setWindowProbe(result);
      return result;
    });

  const onClearLog = (): void => setLogs([]);

  const isPending = callState.status === "pending";
  const errorCategory = callState.status === "error" ? classifyError(callState.error) : null;
  const stateLabel = callState.status;
  const stateBadgeVariant: "default" | "secondary" | "destructive" =
    state === "ready" ? "default" : state === "dead" || state === "disposed" ? "destructive" : "secondary";

  return (
    <div data-testid="playground-root" className="container mx-auto max-w-5xl space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle data-testid="page-title">Web Workers Playground</CardTitle>
          <CardDescription>
            Interactively boot, call, abort, crash, and restart a Web Worker. Available in development only.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card data-testid="state-section">
        <CardHeader>
          <CardTitle>Host state</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">state:</span>
          <Badge data-testid="host-state" variant={stateBadgeVariant}>
            {state}
          </Badge>
          <span className="text-sm text-muted-foreground">crossOriginIsolated:</span>
          <Badge data-testid="coi" variant="outline">
            {String(host.capabilities.crossOriginIsolated)}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Last call status</CardTitle>
        </CardHeader>
        <CardContent>
          <div role="status" aria-live="polite" aria-atomic="true" data-testid="call-status">
            {callState.status === "idle" && (
              <p className="text-sm text-muted-foreground" data-testid="call-status-idle">
                No calls have been made yet.
              </p>
            )}
            {callState.status === "pending" && (
              <Alert>
                <AlertTitle>
                  <Badge variant="secondary">{stateLabel}</Badge>
                </AlertTitle>
                <AlertDescription data-testid="call-status-pending">
                  Calling worker… ({callState.method})
                </AlertDescription>
              </Alert>
            )}
            {callState.status === "success" && (
              <Alert>
                <AlertTitle>
                  <Badge>{stateLabel}</Badge>
                </AlertTitle>
                <AlertDescription data-testid="call-status-success">
                  <div>
                    <strong>{callState.method}:</strong>{" "}
                    <code data-testid="echo-result">{JSON.stringify(callState.result)}</code>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            {callState.status === "error" && (
              <Alert variant="destructive">
                <AlertTitle>
                  <Badge variant="destructive">{stateLabel}</Badge>
                  {errorCategory !== null && (
                    <Badge variant="outline" className="ml-2" data-testid="error-category">
                      {errorCategory}
                    </Badge>
                  )}
                </AlertTitle>
                <AlertDescription data-testid="call-status-error">
                  <div>
                    <strong>{callState.method}:</strong> <span data-testid="error-name">{callState.error.name}</span> —{" "}
                    <span data-testid="error-message">{callState.error.message}</span>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="calls-section">
        <CardHeader>
          <CardTitle>Calls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="echo-input" className="text-sm">
              Type something to echo
            </label>
            <input
              id="echo-input"
              ref={echoInputRef}
              data-testid="echo-input"
              type="text"
              className="flex-1 rounded-md border px-3 py-2 text-sm"
              placeholder="Type something to echo"
            />
            <Button data-testid="echo-button" onClick={onEcho} disabled={isPending} aria-busy={isPending}>
              Echo
            </Button>
            <Button data-testid="ping-button" variant="secondary" onClick={onPing} disabled={isPending} aria-busy={isPending}>
              Ping
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="cancellation-section">
        <CardHeader>
          <CardTitle>Cancellation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button data-testid="sleep-button" onClick={onSleep10s} disabled={isPending} aria-busy={isPending}>
            Sleep 10s
          </Button>
          <Button data-testid="abort-button" variant="outline" onClick={onAbortSleep}>
            Abort
          </Button>
        </CardContent>
      </Card>

      <Card data-testid="error-section">
        <CardHeader>
          <CardTitle>Error paths</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button data-testid="throw-error-button" variant="outline" onClick={onThrowHandlerError} disabled={isPending} aria-busy={isPending}>
            Throw handler error
          </Button>
          <Button data-testid="crash-button" variant="destructive" onClick={onCrash} disabled={isPending} aria-busy={isPending}>
            Force crash
          </Button>
          <Button data-testid="restart-button" onClick={onRestart} disabled={isPending} aria-busy={isPending}>
            Restart
          </Button>
        </CardContent>
      </Card>

      <Card data-testid="capabilities-section">
        <CardHeader>
          <CardTitle>Capabilities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button data-testid="caps-button" onClick={onCapabilities} disabled={isPending} aria-busy={isPending}>
            Read capabilities
          </Button>
          <pre data-testid="caps-output" className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
            {caps ? JSON.stringify(caps, null, 2) : ""}
          </pre>
        </CardContent>
      </Card>

      <Card data-testid="stress-section">
        <CardHeader>
          <CardTitle>Stress tests</CardTitle>
          <CardDescription>
            Scenarios that exercise behaviors MockWorker cannot fake (real boot latency, realm isolation, per-call timeout, end-to-end event streaming).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button data-testid="timeout-button" variant="outline" onClick={onTriggerTimeout}>
              Trigger timeout (sleep 5s, budget 100ms)
            </Button>
            <Button data-testid="emit-events-button" variant="outline" onClick={onEmitEvents} disabled={isPending} aria-busy={isPending}>
              Emit 5 events
            </Button>
            <Button data-testid="window-probe-button" variant="outline" onClick={onProbeWindow} disabled={isPending} aria-busy={isPending}>
              Probe typeof window
            </Button>
          </div>
          {windowProbe !== null && (
            <p className="text-sm" data-testid="window-probe-result">
              Worker reports <code>typeof window === &quot;{windowProbe}&quot;</code> (real Workers: <code>&quot;undefined&quot;</code>).
            </p>
          )}
        </CardContent>
      </Card>

      <Card data-testid="event-log-section">
        <CardHeader>
          <CardTitle>Event log</CardTitle>
          <CardDescription>
            {logs.length === 0 ? "No events yet." : `${logs.length} entr${logs.length === 1 ? "y" : "ies"}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button data-testid="clear-log-button" variant="outline" size="sm" onClick={onClearLog} disabled={logs.length === 0}>
            Clear event log
          </Button>
          <pre data-testid="event-log" className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs" aria-label="Worker event log">
            {logs.map((l) => `[${l.level}] ${l.line}\n`).join("")}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
