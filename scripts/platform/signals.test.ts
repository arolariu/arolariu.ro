// @vitest-environment node
/**
 * @fileoverview Tests for the termination-signal recorder.
 * @module scripts/platform/signals.test
 *
 * @remarks
 * Emits synthetic `SIGINT`/`SIGTERM` events on `process` (no real signal is delivered) and checks
 * that the recorder keeps the latest one and that `dispose` removes exactly its own listeners.
 */

import {afterEach, describe, expect, it} from "vitest";

import {recordTerminationSignals, type SignalRecorder} from "./signals.ts";

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
