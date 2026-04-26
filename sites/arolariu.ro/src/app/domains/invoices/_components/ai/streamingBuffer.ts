/**
 * @fileoverview Streaming response buffer for optimized token coalescing.
 *
 * Accumulates streamed tokens and flushes them in batches to reduce React re-renders
 * during LLM response streaming.
 *
 * @module app/domains/invoices/_components/ai/streamingBuffer
 */

/**
 * Scheduler interface for flush timing control.
 *
 * @remarks
 * Abstraction allows deterministic testing without real timers.
 * Production implementation uses requestAnimationFrame.
 */
type StreamingScheduler = Readonly<{
  /**
   * Cancels a previously scheduled flush.
   *
   * @param id - Flush identifier returned by schedule.
   */
  cancel: (id: number) => void;
  /**
   * Schedules a flush callback.
   *
   * @param callback - Function to execute on flush.
   * @returns Flush identifier for cancellation.
   */
  schedule: (callback: () => void) => number;
}>;

/**
 * Input for creating streaming response buffer.
 */
type CreateStreamingResponseBufferInput = Readonly<{
  /**
   * Flushes accumulated content to consumer.
   *
   * @param content - Accumulated streamed text.
   */
  flush: (content: string) => void;
}> &
  StreamingScheduler;

/**
 * Streaming response buffer API.
 */
type StreamingResponseBuffer = Readonly<{
  /**
   * Appends a token chunk to the buffer.
   *
   * @param chunk - Text chunk to accumulate.
   *
   * @remarks
   * Schedules at most one pending flush. Subsequent appends before flush executes
   * will accumulate without additional scheduling.
   */
  append: (chunk: string) => void;
  /**
   * Flushes accumulated content immediately and clears buffer.
   *
   * @remarks
   * Cancels any pending scheduled flush. Use before returning to ready state
   * to ensure final response is visible.
   */
  forceFlush: () => void;
  /**
   * Cancels pending flush and discards accumulated content.
   *
   * @remarks
   * Use on generation interrupt or component unmount. Already-flushed content
   * remains visible.
   */
  interrupt: () => void;
}>;

/**
 * Creates a streaming response buffer for token coalescing.
 *
 * @param input - Flush callback and scheduler implementation.
 * @returns Buffer API for appending tokens, forcing flush, and handling interrupts.
 *
 * @remarks
 * **Design:**
 * - Accumulates tokens in-memory without triggering React renders
 * - Schedules at most one pending flush per animation frame
 * - Forces final flush before lifecycle returns to ready
 * - Cancels pending flushes on interrupt/unmount
 *
 * **Usage pattern:**
 * 1. onToken callback → buffer.append(token)
 * 2. Scheduler executes → flush(accumulated)
 * 3. Final response → buffer.forceFlush()
 * 4. Interrupt → buffer.interrupt()
 *
 * @example
 * ```typescript
 * const buffer = createStreamingResponseBuffer({
 *   cancel: cancelAnimationFrame,
 *   flush: (content) => setState({message: content}),
 *   schedule: requestAnimationFrame,
 * });
 *
 * adapter.generate(messages, {
 *   onToken: (token) => buffer.append(token),
 * }).then((final) => {
 *   buffer.forceFlush();
 *   setState({lifecycle: 'ready'});
 * });
 * ```
 */
export function createStreamingResponseBuffer(input: CreateStreamingResponseBufferInput): StreamingResponseBuffer {
  let accumulated = "";
  let pendingFlushId: number | null = null;
  let isInterrupted = false;

  const executePendingFlush = (): void => {
    if (isInterrupted || !accumulated) {
      pendingFlushId = null;

      return;
    }

    const content = accumulated;
    accumulated = "";
    pendingFlushId = null;
    input.flush(content);
  };

  const append = (chunk: string): void => {
    if (isInterrupted) {
      return;
    }

    accumulated += chunk;

    if (pendingFlushId === null) {
      pendingFlushId = input.schedule(executePendingFlush);
    }
  };

  const forceFlush = (): void => {
    if (pendingFlushId !== null) {
      input.cancel(pendingFlushId);
      pendingFlushId = null;
    }

    if (!accumulated || isInterrupted) {
      return;
    }

    const content = accumulated;
    accumulated = "";
    input.flush(content);
  };

  const interrupt = (): void => {
    isInterrupted = true;

    if (pendingFlushId !== null) {
      input.cancel(pendingFlushId);
      pendingFlushId = null;
    }

    accumulated = "";
  };

  return {
    append,
    forceFlush,
    interrupt,
  };
}
