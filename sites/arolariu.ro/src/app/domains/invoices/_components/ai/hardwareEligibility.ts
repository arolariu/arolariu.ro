/**
 * @fileoverview Layer-2 (slot LLM) hardware eligibility gate.
 * @module app/domains/invoices/_components/ai/hardwareEligibility
 *
 * @remarks
 * Layer 1 (the embedding model) ships to every device on WASM and
 * does not need this check. This gate is consulted only when deciding
 * whether to OFFER the Layer 2 LLM opt-in CTA.
 *
 * SECURITY: All signals are read locally and NEVER transmitted.
 */

// Layer-2 model weight is ~1 GB; budget another ~1 GB for runtime/cache. 2 GB free minimum.
const STORAGE_QUOTA_MIN_BYTES = 2_000_000_000;
// Empirical floor below which inference latency degrades unacceptably for a 1.5B-param model.
const DEVICE_MEMORY_MIN_GB = 4;
// Inference + UI thread + worker host overhead. Anything less and the page stalls during decode.
const CPU_MIN_LOGICAL_CORES = 4;

/**
 * Machine-readable codes explaining why a device is ineligible for the
 * Layer-2 (in-browser slot LLM) opt-in CTA.
 *
 * @remarks
 * - `workers-unavailable`: Web Workers API or `globalThis.navigator` is absent.
 * - `webgpu-unavailable`: `navigator.gpu` is missing entirely.
 * - `webgpu-adapter-unavailable`: WebGPU is exposed but no adapter could be acquired
 *   (returned `null`, threw, or `requestAdapter` is not a callable function).
 * - `storage-quota-too-low`: Less than the 2 GB free-storage minimum is available;
 *   the model weights wouldn't fit.
 * - `memory-too-low`: `navigator.deviceMemory` reported a value below the 4 GB floor.
 * - `cpu-too-low`: `navigator.hardwareConcurrency` reported fewer than 4 logical cores.
 */
export type HardwareEligibilityReason =
  | "workers-unavailable"
  | "webgpu-unavailable"
  | "webgpu-adapter-unavailable"
  | "storage-quota-too-low"
  | "memory-too-low"
  | "cpu-too-low";

/**
 * Outcome of a hardware-eligibility probe.
 *
 * @remarks
 * - `eligible`: All hard gates passed AND at least one soft signal was reported.
 * - `ineligible`: At least one gate failed; see `reasons` for codes.
 * - `unknown`: All hard gates passed but neither soft signal (RAM, CPU) was
 *   reported by the browser. The Layer-2 CTA SHOULD still be offered with a
 *   "best-effort" disclaimer in this case.
 */
export type HardwareEligibilityResult = Readonly<{
  status: "eligible" | "ineligible" | "unknown";
  reasons: ReadonlyArray<HardwareEligibilityReason>;
}>;

interface NavigatorWithHardwareHints extends Navigator {
  readonly gpu?: {requestAdapter?: () => Promise<unknown>};
  readonly deviceMemory?: number;
  readonly storage?: {estimate?: () => Promise<{quota?: number; usage?: number}>};
}

/**
 * Probes the current device for the hardware capabilities required to run the
 * Layer-2 in-browser slot LLM (~1 GB Qwen-1.5B over WebGPU).
 *
 * @remarks
 * SECURITY: All signals are read locally via standard browser APIs and are
 * NEVER transmitted to any remote service. This function is client-side only;
 * calling it on the server returns
 * `{status: "ineligible", reasons: ["workers-unavailable"]}` because `Worker`
 * is undefined in Node.
 *
 * Layer 1 (the multilingual embedding model on WASM) ships to every device and
 * does NOT consult this gate. Use the result here only to decide whether to
 * surface the Layer-2 opt-in CTA.
 *
 * @returns A {@link HardwareEligibilityResult} describing eligibility status
 *   and any failing-gate codes.
 */
export async function checkHardwareEligibility(): Promise<HardwareEligibilityResult> {
  const reasons: HardwareEligibilityReason[] = [];

  // Hard gates first.
  if (typeof (globalThis as {Worker?: unknown}).Worker === "undefined") {
    return {status: "ineligible", reasons: ["workers-unavailable"]};
  }

  const nav = (globalThis as {navigator?: NavigatorWithHardwareHints}).navigator;
  if (!nav) {
    return {status: "ineligible", reasons: ["workers-unavailable"]};
  }

  if (!nav.gpu) {
    reasons.push("webgpu-unavailable");
  } else if (typeof nav.gpu.requestAdapter === "function") {
    try {
      const adapter = await nav.gpu.requestAdapter();
      if (adapter == null) reasons.push("webgpu-adapter-unavailable");
    } catch {
      reasons.push("webgpu-adapter-unavailable");
    }
  } else {
    // gpu object exists but requestAdapter is not callable (partial polyfill / future API drift).
    reasons.push("webgpu-adapter-unavailable");
  }

  if (nav.storage?.estimate) {
    try {
      const {quota = 0, usage = 0} = await nav.storage.estimate();
      const free = quota - usage;
      if (free < STORAGE_QUOTA_MIN_BYTES) reasons.push("storage-quota-too-low");
    } catch {
      // Estimate failure isn't a hard fail — storage is optional info.
    }
  }

  // Soft gates: only trigger when value is reported AND below threshold.
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory < DEVICE_MEMORY_MIN_GB) {
    reasons.push("memory-too-low");
  }
  if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency < CPU_MIN_LOGICAL_CORES) {
    reasons.push("cpu-too-low");
  }

  if (reasons.length > 0) return {status: "ineligible", reasons};

  // No failures, but if both soft signals are missing, status is unknown.
  const memoryReported = typeof nav.deviceMemory === "number";
  const cpuReported = typeof nav.hardwareConcurrency === "number";
  if (!memoryReported && !cpuReported) {
    return {status: "unknown", reasons: []};
  }

  return {status: "eligible", reasons: []};
}