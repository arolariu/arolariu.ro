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

const STORAGE_QUOTA_MIN_BYTES = 2_000_000_000; // 2 GB free
const DEVICE_MEMORY_MIN_GB = 4;
const CPU_MIN_LOGICAL_CORES = 4;

export type HardwareEligibilityReason =
  | "workers-unavailable"
  | "webgpu-unavailable"
  | "webgpu-adapter-unavailable"
  | "storage-quota-too-low"
  | "memory-too-low"
  | "cpu-too-low";

export type HardwareEligibilityResult = Readonly<{
  status: "eligible" | "ineligible" | "unknown";
  reasons: ReadonlyArray<HardwareEligibilityReason>;
}>;

export async function checkHardwareEligibility(): Promise<HardwareEligibilityResult> {
  const reasons: HardwareEligibilityReason[] = [];

  // Hard gates first.
  if (typeof (globalThis as {Worker?: unknown}).Worker === "undefined") {
    return {status: "ineligible", reasons: ["workers-unavailable"]};
  }

  const nav = (globalThis as {navigator?: Navigator & {gpu?: {requestAdapter?: () => Promise<unknown>}; deviceMemory?: number; storage?: {estimate?: () => Promise<{quota?: number; usage?: number}>}}}).navigator;
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
