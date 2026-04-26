/**
 * @fileoverview Tests for performance metrics calculation.
 */

import {describe, expect, it} from "vitest";
import {createGenerationMetricsTracker, DEFAULT_PERFORMANCE_CLOCK, type PerformanceClock} from "./performanceMetrics";

function createFakeClock(timestamps: number[]): PerformanceClock {
  let index = 0;

  return {
    now: () => {
      const current = timestamps[index] ?? timestamps[timestamps.length - 1] ?? 0;
      index += 1;

      return current;
    },
  };
}

describe("performanceMetrics", () => {
  describe("createGenerationMetricsTracker", () => {
    it("calculates first-token latency from deterministic timestamps", () => {
      // Arrange: Start at 0ms, first token at 200ms, end at 1000ms
      const clock = createFakeClock([0, 200, 1000]);
      const tracker = createGenerationMetricsTracker({clock, modelId: "test-model"});

      // Act
      tracker.onStart(); // 0ms
      tracker.onChunk("Hello"); // 200ms
      const metrics = tracker.onEnd(); // 1000ms

      // Assert
      expect(metrics.firstTokenLatencyMs).toBe(200);
      expect(metrics.totalDurationMs).toBe(1000);
    });

    it("calculates total throughput from multiple chunks", () => {
      // Arrange: Clock is only called on: onStart, first chunk (for firstToken), onEnd
      // Timeline: start(0ms) -> first_chunk_firstToken(100ms) -> end(1000ms)
      const clock = createFakeClock([0, 100, 1000]);
      const tracker = createGenerationMetricsTracker({clock, modelId: "test-model"});

      // Act
      tracker.onStart(); // clock.now() -> 0ms
      tracker.onChunk("Hello "); // 6 chars, first token triggers clock.now() -> 100ms
      tracker.onChunk("world"); // 5 chars, no clock call
      tracker.onChunk(", how "); // 6 chars, no clock call
      tracker.onChunk("are you?"); // 8 chars, no clock call
      const metrics = tracker.onEnd(); // clock.now() -> 1000ms

      // Assert
      expect(metrics.chunkCount).toBe(4);
      expect(metrics.characterCount).toBe(25); // 6 + 5 + 6 + 8
      expect(metrics.totalDurationMs).toBe(1000);
      expect(metrics.firstTokenLatencyMs).toBe(100);
      expect(metrics.estimatedChunksPerSecond).toBe(4); // 4 chunks / 1 second
      expect(metrics.charactersPerSecond).toBe(25); // 25 chars / 1 second
    });

    it("returns zero throughput for zero-duration generation", () => {
      // Arrange: Same timestamp for start and end
      const clock = createFakeClock([0, 0]);
      const tracker = createGenerationMetricsTracker({clock, modelId: "test-model"});

      // Act
      tracker.onStart();
      const metrics = tracker.onEnd();

      // Assert
      expect(metrics.totalDurationMs).toBe(0);
      expect(metrics.estimatedChunksPerSecond).toBe(0);
      expect(metrics.charactersPerSecond).toBe(0);
    });

    it("ignores empty chunks in count but tracks timestamp", () => {
      // Arrange
      // Timeline: start(0ms) -> empty(skip) -> "A"(100ms) -> empty(skip) -> "B"(200ms) -> end(300ms)
      const clock = createFakeClock([0, 100, 200, 300]);
      const tracker = createGenerationMetricsTracker({clock, modelId: "test-model"});

      // Act
      tracker.onStart(); // 0ms
      tracker.onChunk(""); // Empty chunk - doesn't trigger firstToken timestamp
      tracker.onChunk("A"); // First real token at 100ms
      tracker.onChunk(""); // Another empty - no timestamp
      tracker.onChunk("B"); // Second real token at 200ms
      const metrics = tracker.onEnd(); // 300ms

      // Assert
      expect(metrics.chunkCount).toBe(2); // Only non-empty chunks
      expect(metrics.characterCount).toBe(2); // 'A' + 'B'
      expect(metrics.firstTokenLatencyMs).toBe(100); // First non-empty chunk at 100ms
    });

    it("handles generation with no chunks", () => {
      // Arrange: Start and end with no tokens
      const clock = createFakeClock([0, 500]);
      const tracker = createGenerationMetricsTracker({clock, modelId: "test-model"});

      // Act
      tracker.onStart();
      const metrics = tracker.onEnd();

      // Assert
      expect(metrics.chunkCount).toBe(0);
      expect(metrics.characterCount).toBe(0);
      expect(metrics.firstTokenLatencyMs).toBe(500); // Falls back to end time
      expect(metrics.totalDurationMs).toBe(500);
    });

    it("stores model ID in metrics", () => {
      // Arrange
      const clock = createFakeClock([0, 1000]);
      const tracker = createGenerationMetricsTracker({
        clock,
        modelId: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
      });

      // Act
      tracker.onStart();
      tracker.onChunk("Test");
      const metrics = tracker.onEnd();

      // Assert
      expect(metrics.modelId).toBe("Llama-3.2-1B-Instruct-q4f16_1-MLC");
    });

    it("uses default performance.now() clock when none provided", () => {
      // Arrange
      const tracker = createGenerationMetricsTracker({modelId: "test-model"});

      // Act
      tracker.onStart();
      tracker.onChunk("Test");
      const metrics = tracker.onEnd();

      // Assert: Metrics should have non-zero duration from real clock
      expect(metrics.totalDurationMs).toBeGreaterThanOrEqual(0);
      expect(metrics.firstTokenLatencyMs).toBeGreaterThanOrEqual(0);
    });

    it("ignores chunks received after onEnd()", () => {
      // Arrange
      const clock = createFakeClock([0, 100, 200, 300]);
      const tracker = createGenerationMetricsTracker({clock, modelId: "test-model"});

      // Act
      tracker.onStart();
      tracker.onChunk("Before");
      const metrics = tracker.onEnd();
      tracker.onChunk("After"); // Should be ignored

      // Assert: Metrics frozen at onEnd()
      expect(metrics.chunkCount).toBe(1);
      expect(metrics.characterCount).toBe(6); // Only "Before"
    });

    it("resets state when onStart() called again", () => {
      // Arrange
      const clock = createFakeClock([0, 100, 200, 1000, 1100, 1200]);
      const tracker = createGenerationMetricsTracker({clock, modelId: "test-model"});

      // Act: First generation
      tracker.onStart();
      tracker.onChunk("First");
      const firstMetrics = tracker.onEnd();

      // Act: Second generation (reuse tracker)
      tracker.onStart();
      tracker.onChunk("Second");
      const secondMetrics = tracker.onEnd();

      // Assert: Second generation has fresh metrics
      expect(firstMetrics.characterCount).toBe(5); // "First"
      expect(secondMetrics.characterCount).toBe(6); // "Second"
      expect(secondMetrics.totalDurationMs).toBe(200); // 1200 - 1000
    });

    it("calculates high throughput correctly", () => {
      // Arrange: Clock is called on: onStart (1x), first chunk for firstToken (1x), onEnd (1x)
      // start at 0ms, first chunk at 5ms, end at 500ms
      const timestamps = [0, 5, 500]; // onStart, first chunk firstToken, onEnd
      const clock = createFakeClock(timestamps);
      const tracker = createGenerationMetricsTracker({clock, modelId: "fast-model"});

      // Act
      tracker.onStart(); // 0ms
      for (let i = 0; i < 100; i++) {
        tracker.onChunk("X"); // First chunk triggers firstToken clock call at 5ms, rest don't
      }
      const metrics = tracker.onEnd(); // 500ms

      // Assert
      expect(metrics.chunkCount).toBe(100);
      expect(metrics.totalDurationMs).toBe(500);
      expect(metrics.firstTokenLatencyMs).toBe(5);
      expect(metrics.estimatedChunksPerSecond).toBe(200); // 100 / 0.5
    });
  });

  describe("DEFAULT_PERFORMANCE_CLOCK", () => {
    it("returns monotonically increasing timestamps", () => {
      // Act
      const t1 = DEFAULT_PERFORMANCE_CLOCK.now();
      const t2 = DEFAULT_PERFORMANCE_CLOCK.now();

      // Assert
      expect(t2).toBeGreaterThanOrEqual(t1);
    });
  });
});
