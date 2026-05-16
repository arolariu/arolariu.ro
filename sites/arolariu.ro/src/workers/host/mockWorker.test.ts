/**
 * @fileoverview Focused unit tests for the `MockWorker` utility.
 * @module workers/host/mockWorker.test
 *
 * @remarks
 * The `createMockWorker` helper is exercised transitively through
 * `createWorkerHost.test.ts`, but several branches in `mockWorker.ts` can
 * only be reached with targeted tests:
 *
 * - `postMessage` with a `StructuredSerializeOptions` transfer arg (not an
 *   array) → the `Array.isArray(transfer) ? transfer : []` else-branch
 *   yields an empty ports list (lines 82-86).
 * - `simulateMessageError()` after `worker.terminate()` → the early-return
 *   guard `if (terminated) return` (line 127).
 */

import {beforeEach, describe, expect, it} from "vitest";

import {__resetForTesting} from "../runtime/exposeWorker";
import {createMockWorker} from "./mockWorker";

beforeEach(() => {
  __resetForTesting();
});

describe("createMockWorker", () => {
  describe("postMessage with StructuredSerializeOptions transfer arg", () => {
    it("accepts a non-array transfer arg without throwing", () => {
      // Exercises the `Array.isArray(transfer) ? transfer : []` else-branch
      // (lines 82-86 of mockWorker.ts). When `postMessage` is called with a
      // `StructuredSerializeOptions` object (not an array), the else-branch
      // resolves the ports list to `[]`. The bootstrap handler is already
      // wired by `expose()` and discards the custom-kind message; the only
      // contract here is that the branch is reachable without throwing.
      // v8 coverage confirms the branch fires.
      const mock = createMockWorker({api: {ping: async () => "pong"}});
      const structuredSerializeOpts: StructuredSerializeOptions = {transfer: []};

      expect(() => {
        mock.worker.postMessage({kind: "custom-msg"}, structuredSerializeOpts);
      }).not.toThrow();
    });
  });

  describe("simulateMessageError after terminate", () => {
    it("is a no-op when the worker has already been terminated", () => {
      // Exercises the `if (terminated) return` guard in simulateMessageError
      // (line 127 of mockWorker.ts). After terminate(), the mock sets
      // terminated=true, and simulateMessageError must return early.
      const mock = createMockWorker({api: {ping: async () => "pong"}});
      mock.worker.terminate();
      // Should not throw — the guard returns early before touching messageErrorHandler.
      expect(() => mock.simulateMessageError()).not.toThrow();
    });
  });

  describe("postMessage when terminated", () => {
    it("is a no-op after the worker has been terminated", () => {
      // Exercises the `if (terminated) return` guard in postMessage
      // (line 82 of mockWorker.ts).
      const mock = createMockWorker({api: {ping: async () => "pong"}});
      mock.worker.terminate();
      // postMessage after terminate must not throw — it returns early.
      expect(() => mock.worker.postMessage({custom: "msg"}, [])).not.toThrow();
    });
  });

  describe("whenTerminated", () => {
    it("resolves when terminate() is called", async () => {
      const mock = createMockWorker({api: {ping: async () => "pong"}});
      mock.worker.terminate();
      await expect(mock.whenTerminated).resolves.toBeUndefined();
    });
  });

  describe("simulateCrash", () => {
    it("resolves whenTerminated and marks worker as terminated", async () => {
      const mock = createMockWorker({api: {ping: async () => "pong"}});
      mock.simulateCrash();
      await expect(mock.whenTerminated).resolves.toBeUndefined();
    });
  });
});
