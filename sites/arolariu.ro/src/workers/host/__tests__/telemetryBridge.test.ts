import {describe, expect, it, vi} from "vitest";

import {createTelemetryBridge} from "../telemetryBridge";

describe("createTelemetryBridge", () => {
  describe("wrapCall", () => {
    it("invokes the function and returns its resolved value", async () => {
      const bridge = createTelemetryBridge("ai");
      const result = await bridge.wrapCall("greet", async () => "ok");
      expect(result).toBe("ok");
    });

    it("propagates rejected errors", async () => {
      const bridge = createTelemetryBridge("ai");
      const err = new Error("boom");
      await expect(bridge.wrapCall("greet", async () => Promise.reject(err))).rejects.toBe(err);
    });

    it("logs a debug span line on success when an injected logger is provided", async () => {
      const debug = vi.fn();
      const bridge = createTelemetryBridge("ai", {logger: {debug, info: vi.fn(), warn: vi.fn(), error: vi.fn()}});
      await bridge.wrapCall("greet", async () => "ok");
      expect(debug).toHaveBeenCalledWith(
        expect.stringContaining("worker.ai.greet"),
        expect.objectContaining({status: "ok"}),
      );
    });

    it("logs an error span line on failure", async () => {
      const error = vi.fn();
      const bridge = createTelemetryBridge("ai", {
        logger: {debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error},
      });
      await expect(bridge.wrapCall("greet", async () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining("worker.ai.greet"),
        expect.objectContaining({status: "error"}),
      );
    });
  });

  describe("ingestEvent", () => {
    it("forwards log events to the injected logger at the matching level", () => {
      const info = vi.fn();
      const bridge = createTelemetryBridge("ai", {logger: {debug: vi.fn(), info, warn: vi.fn(), error: vi.fn()}});
      bridge.ingestEvent({kind: "log", level: "info", msg: "hello"});
      expect(info).toHaveBeenCalledWith("[worker:ai] hello", undefined);
    });

    it("forwards log attrs as the second argument", () => {
      const warn = vi.fn();
      const bridge = createTelemetryBridge("ai", {logger: {debug: vi.fn(), info: vi.fn(), warn, error: vi.fn()}});
      bridge.ingestEvent({kind: "log", level: "warn", msg: "low memory", attrs: {free: 100}});
      expect(warn).toHaveBeenCalledWith("[worker:ai] low memory", {free: 100});
    });

    it("ignores ready events (consumed by lifecycle, not forwarded)", () => {
      const debug = vi.fn();
      const info = vi.fn();
      const bridge = createTelemetryBridge("ai", {logger: {debug, info, warn: vi.fn(), error: vi.fn()}});
      bridge.ingestEvent({kind: "ready"});
      expect(debug).not.toHaveBeenCalled();
      expect(info).not.toHaveBeenCalled();
    });

    it("logs metrics at debug level (until OTel meter is wired)", () => {
      const debug = vi.fn();
      const bridge = createTelemetryBridge("ai", {logger: {debug, info: vi.fn(), warn: vi.fn(), error: vi.fn()}});
      bridge.ingestEvent({kind: "metric", name: "tokens", value: 42});
      expect(debug).toHaveBeenCalledWith(
        expect.stringContaining("metric"),
        expect.objectContaining({worker: "ai", name: "tokens", value: 42}),
      );
    });

    it("logs span events at debug level (until OTel tracer is wired)", () => {
      const debug = vi.fn();
      const bridge = createTelemetryBridge("ai", {logger: {debug, info: vi.fn(), warn: vi.fn(), error: vi.fn()}});
      bridge.ingestEvent({kind: "span", name: "load", startMs: 100, durationMs: 50});
      expect(debug).toHaveBeenCalledWith(
        expect.stringContaining("span"),
        expect.objectContaining({worker: "ai", name: "load", durationMs: 50}),
      );
    });
  });
});
