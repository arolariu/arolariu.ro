// @vitest-environment node
/**
 * @fileoverview Tests for the termination-signal recorder.
 * @module scripts/platform/signals.test
 *
 * @remarks
 * Emits synthetic `SIGINT`/`SIGTERM` events on `process` (no real signal is delivered) and checks
 * that the recorder keeps the latest one and that `dispose` removes exactly its own listeners.
 */

import {Effect} from "effect";
import {afterEach, describe, expect, it} from "vitest";

import {recordTerminationSignals, TerminationSignals, type SignalRecorder} from "./signals.ts";

describe("recordTerminationSignals", () => {
  let recorder: SignalRecorder | undefined;

  afterEach(() => {
    recorder?.dispose();
    recorder = undefined;
  });

  it("records the most recent signal", () => {
    // Arrange
    recorder = recordTerminationSignals();

    // Act
    process.emit("SIGINT");
    process.emit("SIGTERM");

    // Assert
    expect(recorder.last()).toBe("SIGTERM");
  });

  it("counts every received signal", () => {
    // Arrange
    recorder = recordTerminationSignals();
    const before = recorder.count();

    // Act
    process.emit("SIGINT");
    process.emit("SIGINT");

    // Assert
    expect(before).toBe(0);
    expect(recorder.count()).toBe(2);
  });

  it("reports no signal through the default TerminationSignals reference", () => {
    // Act
    const signals = Effect.runSync(
      Effect.gen(function* () {
        return yield* TerminationSignals;
      }),
    );

    // Assert
    expect(signals.last()).toBeUndefined();
    expect(signals.count()).toBe(0);
  });

  it("dispose removes its listeners", () => {
    // Arrange
    const before = process.listenerCount("SIGINT");
    const created = recordTerminationSignals();

    // Act
    created.dispose();

    // Assert
    expect(process.listenerCount("SIGINT")).toBe(before);
  });
});
