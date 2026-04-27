/**
 * @fileoverview Capability snapshot for the Web Worker foundation.
 * @module workers/host/workerCapabilities
 *
 * @remarks
 * Sampled once at host construction. Workers read the same shape from the
 * bootstrap message so they can branch on, e.g., `crossOriginIsolated` for
 * SharedArrayBuffer-aware code paths.
 */

/** Browser capabilities relevant to worker code. */
export type WorkerCapabilities = Readonly<{
  /**
   * True when the document is cross-origin isolated.
   * If true, workers can use `SharedArrayBuffer`, `Atomics`, and high-resolution
   * `performance.now()`. Currently always `false` in this site (see spec D4).
   */
  crossOriginIsolated: boolean;

  /** Logical CPU cores reported by `navigator.hardwareConcurrency`. */
  hardwareConcurrency?: number;

  /**
   * Approximate device memory in GB.
   * Chromium-only signal; undefined elsewhere.
   */
  deviceMemory?: number;

  /**
   * Whether `navigator.gpu` exists.
   * Note: this is "WebGPU surface present", not "an adapter is available".
   * Adapter requests can still fail at runtime.
   */
  hasWebGpu: boolean;
}>;

/**
 * Sample capabilities from the current global scope.
 * Safe to call at any time (returns a snapshot, not a live view).
 */
export function getCapabilities(): WorkerCapabilities {
  const nav = (globalThis as {navigator?: Navigator & {deviceMemory?: number; gpu?: unknown}}).navigator;
  const isolated = (globalThis as {crossOriginIsolated?: boolean}).crossOriginIsolated === true;

  const result: {-readonly [K in keyof WorkerCapabilities]: WorkerCapabilities[K]} = {
    crossOriginIsolated: isolated,
    hasWebGpu: nav?.gpu !== undefined && nav?.gpu !== null,
  };

  if (typeof nav?.hardwareConcurrency === "number") {
    result.hardwareConcurrency = nav.hardwareConcurrency;
  }
  if (typeof nav?.deviceMemory === "number") {
    result.deviceMemory = nav.deviceMemory;
  }

  return result;
}
