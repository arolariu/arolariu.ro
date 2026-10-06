// @vitest-environment node
/**
 * @fileoverview Contract tests for memoized inspection sessions.
 * @module scripts/inspection/session.test
 */

import {Deferred, Duration, Effect, Exit, Fiber, Scope, Tracer} from "effect";
import {TestClock} from "effect/testing";
import {describe, expect, it} from "vitest";

import {effectTest, makeTestLayer} from "../platform/testing.ts";
import {createInspectionSession} from "./session.ts";
import type {InspectionOutcome, InspectionProvider} from "./types.ts";

/** Fixed two-key fact shape shared by every test in this file. */
interface TestFacts {
  readonly a: number;
  readonly b: string;
}

/** Builds an `"available"` outcome literal with a defaulted, irrelevant duration. */
function availableOutcome<T>(value: T, durationMs = 0): InspectionOutcome<T> {
  return {kind: "available", value, durationMs};
}

/** A provider for the key a test does not exercise. */
const unusedProvider: InspectionProvider<string> = Effect.succeed(availableOutcome("unused"));

/** A provider that counts its runs and answers `value` after `delayMs` of (test) clock time. */
function countingProvider(value: number, delayMs = 0): {readonly provider: InspectionProvider<number>; readonly runs: () => number} {
  let runs = 0;
  return {
    provider: Effect.gen(function* () {
      runs += 1;
      if (delayMs > 0) {
        yield* Effect.sleep(Duration.millis(delayMs));
      }
      return availableOutcome(value);
    }),
    runs: () => runs,
  };
}

describe("createInspectionSession", () => {
  effectTest(
    "traces each provider run as one inspection.<key> span",
    () =>
      Effect.gen(function* () {
        // Arrange
        const spans: string[] = [];
        const tracer = Tracer.make({
          span: (options) => {
            spans.push(options.name);
            return new Tracer.NativeSpan(options);
          },
        });
        const session = yield* createInspectionSession<TestFacts>({a: countingProvider(1).provider, b: unusedProvider});

        // Act
        yield* Effect.all([session.inspect("a"), session.inspect("a"), session.inspect("b")], {concurrency: "unbounded"}).pipe(
          Effect.withTracer(tracer),
        );

        // Assert
        expect(spans.filter((name) => name.startsWith("inspection.")).toSorted()).toEqual(["inspection.a", "inspection.b"]);
      }),
    makeTestLayer().layer,
  );
  effectTest(
    "runs a provider once for concurrent inspections",
    () =>
      Effect.gen(function* () {
        // Arrange
        const counted = countingProvider(42, 10);
        const session = yield* createInspectionSession<TestFacts>({a: counted.provider, b: unusedProvider});

        // Act
        const fiber = yield* Effect.forkChild(Effect.all([session.inspect("a"), session.inspect("a")], {concurrency: 2}));
        yield* TestClock.adjust("10 millis");
        const [first, second] = yield* Fiber.join(fiber);

        // Assert
        expect(counted.runs()).toBe(1);
        expect(first).toEqual(availableOutcome(42, 10));
        expect(second).toBe(first);
      }),
    makeTestLayer().layer,
  );

  effectTest(
    "re-runs a provider after invalidate",
    () =>
      Effect.gen(function* () {
        // Arrange
        const counted = countingProvider(7);
        const session = yield* createInspectionSession<TestFacts>({a: counted.provider, b: unusedProvider});

        // Act
        yield* session.inspect("a");
        yield* session.inspect("a");
        yield* session.invalidate("a");
        yield* session.inspect("a");

        // Assert
        expect(counted.runs()).toBe(2);
      }),
    makeTestLayer().layer,
  );

  effectTest(
    "measures duration with the clock",
    () =>
      Effect.gen(function* () {
        // Arrange
        const counted = countingProvider(1, 250);
        const session = yield* createInspectionSession<TestFacts>({a: counted.provider, b: unusedProvider});

        // Act
        const fiber = yield* Effect.forkChild(session.inspect("a"));
        yield* TestClock.adjust("250 millis");
        const outcome = yield* Fiber.join(fiber);

        // Assert
        expect(outcome.durationMs).toBe(250);
      }),
    makeTestLayer().layer,
  );

  effectTest(
    "caches different keys independently and invalidates only the named key",
    () =>
      Effect.gen(function* () {
        // Arrange
        const a = countingProvider(1);
        let bRuns = 0;
        const b: InspectionProvider<string> = Effect.sync(() => {
          bRuns += 1;
          return availableOutcome("one");
        });
        const session = yield* createInspectionSession<TestFacts>({a: a.provider, b});

        // Act
        yield* session.inspect("a");
        yield* session.inspect("b");
        yield* session.invalidate("a");
        yield* session.inspect("a");
        const cachedB = yield* session.inspect("b");

        // Assert
        expect(a.runs()).toBe(2);
        expect(bRuns).toBe(1);
        expect(cachedB).toEqual(availableOutcome("one"));
      }),
    makeTestLayer().layer,
  );

  effectTest(
    "evicts a provider defect so a later inspection retries",
    () =>
      Effect.gen(function* () {
        // Arrange
        let runs = 0;
        const flaky: InspectionProvider<number> = Effect.suspend(() => {
          runs += 1;
          return runs === 1 ? Effect.die(new Error("transient failure")) : Effect.succeed(availableOutcome(9));
        });
        const session = yield* createInspectionSession<TestFacts>({a: flaky, b: unusedProvider});

        // Act
        const failed = yield* Effect.exit(session.inspect("a"));
        const retried = yield* session.inspect("a");

        // Assert
        expect(Exit.isFailure(failed)).toBe(true);
        expect(retried).toEqual(availableOutcome(9));
        expect(runs).toBe(2);
      }),
    makeTestLayer().layer,
  );

  effectTest(
    "delivers an in-flight result to its waiters after invalidate without re-caching it",
    () =>
      Effect.gen(function* () {
        // Arrange
        const release = yield* Deferred.make<void>();
        let runs = 0;
        const gated: InspectionProvider<number> = Effect.gen(function* () {
          runs += 1;
          const run = runs;
          if (run === 1) {
            yield* Deferred.await(release);
          }
          return availableOutcome(run);
        });
        const session = yield* createInspectionSession<TestFacts>({a: gated, b: unusedProvider});

        // Act
        const waiter = yield* Effect.forkChild(session.inspect("a"));
        yield* Effect.yieldNow;
        yield* session.invalidate("a");
        const replacement = yield* session.inspect("a");
        yield* Deferred.succeed(release, undefined);
        const stale = yield* Fiber.join(waiter);
        const later = yield* session.inspect("a");

        // Assert
        expect(stale).toEqual(availableOutcome(1));
        expect(replacement).toEqual(availableOutcome(2));
        expect(later).toBe(replacement);
        expect(runs).toBe(2);
      }),
    makeTestLayer().layer,
  );

  effectTest(
    "keeps a shared provider running when one waiter is interrupted",
    () =>
      Effect.gen(function* () {
        // Arrange
        const counted = countingProvider(5, 100);
        const session = yield* createInspectionSession<TestFacts>({a: counted.provider, b: unusedProvider});

        // Act
        const interrupted = yield* Effect.forkChild(session.inspect("a"));
        const survivor = yield* Effect.forkChild(session.inspect("a"));
        yield* Effect.yieldNow;
        yield* Fiber.interrupt(interrupted);
        yield* TestClock.adjust("100 millis");
        const outcome = yield* Fiber.join(survivor);

        // Assert
        expect(outcome).toEqual(availableOutcome(5, 100));
        expect(counted.runs()).toBe(1);
      }),
    makeTestLayer().layer,
  );

  effectTest(
    "interrupts in-flight providers when the session scope closes",
    () =>
      Effect.gen(function* () {
        // Arrange
        const started = yield* Deferred.make<void>();
        let interrupted = false;
        const hanging: InspectionProvider<number> = Deferred.succeed(started, undefined).pipe(
          Effect.andThen(Effect.never),
          Effect.onInterrupt(() =>
            Effect.sync(() => {
              interrupted = true;
            }),
          ),
        );
        const scope = yield* Scope.make();
        const session = yield* createInspectionSession<TestFacts>({a: hanging, b: unusedProvider}).pipe(Scope.provide(scope));

        // Act
        const waiter = yield* Effect.forkChild(session.inspect("a"));
        yield* Deferred.await(started);
        yield* Scope.close(scope, Exit.void);
        const exit = yield* Fiber.await(waiter);

        // Assert
        expect(interrupted).toBe(true);
        expect(Exit.isFailure(exit)).toBe(true);
      }),
    makeTestLayer().layer,
  );

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
