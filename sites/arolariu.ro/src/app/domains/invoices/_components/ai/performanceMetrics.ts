/**
 * @fileoverview Performance metrics calculation for local invoice AI assistant.
 *
 * Provides deterministic calculations for tracking LLM generation performance:
 * first-token latency, total throughput, and estimated tokens/sec.
 *
 * @module app/domains/invoices/_components/ai/performanceMetrics
 */

/**
 * Clock interface for testable time measurements.
 *
 * @remarks
 * Injectable dependency allowing deterministic tests with fake time.
 */
export type PerformanceClock = Readonly<{
  /** Returns current high-resolution time in milliseconds. */
  now: () => number;
}>;

/**
 * Default clock using browser's performance.now() API.
 */
export const DEFAULT_PERFORMANCE_CLOCK: PerformanceClock = {
  now: () => performance.now(),
} as const;

/**
 * Input parameters for tracking a generation session.
 */
export type GenerationMetricsTrackerInput = Readonly<{
  /** Injectable clock for tests (defaults to performance.now()). */
  clock?: PerformanceClock;
  /** Model ID being benchmarked. */
  modelId: string;
}>;

/**
 * Accumulated state during a generation session.
 *
 * @internal
 */
type GenerationMetricsAccumulator = {
  /** Total characters streamed. */
  characterCount: number;
  /** Total chunks/deltas received. */
  chunkCount: number;
  /** Time when generation ended (null if not completed). */
  endTimeMs: number | null;
  /** Time when first token arrived (null if none yet). */
  firstTokenTimeMs: number | null;
  /** Model ID. */
  modelId: string;
  /** Time when generation started. */
  startTimeMs: number;
};

/**
 * Final calculated metrics after generation completes.
 */
export type GenerationMetrics = Readonly<{
  /** Total characters generated. */
  characterCount: number;
  /** Characters per second throughput. */
  charactersPerSecond: number;
  /** Total chunks/deltas received (proxy for token count). */
  chunkCount: number;
  /** Estimated chunks (tokens) per second. */
  estimatedChunksPerSecond: number;
  /** Time to first token in milliseconds. */
  firstTokenLatencyMs: number;
  /** Model ID used for generation. */
  modelId: string;
  /** Total generation duration in milliseconds. */
  totalDurationMs: number;
}>;

/**
 * Generation metrics tracker interface.
 *
 * @remarks
 * Lifecycle: `onStart()` → `onChunk()` (repeated) → `onEnd()` → `getMetrics()`
 */
export type GenerationMetricsTracker = Readonly<{
  /** Records a streamed chunk/delta. */
  onChunk: (chunk: string) => void;
  /** Marks generation end and returns final metrics. */
  onEnd: () => GenerationMetrics;
  /** Marks generation start. */
  onStart: () => void;
}>;

/**
 * Creates a generation metrics tracker.
 *
 * @param input - Model ID and optional clock for tests.
 * @returns Tracker for recording streaming generation metrics.
 *
 * @remarks
 * **Usage pattern:**
 * ```typescript
 * const tracker = createGenerationMetricsTracker({modelId: 'llama-3.2-1b'});
 * tracker.onStart();
 * // ... stream chunks via tracker.onChunk(chunk)
 * const metrics = tracker.onEnd();
 * console.log(metrics.estimatedChunksPerSecond);
 * ```
 *
 * **Metric definitions:**
 * - `firstTokenLatencyMs`: Time from `onStart()` to first `onChunk()`
 * - `totalDurationMs`: Time from `onStart()` to `onEnd()`
 * - `chunkCount`: Number of non-empty chunks received
 * - `characterCount`: Total characters across all chunks
 * - `estimatedChunksPerSecond`: `chunkCount / (totalDurationMs / 1000)`
 * - `charactersPerSecond`: `characterCount / (totalDurationMs / 1000)`
 *
 * **Limitations:**
 * - Chunk count is a proxy for tokens (WebLLM may not expose true token usage)
 * - Label as "estimated" in UI when true token count unavailable
 * - Zero-duration generations return Infinity throughput (guard in UI)
 *
 * @example
 * ```typescript
 * const tracker = createGenerationMetricsTracker({modelId: 'qwen-2.5-0.5b'});
 * tracker.onStart();
 * tracker.onChunk('Hello ');
 * tracker.onChunk('world');
 * const metrics = tracker.onEnd();
 * // metrics.characterCount === 11
 * // metrics.chunkCount === 2
 * ```
 */
export function createGenerationMetricsTracker(input: GenerationMetricsTrackerInput): GenerationMetricsTracker {
  const clock = input.clock ?? DEFAULT_PERFORMANCE_CLOCK;
  const accumulator: GenerationMetricsAccumulator = {
    characterCount: 0,
    chunkCount: 0,
    endTimeMs: null,
    firstTokenTimeMs: null,
    modelId: input.modelId,
    startTimeMs: 0,
  };

  return {
    onChunk(chunk: string): void {
      if (accumulator.endTimeMs !== null) {
        return; // Ignore chunks after onEnd()
      }

      if (accumulator.firstTokenTimeMs === null && chunk.length > 0) {
        accumulator.firstTokenTimeMs = clock.now();
      }

      if (chunk.length > 0) {
        accumulator.chunkCount += 1;
        accumulator.characterCount += chunk.length;
      }
    },

    onEnd(): GenerationMetrics {
      accumulator.endTimeMs = clock.now();

      const totalDurationMs = accumulator.endTimeMs - accumulator.startTimeMs;
      const firstTokenLatencyMs = (accumulator.firstTokenTimeMs ?? accumulator.endTimeMs) - accumulator.startTimeMs;
      const totalDurationSeconds = totalDurationMs / 1000;

      return {
        characterCount: accumulator.characterCount,
        charactersPerSecond: totalDurationSeconds > 0 ? accumulator.characterCount / totalDurationSeconds : 0,
        chunkCount: accumulator.chunkCount,
        estimatedChunksPerSecond: totalDurationSeconds > 0 ? accumulator.chunkCount / totalDurationSeconds : 0,
        firstTokenLatencyMs,
        modelId: accumulator.modelId,
        totalDurationMs,
      };
    },

    onStart(): void {
      accumulator.startTimeMs = clock.now();
      accumulator.endTimeMs = null;
      accumulator.firstTokenTimeMs = null;
      accumulator.chunkCount = 0;
      accumulator.characterCount = 0;
    },
  };
}
