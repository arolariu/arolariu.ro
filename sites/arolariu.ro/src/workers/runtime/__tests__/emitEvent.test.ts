import {describe, expect, it, vi} from "vitest";

import {emitEvent} from "../emitEvent";

describe("emitEvent", () => {
  it("posts a typed event on the given port", () => {
    const port = {postMessage: vi.fn()} as unknown as MessagePort;
    emitEvent(port, {kind: "log", level: "info", msg: "hello"});
    expect(port.postMessage).toHaveBeenCalledExactlyOnceWith({
      kind: "log",
      level: "info",
      msg: "hello",
    });
  });

  it("supports the metric event kind", () => {
    const port = {postMessage: vi.fn()} as unknown as MessagePort;
    emitEvent(port, {kind: "metric", name: "tokens", value: 42});
    expect(port.postMessage).toHaveBeenCalledExactlyOnceWith({
      kind: "metric",
      name: "tokens",
      value: 42,
    });
  });

  it("supports the ready event kind", () => {
    const port = {postMessage: vi.fn()} as unknown as MessagePort;
    emitEvent(port, {kind: "ready"});
    expect(port.postMessage).toHaveBeenCalledExactlyOnceWith({kind: "ready"});
  });

  it("supports the span event kind", () => {
    const port = {postMessage: vi.fn()} as unknown as MessagePort;
    emitEvent(port, {kind: "span", name: "phase", startMs: 100, durationMs: 50});
    expect(port.postMessage).toHaveBeenCalledExactlyOnceWith({
      kind: "span",
      name: "phase",
      startMs: 100,
      durationMs: 50,
    });
  });

  it("silently swallows postMessage errors so telemetry can never crash a worker", () => {
    const port = {
      postMessage: vi.fn(() => {
        throw new Error("port detached");
      }),
    } as unknown as MessagePort;
    expect(() => emitEvent(port, {kind: "ready"})).not.toThrow();
  });
});
