/**
 * @fileoverview Tests for streaming response buffer.
 *
 * Validates token coalescing, interrupt handling, and final flush behavior.
 *
 * @module app/domains/invoices/_components/ai/streamingBuffer.test
 */

import {describe, expect, it, vi} from "vitest";
import {createStreamingResponseBuffer} from "./streamingBuffer";

describe("createStreamingResponseBuffer", () => {
  describe("token coalescing", () => {
    it("should coalesce multiple tokens into one flush", () => {
      const flushFn = vi.fn();
      let pendingCallback: (() => void) | null = null;
      const scheduleFn = vi.fn((callback: () => void) => {
        pendingCallback = callback;

        return 1;
      });
      const buffer = createStreamingResponseBuffer({
        cancel: vi.fn(),
        flush: flushFn,
        schedule: scheduleFn,
      });

      buffer.append("First");
      buffer.append(" token");
      buffer.append(" batch");

      expect(scheduleFn).toHaveBeenCalledOnce();
      expect(flushFn).not.toHaveBeenCalled();

      // Execute the scheduled flush
      pendingCallback?.();

      expect(flushFn).toHaveBeenCalledOnce();
      expect(flushFn).toHaveBeenCalledWith("First token batch");
    });

    it("should accumulate tokens before scheduled flush executes", () => {
      const flushFn = vi.fn();
      let pendingCallback: (() => void) | null = null;
      const scheduleFn = vi.fn((callback: () => void) => {
        pendingCallback = callback;

        return 1;
      });
      const buffer = createStreamingResponseBuffer({
        cancel: vi.fn(),
        flush: flushFn,
        schedule: scheduleFn,
      });

      buffer.append("A");
      buffer.append("B");
      buffer.append("C");

      // Flush not called yet
      expect(flushFn).not.toHaveBeenCalled();
      expect(scheduleFn).toHaveBeenCalledOnce();

      // Execute scheduled flush
      pendingCallback?.();

      expect(flushFn).toHaveBeenCalledOnce();
      expect(flushFn).toHaveBeenCalledWith("ABC");
    });

    it("should schedule at most one pending flush", () => {
      const flushFn = vi.fn();
      let pendingCallback: (() => void) | null = null;
      const scheduleFn = vi.fn((callback: () => void) => {
        pendingCallback = callback;

        return 1;
      });
      const buffer = createStreamingResponseBuffer({
        cancel: vi.fn(),
        flush: flushFn,
        schedule: scheduleFn,
      });

      buffer.append("Token1");
      buffer.append("Token2");
      buffer.append("Token3");

      // Only one schedule call despite multiple appends
      expect(scheduleFn).toHaveBeenCalledOnce();

      pendingCallback?.();

      expect(flushFn).toHaveBeenCalledOnce();
      expect(flushFn).toHaveBeenCalledWith("Token1Token2Token3");
    });

    it("should allow new flush after previous flush completes", () => {
      const flushFn = vi.fn();
      const callbacks: Array<() => void> = [];
      const scheduleFn = vi.fn((callback: () => void) => {
        callbacks.push(callback);

        return callbacks.length;
      });
      const buffer = createStreamingResponseBuffer({
        cancel: vi.fn(),
        flush: flushFn,
        schedule: scheduleFn,
      });

      // First batch
      buffer.append("First");
      expect(scheduleFn).toHaveBeenCalledTimes(1);
      callbacks[0]?.();
      expect(flushFn).toHaveBeenCalledWith("First");

      // Second batch
      buffer.append("Second");
      expect(scheduleFn).toHaveBeenCalledTimes(2);
      callbacks[1]?.();
      expect(flushFn).toHaveBeenCalledWith("Second");

      expect(flushFn).toHaveBeenCalledTimes(2);
    });
  });

  describe("interrupt handling", () => {
    it("should cancel pending flush on interrupt", () => {
      const flushFn = vi.fn();
      const cancelFn = vi.fn();
      let pendingCallback: (() => void) | null = null;
      const scheduleFn = vi.fn((callback: () => void) => {
        pendingCallback = callback;

        return 42;
      });
      const buffer = createStreamingResponseBuffer({
        cancel: cancelFn,
        flush: flushFn,
        schedule: scheduleFn,
      });

      buffer.append("Partial");
      buffer.append(" content");
      expect(scheduleFn).toHaveBeenCalledOnce();

      buffer.interrupt();

      expect(cancelFn).toHaveBeenCalledOnce();
      expect(cancelFn).toHaveBeenCalledWith(42);

      // Flush should not execute after interrupt
      pendingCallback?.();
      expect(flushFn).not.toHaveBeenCalled();
    });

    it("should not schedule new flushes after interrupt", () => {
      const flushFn = vi.fn();
      const scheduleFn = vi.fn((callback: () => void) => {
        callback();

        return 1;
      });
      const buffer = createStreamingResponseBuffer({
        cancel: vi.fn(),
        flush: flushFn,
        schedule: scheduleFn,
      });

      buffer.interrupt();
      buffer.append("After interrupt");

      expect(scheduleFn).not.toHaveBeenCalled();
      expect(flushFn).not.toHaveBeenCalled();
    });

    it("should clear accumulated content on interrupt", () => {
      const flushFn = vi.fn();
      const scheduleFn = vi.fn();
      const buffer = createStreamingResponseBuffer({
        cancel: vi.fn(),
        flush: flushFn,
        schedule: scheduleFn,
      });

      buffer.append("Content before interrupt");
      buffer.interrupt();

      // Force flush after interrupt should do nothing
      buffer.forceFlush();

      expect(flushFn).not.toHaveBeenCalled();
    });
  });

  describe("final flush", () => {
    it("should flush immediately on forceFlush even if no pending schedule", () => {
      const flushFn = vi.fn();
      let pendingCallback: (() => void) | null = null;
      const scheduleFn = vi.fn((callback: () => void) => {
        pendingCallback = callback;

        return 1;
      });
      const buffer = createStreamingResponseBuffer({
        cancel: vi.fn(),
        flush: flushFn,
        schedule: scheduleFn,
      });

      buffer.append("Final");
      buffer.append(" content");
      buffer.forceFlush();

      expect(flushFn).toHaveBeenCalledOnce();
      expect(flushFn).toHaveBeenCalledWith("Final content");
      expect(scheduleFn).toHaveBeenCalledOnce(); // scheduled but cancelled by forceFlush

      // Scheduled callback should not execute after forceFlush
      pendingCallback?.();
      expect(flushFn).toHaveBeenCalledOnce(); // still only 1 call
    });

    it("should flush accumulated content and cancel pending schedule", () => {
      const flushFn = vi.fn();
      const cancelFn = vi.fn();
      let pendingCallback: (() => void) | null = null;
      const scheduleFn = vi.fn((callback: () => void) => {
        pendingCallback = callback;

        return 99;
      });
      const buffer = createStreamingResponseBuffer({
        cancel: cancelFn,
        flush: flushFn,
        schedule: scheduleFn,
      });

      buffer.append("First");
      expect(scheduleFn).toHaveBeenCalledOnce();

      buffer.append("Second");
      buffer.forceFlush();

      expect(cancelFn).toHaveBeenCalledOnce();
      expect(cancelFn).toHaveBeenCalledWith(99);
      expect(flushFn).toHaveBeenCalledOnce();
      expect(flushFn).toHaveBeenCalledWith("FirstSecond");

      // Scheduled callback should not execute after forceFlush
      pendingCallback?.();
      expect(flushFn).toHaveBeenCalledOnce();
    });

    it("should do nothing on forceFlush when buffer is empty", () => {
      const flushFn = vi.fn();
      const scheduleFn = vi.fn();
      const buffer = createStreamingResponseBuffer({
        cancel: vi.fn(),
        flush: flushFn,
        schedule: scheduleFn,
      });

      buffer.forceFlush();

      expect(flushFn).not.toHaveBeenCalled();
      expect(scheduleFn).not.toHaveBeenCalled();
    });

    it("should allow new appends after forceFlush", () => {
      const flushFn = vi.fn();
      let pendingCallback: (() => void) | null = null;
      const scheduleFn = vi.fn((callback: () => void) => {
        pendingCallback = callback;

        return 1;
      });
      const buffer = createStreamingResponseBuffer({
        cancel: vi.fn(),
        flush: flushFn,
        schedule: scheduleFn,
      });

      buffer.append("First");
      buffer.forceFlush();
      expect(flushFn).toHaveBeenCalledWith("First");

      buffer.append("Second");
      pendingCallback?.(); // Execute second flush
      expect(flushFn).toHaveBeenCalledWith("Second");
      expect(flushFn).toHaveBeenCalledTimes(2);
    });
  });

  describe("edge cases", () => {
    it("should handle empty string appends", () => {
      const flushFn = vi.fn();
      let pendingCallback: (() => void) | null = null;
      const scheduleFn = vi.fn((callback: () => void) => {
        pendingCallback = callback;

        return 1;
      });
      const buffer = createStreamingResponseBuffer({
        cancel: vi.fn(),
        flush: flushFn,
        schedule: scheduleFn,
      });

      buffer.append("");
      buffer.append("Valid");
      buffer.append("");

      pendingCallback?.();

      expect(flushFn).toHaveBeenCalledOnce();
      expect(flushFn).toHaveBeenCalledWith("Valid");
    });

    it("should handle rapid append-flush cycles", () => {
      const flushFn = vi.fn();
      let pendingCallback: (() => void) | null = null;
      const scheduleFn = vi.fn((callback: () => void) => {
        pendingCallback = callback;

        return 1;
      });
      const buffer = createStreamingResponseBuffer({
        cancel: vi.fn(),
        flush: flushFn,
        schedule: scheduleFn,
      });

      for (let index = 0; index < 100; index += 1) {
        buffer.append(`Token${index}`);
      }

      pendingCallback?.();

      expect(flushFn).toHaveBeenCalledOnce();
      expect(flushFn.mock.calls[0]?.[0]).toContain("Token0");
      expect(flushFn.mock.calls[0]?.[0]).toContain("Token99");
    });
  });
});
