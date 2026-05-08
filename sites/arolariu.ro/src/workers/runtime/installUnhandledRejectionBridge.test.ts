/**
 * @fileoverview Tests for `installUnhandledRejectionBridge` — verify that
 * worker-side `unhandledrejection` events are forwarded over the side channel
 * as `{kind: "log", level: "error"}` events and that the uninstall function
 * detaches the listener.
 * @module workers/runtime/installUnhandledRejectionBridge.test
 */

import {describe, expect, it, vi} from "vitest";

import {installUnhandledRejectionBridge} from "./installUnhandledRejectionBridge";

describe("installUnhandledRejectionBridge", () => {
  it("forwards unhandledrejection events as a {kind: 'log', level: 'error'} event", () => {
    const events: unknown[] = [];
    const port = {postMessage: (e: unknown) => events.push(e)} as unknown as MessagePort;
    const fakeScope = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as DedicatedWorkerGlobalScope;

    const uninstall = installUnhandledRejectionBridge(fakeScope, port);
    expect(fakeScope.addEventListener).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));

    const handler = (fakeScope.addEventListener as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as (e: PromiseRejectionEvent) => void;
    handler({reason: new Error("dropped")} as unknown as PromiseRejectionEvent);

    expect(events).toEqual([
      {kind: "log", level: "error", msg: "Unhandled rejection in worker", attrs: {reason: "Error: dropped"}},
    ]);

    uninstall();
    expect(fakeScope.removeEventListener).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));
  });

  it("stringifies non-Error rejection reasons via String(reason)", () => {
    const events: unknown[] = [];
    const port = {postMessage: (e: unknown) => events.push(e)} as unknown as MessagePort;
    const fakeScope = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as DedicatedWorkerGlobalScope;
    installUnhandledRejectionBridge(fakeScope, port);
    const handler = (fakeScope.addEventListener as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as (e: PromiseRejectionEvent) => void;
    handler({reason: "raw"} as unknown as PromiseRejectionEvent);
    expect(events[0]).toMatchObject({attrs: {reason: "raw"}});
  });
});
