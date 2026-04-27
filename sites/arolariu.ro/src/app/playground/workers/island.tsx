"use client";

/**
 * @fileoverview Client interactive UI for the worker playground.
 * @module app/playground/workers/island
 */

import {useEffect, useMemo, useRef, useState} from "react";

import {createWorkerHost, type WorkerCapabilities, type WorkerEvent, type WorkerHostState} from "@/workers";
import type {PlaygroundWorkerApi} from "./playground.worker";

type Log = Readonly<{ts: number; level: string; line: string}>;

export function WorkerPlaygroundIsland(): React.JSX.Element {
  const [state, setState] = useState<WorkerHostState>("idle");
  const [logs, setLogs] = useState<ReadonlyArray<Log>>([]);
  const [echoOut, setEchoOut] = useState<string>("");
  const [caps, setCaps] = useState<WorkerCapabilities | null>(null);
  const echoInputRef = useRef<HTMLInputElement>(null);
  const sleepAcRef = useRef<AbortController | null>(null);

  const host = useMemo(() => {
    return createWorkerHost<PlaygroundWorkerApi>({
      name: "playground",
      load: () => new Worker(new URL("./playground.worker.ts", import.meta.url), {type: "module"}),
      idleTimeoutMs: 60_000,
      onEvent: (e: WorkerEvent) => {
        setLogs((prev) => [...prev, {ts: Date.now(), level: e.kind, line: JSON.stringify(e)}]);
      },
    });
  }, []);

  useEffect(() => {
    const unsub = host.subscribe(setState);
    setState(host.state);
    return () => {
      unsub();
      void host.dispose();
    };
  }, [host]);

  const onEcho = async (): Promise<void> => {
    const v = echoInputRef.current?.value ?? "";
    const out = await host.api.echo(v);
    setEchoOut(out);
  };

  const onSleep10s = async (): Promise<void> => {
    sleepAcRef.current = new AbortController();
    try {
      await host.api.sleep(10_000, sleepAcRef.current.signal);
    } catch (e) {
      setLogs((prev) => [...prev, {ts: Date.now(), level: "abort", line: String(e)}]);
    }
  };

  const onAbortSleep = (): void => {
    sleepAcRef.current?.abort(new Error("user aborted"));
  };

  const onCrash = async (): Promise<void> => {
    try {
      await host.api.crash();
    } catch (e) {
      setLogs((prev) => [...prev, {ts: Date.now(), level: "crash", line: String(e)}]);
    }
  };

  const onRestart = async (): Promise<void> => {
    await host.restart();
  };

  const onCapabilities = async (): Promise<void> => {
    const c = await host.api.reportCapabilities();
    setCaps(c);
  };

  return (
    <div data-testid="playground-root" style={{padding: 16, fontFamily: "monospace"}}>
      <h1>Worker Playground</h1>
      <section data-testid="state-section">
        <h2>State</h2>
        <p>
          state: <strong data-testid="host-state">{state}</strong>
        </p>
      </section>

      <section data-testid="calls-section">
        <h2>Calls</h2>
        <input ref={echoInputRef} data-testid="echo-input" placeholder="echo me" />
        <button data-testid="echo-button" onClick={onEcho}>
          echo
        </button>
        <p data-testid="echo-result">{echoOut}</p>
      </section>

      <section data-testid="cancellation-section">
        <h2>Cancellation</h2>
        <button data-testid="sleep-button" onClick={onSleep10s}>
          sleep 10s
        </button>
        <button data-testid="abort-button" onClick={onAbortSleep}>
          abort
        </button>
      </section>

      <section data-testid="error-section">
        <h2>Error paths</h2>
        <button data-testid="crash-button" onClick={onCrash}>
          crash
        </button>
        <button data-testid="restart-button" onClick={onRestart}>
          restart
        </button>
      </section>

      <section data-testid="capabilities-section">
        <h2>Capabilities</h2>
        <button data-testid="caps-button" onClick={onCapabilities}>
          read
        </button>
        <pre data-testid="caps-output">{caps ? JSON.stringify(caps, null, 2) : ""}</pre>
        <p>
          crossOriginIsolated:{" "}
          <span data-testid="coi">{String(host.capabilities.crossOriginIsolated)}</span>
        </p>
      </section>

      <section data-testid="event-log-section">
        <h2>Event log</h2>
        <pre data-testid="event-log" style={{maxHeight: 200, overflow: "auto"}}>
          {logs.map((l) => `[${l.level}] ${l.line}\n`).join("")}
        </pre>
      </section>
    </div>
  );
}
