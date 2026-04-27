import {describe, expect, it, vi} from "vitest";

import {createTelemetryBridge} from "./telemetryBridge";

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

    it("uses String(error) for non-Error rejections in the error log attrs", async () => {
      const error = vi.fn();
      const bridge = createTelemetryBridge("ai", {logger: {debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error}});
      // Reject with a plain string (not an Error instance)
      await expect(bridge.wrapCall("greet", async () => Promise.reject("plain-string-cause"))).rejects.toBe("plain-string-cause");
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining("worker.ai.greet"),
        expect.objectContaining({status: "error", error: "plain-string-cause"}),
      );
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

  describe("default logger (console.*)", () => {
    it("uses console.info by default when no logger is injected", () => {
      const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
      try {
        const bridge = createTelemetryBridge("ai");
        bridge.ingestEvent({kind: "log", level: "info", msg: "default-info"});
        expect(infoSpy).toHaveBeenCalledWith("[worker:ai] default-info", undefined);
      } finally {
        infoSpy.mockRestore();
      }
    });

    it("uses console.warn by default when no logger is injected", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        const bridge = createTelemetryBridge("ai");
        bridge.ingestEvent({kind: "log", level: "warn", msg: "default-warn"});
        expect(warnSpy).toHaveBeenCalledWith("[worker:ai] default-warn", undefined);
      } finally {
        warnSpy.mockRestore();
      }
    });

    it("uses console.debug by default for wrapCall success", async () => {
      const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
      try {
        const bridge = createTelemetryBridge("ai");
        await bridge.wrapCall("greet", async () => "ok");
        expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining("worker.ai.greet"), expect.objectContaining({status: "ok"}));
      } finally {
        debugSpy.mockRestore();
      }
    });

    it("uses console.error by default for wrapCall failure", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        const bridge = createTelemetryBridge("ai");
        await expect(bridge.wrapCall("greet", async () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("worker.ai.greet"), expect.objectContaining({status: "error"}));
      } finally {
        errorSpy.mockRestore();
      }
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
