// @vitest-environment node
/**
 * @fileoverview Contract tests for memoized inspection sessions.
 * @module scripts/inspection/session.test
 */

import {describe, expect, it, vi} from "vitest";

import {createInspectionSession} from "./session.ts";
import type {InspectionOutcome, InspectionProvider} from "./types.ts";

/** Fixed two-key fact shape shared by every test in this file. */
interface TestFacts {
  readonly numberFact: number;
  readonly stringFact: string;
}

/** Builds an `"available"` outcome literal with a defaulted, irrelevant duration. */
function availableOutcome<T>(value: T, durationMs = 1): InspectionOutcome<T> {
  return {kind: "available", value, durationMs};
}

/** A provider stub whose settlement the test controls independently of when it is invoked. */
interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve: (value: T) => void;
  let reject: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  // Assigned synchronously by the executor above before this function returns.
  return {promise, resolve: (value) => resolve(value), reject: (reason) => reject(reason)};
}

/** A never-invoked-in-assertions filler provider for the fact key a test does not exercise. */
function unusedStringProvider(): InspectionProvider<string> {
  return vi.fn(async () => availableOutcome("unused"));
}

describe("createInspectionSession", () => {
  it("shares one in-flight provider call between concurrent callers", async () => {
    const deferred = createDeferred<InspectionOutcome<number>>();
    const numberFact = vi.fn<InspectionProvider<number>>(() => deferred.promise);
    const session = createInspectionSession<TestFacts>({numberFact, stringFact: unusedStringProvider()});

    const first = session.inspect("numberFact");
    const second = session.inspect("numberFact");

    expect(numberFact).toHaveBeenCalledTimes(1);

    deferred.resolve(availableOutcome(42));

    await expect(first).resolves.toEqual(availableOutcome(42));
    await expect(second).resolves.toEqual(availableOutcome(42));
    expect(numberFact).toHaveBeenCalledTimes(1);
  });

  it("reuses a resolved outcome until invalidation", async () => {
    const numberFact = vi.fn<InspectionProvider<number>>(async () => availableOutcome(7));
    const session = createInspectionSession<TestFacts>({numberFact, stringFact: unusedStringProvider()});

    await expect(session.inspect("numberFact")).resolves.toEqual(availableOutcome(7));
    await expect(session.inspect("numberFact")).resolves.toEqual(availableOutcome(7));

    expect(numberFact).toHaveBeenCalledTimes(1);
  });

  it("caches different keys independently", async () => {
    const numberFact = vi.fn<InspectionProvider<number>>(async () => availableOutcome(1));
    const stringFact = vi.fn<InspectionProvider<string>>(async () => availableOutcome("one"));
    const session = createInspectionSession<TestFacts>({numberFact, stringFact});

    await expect(session.inspect("numberFact")).resolves.toEqual(availableOutcome(1));
    await expect(session.inspect("stringFact")).resolves.toEqual(availableOutcome("one"));

    expect(numberFact).toHaveBeenCalledTimes(1);
    expect(stringFact).toHaveBeenCalledTimes(1);
  });

  it("invalidating one key does not evict another cached key", async () => {
    const numberFact = vi.fn<InspectionProvider<number>>(async () => availableOutcome(1));
    const stringFact = vi.fn<InspectionProvider<string>>(async () => availableOutcome("one"));
    const session = createInspectionSession<TestFacts>({numberFact, stringFact});

    await session.inspect("numberFact");
    await session.inspect("stringFact");

    session.invalidate("numberFact");

    await session.inspect("numberFact");
    await session.inspect("stringFact");

    expect(numberFact).toHaveBeenCalledTimes(2);
    expect(stringFact).toHaveBeenCalledTimes(1);
  });

  it("evicts a rejected provider promise so a later inspection retries", async () => {
    const failure = new Error("transient failure");
    const numberFact = vi
      .fn<InspectionProvider<number>>()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(availableOutcome(9));
    const session = createInspectionSession<TestFacts>({numberFact, stringFact: unusedStringProvider()});

    await expect(session.inspect("numberFact")).rejects.toBe(failure);
    await expect(session.inspect("numberFact")).resolves.toEqual(availableOutcome(9));

    expect(numberFact).toHaveBeenCalledTimes(2);
  });

  it("exposes a synchronous provider throw as a rejected, retryable inspection promise", async () => {
    const failure = new Error("synchronous boom");
    let callCount = 0;
    const numberFact: InspectionProvider<number> = () => {
      callCount += 1;
      if (callCount === 1) {
        throw failure;
      }
      return Promise.resolve(availableOutcome(3));
    };
    const session = createInspectionSession<TestFacts>({numberFact, stringFact: unusedStringProvider()});

    await expect(session.inspect("numberFact")).rejects.toBe(failure);
    expect(callCount).toBe(1);

    await expect(session.inspect("numberFact")).resolves.toEqual(availableOutcome(3));
    expect(callCount).toBe(2);
  });

  it("does not evict the replacement promise when a stale rejection settles after invalidation", async () => {
    const deferredFirst = createDeferred<InspectionOutcome<number>>();
    let callCount = 0;
    const numberFact: InspectionProvider<number> = () => {
      callCount += 1;
      if (callCount === 1) {
        return deferredFirst.promise;
      }
      return Promise.resolve(availableOutcome(11));
    };
    const session = createInspectionSession<TestFacts>({numberFact, stringFact: unusedStringProvider()});

    const stale = session.inspect("numberFact");
    // Observe the eventual stale rejection on this handle without letting it surface as an
    // unhandled rejection before the real assertion below awaits the same promise.
    stale.catch(() => undefined);

    session.invalidate("numberFact");
    const replacement = session.inspect("numberFact");
    expect(callCount).toBe(2);

    deferredFirst.reject(new Error("stale rejection"));
    await expect(stale).rejects.toThrow("stale rejection");

    await expect(replacement).resolves.toEqual(availableOutcome(11));
    await expect(session.inspect("numberFact")).resolves.toEqual(availableOutcome(11));

    expect(callCount).toBe(2);
  });

  it("narrows all three outcome variants by their discriminant and preserves exact payload fields", () => {
    function assertUnreachable(value: never): never {
      throw new Error(`Unexpected inspection outcome kind: ${JSON.stringify(value)}`);
    }

    function describeOutcome(outcome: InspectionOutcome<number>): string {
      switch (outcome.kind) {
        case "available":
          return `available:${outcome.value}:${outcome.durationMs}`;
        case "unavailable":
          return `unavailable:${outcome.reason}:${outcome.durationMs}`;
        case "invalid":
          return `invalid:${outcome.issues.join(",")}:${outcome.durationMs}`;
        default:
          return assertUnreachable(outcome);
      }
    }

    expect(describeOutcome({kind: "available", value: 5, durationMs: 2})).toBe("available:5:2");
    expect(describeOutcome({kind: "unavailable", reason: "missing", durationMs: 3})).toBe("unavailable:missing:3");
    expect(describeOutcome({kind: "invalid", issues: ["bad", "worse"], durationMs: 4})).toBe("invalid:bad,worse:4");
  });
});
