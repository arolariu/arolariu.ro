/**
 * @fileoverview Hardware capability checking for client-only invoice AI assistant.
 *
 * Analyzes browser environment (WebGPU, storage, CPU, memory) to determine
 * if the device can run local LLM inference before suggesting model downloads.
 *
 * @module app/domains/invoices/_components/ai/hardwareEligibility
 */

/**
 * Conversion constant: bytes per gibibyte (1 GiB = 1024^3 bytes).
 */
const BYTES_PER_GIB = 1024 ** 3;

/**
 * Default hardware requirements for local invoice AI assistant.
 *
 * @remarks
 * These thresholds gate model download suggestions:
 * - 6 GiB available storage for model artifacts and KV cache
 * - 4 GB device memory (via `navigator.deviceMemory`)
 * - 4 logical CPU cores (via `navigator.hardwareConcurrency`)
 *
 * @example
 * ```typescript
 * const result = await analyzeLocalAiHardwareEligibility({
 *   requirements: DEFAULT_LOCAL_AI_HARDWARE_REQUIREMENTS
 * });
 * ```
 */
export const DEFAULT_LOCAL_AI_HARDWARE_REQUIREMENTS = {
  minimumAvailableStorageBytes: 6 * BYTES_PER_GIB,
  minimumDeviceMemoryGB: 4,
  minimumLogicalCores: 4,
} as const satisfies LocalAiHardwareRequirements;

/**
 * Reason why hardware eligibility check failed or returned unknown status.
 *
 * @remarks
 * - `browser-unavailable`: `navigator` not present (SSR or non-browser)
 * - `cpu-too-low`: Fewer logical cores than required
 * - `cpu-unknown`: `navigator.hardwareConcurrency` unavailable
 * - `memory-too-low`: Device memory below threshold
 * - `memory-unknown`: `navigator.deviceMemory` unavailable
 * - `storage-estimate-unavailable`: Storage API unavailable or quota check failed
 * - `storage-quota-too-low`: Available storage below requirement
 * - `webgpu-adapter-unavailable`: WebGPU API present but adapter request failed
 * - `webgpu-unavailable`: `navigator.gpu` not present
 * - `workers-unavailable`: Web Workers not supported
 */
export type HardwareEligibilityReason =
  | "browser-unavailable"
  | "cpu-too-low"
  | "cpu-unknown"
  | "memory-too-low"
  | "memory-unknown"
  | "storage-estimate-unavailable"
  | "storage-quota-too-low"
  | "webgpu-adapter-unavailable"
  | "webgpu-unavailable"
  | "workers-unavailable";

/**
 * Overall hardware eligibility status for local AI assistant.
 *
 * @remarks
 * - `eligible`: All requirements met, model download safe to offer
 * - `ineligible`: One or more hard requirements failed
 * - `unknown`: Some capabilities unavailable (e.g., `deviceMemory` not exposed)
 */
export type HardwareEligibilityStatus = "eligible" | "ineligible" | "unknown";

/**
 * Hardware requirement thresholds for local AI assistant.
 */
export type LocalAiHardwareRequirements = Readonly<{
  /** Minimum available storage in bytes for model artifacts. */
  minimumAvailableStorageBytes: number;
  /** Minimum device memory in gigabytes (from `navigator.deviceMemory`). */
  minimumDeviceMemoryGB: number;
  /** Minimum logical CPU cores (from `navigator.hardwareConcurrency`). */
  minimumLogicalCores: number;
}>;

/**
 * Subset of WebGPU API used for adapter availability check.
 */
type WebGpuLike = Readonly<{
  requestAdapter: () => Promise<unknown | null>;
}>;

/**
 * Subset of StorageManager API used for quota estimation.
 */
type StorageManagerLike = Readonly<{
  estimate: () => Promise<StorageEstimate>;
}>;

/**
 * Extended browser navigator interface with AI-relevant capability hints.
 *
 * @remarks
 * Not all browsers expose `deviceMemory` or `gpu`. Unavailable properties
 * result in `unknown` status rather than immediate ineligibility.
 */
export type LocalAiHardwareNavigator = Readonly<{
  /** Device memory in GB (Device Memory API, Chrome-only). */
  deviceMemory?: number;
  /** WebGPU API for GPU adapter check. */
  gpu?: WebGpuLike;
  /** Logical processor cores estimate. */
  hardwareConcurrency?: number;
  /** Storage quota API. */
  storage?: StorageManagerLike;
}>;

/**
 * Injectable environment for hardware eligibility analysis (testable).
 */
export type HardwareEligibilityEnvironment = Readonly<{
  /** Browser navigator with capability hints. */
  navigator?: LocalAiHardwareNavigator;
  /** Web Worker constructor presence check. */
  Worker?: typeof Worker;
}>;

/**
 * Hardware eligibility analysis result.
 *
 * @remarks
 * Use `status` for primary decision-making and `reasons` for user messaging.
 * `availableStorageBytes` populated when storage API succeeds.
 */
export type HardwareEligibilityResult = Readonly<{
  /** Available storage in bytes (if determinable). */
  availableStorageBytes?: number;
  /** List of ineligibility or unknown reasons (empty if eligible). */
  reasons: ReadonlyArray<HardwareEligibilityReason>;
  /** Hardware requirements used for analysis. */
  requirements: LocalAiHardwareRequirements;
  /** Overall eligibility status. */
  status: HardwareEligibilityStatus;
}>;

/**
 * Input options for hardware eligibility analysis.
 */
type AnalyzeHardwareEligibilityInput = Readonly<{
  /** Optional injectable environment for testing (defaults to browser globals). */
  environment?: HardwareEligibilityEnvironment;
  /** Custom hardware requirements (defaults to `DEFAULT_LOCAL_AI_HARDWARE_REQUIREMENTS`). */
  requirements?: LocalAiHardwareRequirements;
}>;

/**
 * Storage availability check result (known or unknown).
 *
 * @remarks
 * Returns `unknown` if Storage API unavailable or estimate fails.
 */
type StorageAvailabilityResult =
  | Readonly<{
      availableStorageBytes: number;
      status: "known";
    }>
  | Readonly<{
      status: "unknown";
    }>;

/**
 * Storage capability analysis with optional ineligibility reason.
 */
type StorageCapabilityResult = Readonly<{
  /** Available storage bytes (if known). */
  availableStorageBytes?: number;
  /** Ineligibility reason if storage check failed. */
  ineligibleReason?: "storage-estimate-unavailable" | "storage-quota-too-low";
}>;

function createResult(
  status: HardwareEligibilityStatus,
  reasons: ReadonlyArray<HardwareEligibilityReason>,
  requirements: LocalAiHardwareRequirements,
  availableStorageBytes?: number,
): HardwareEligibilityResult {
  const result: {
    availableStorageBytes?: number;
    reasons: ReadonlyArray<HardwareEligibilityReason>;
    requirements: LocalAiHardwareRequirements;
    status: HardwareEligibilityStatus;
  } = {
    reasons,
    requirements,
    status,
  };

  if (typeof availableStorageBytes === "number") {
    result.availableStorageBytes = availableStorageBytes;
  }

  return result;
}

function getDefaultHardwareEligibilityEnvironment(): HardwareEligibilityEnvironment {
  const environment: {
    navigator?: LocalAiHardwareNavigator;
    Worker?: typeof Worker;
  } = {};

  if (typeof globalThis.navigator !== "undefined") {
    environment.navigator = globalThis.navigator as LocalAiHardwareNavigator;
  }

  if (typeof globalThis.Worker !== "undefined") {
    environment.Worker = globalThis.Worker;
  }

  return environment;
}

async function getAvailableStorageBytes(storage: StorageManagerLike | undefined): Promise<StorageAvailabilityResult> {
  if (!storage) {
    return {status: "unknown"};
  }

  try {
    const estimate = await storage.estimate();
    if (typeof estimate.quota !== "number") {
      return {status: "unknown"};
    }

    return {
      availableStorageBytes: estimate.quota - (estimate.usage ?? 0),
      status: "known",
    };
  } catch {
    return {status: "unknown"};
  }
}

function collectStorageCapabilityReason(
  storageResult: StorageAvailabilityResult,
  requirements: LocalAiHardwareRequirements,
): StorageCapabilityResult {
  if (storageResult.status === "unknown") {
    return {ineligibleReason: "storage-estimate-unavailable"};
  }

  const {availableStorageBytes} = storageResult;
  if (availableStorageBytes < requirements.minimumAvailableStorageBytes) {
    return {availableStorageBytes, ineligibleReason: "storage-quota-too-low"};
  }

  return {availableStorageBytes};
}

async function collectGpuIneligibleReason(navigator: LocalAiHardwareNavigator): Promise<HardwareEligibilityReason | null> {
  if (navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      return adapter ? null : "webgpu-adapter-unavailable";
    } catch {
      return "webgpu-adapter-unavailable";
    }
  }

  return "webgpu-unavailable";
}

function collectMemoryReason(
  navigator: LocalAiHardwareNavigator,
  requirements: LocalAiHardwareRequirements,
): Readonly<{kind: "ineligible" | "unknown"; reason: HardwareEligibilityReason}> | null {
  const {deviceMemory} = navigator;
  if (typeof deviceMemory !== "number") {
    return {kind: "unknown", reason: "memory-unknown"};
  }

  return deviceMemory < requirements.minimumDeviceMemoryGB ? {kind: "ineligible", reason: "memory-too-low"} : null;
}

function collectCpuReason(
  navigator: LocalAiHardwareNavigator,
  requirements: LocalAiHardwareRequirements,
): Readonly<{kind: "ineligible" | "unknown"; reason: HardwareEligibilityReason}> | null {
  const {hardwareConcurrency} = navigator;
  if (typeof hardwareConcurrency !== "number") {
    return {kind: "unknown", reason: "cpu-unknown"};
  }

  return hardwareConcurrency < requirements.minimumLogicalCores ? {kind: "ineligible", reason: "cpu-too-low"} : null;
}

function pushCapabilityReason(
  reason: Readonly<{kind: "ineligible" | "unknown"; reason: HardwareEligibilityReason}> | null,
  ineligibleReasons: HardwareEligibilityReason[],
  unknownReasons: HardwareEligibilityReason[],
): void {
  if (!reason) {
    return;
  }

  if (reason.kind === "ineligible") {
    ineligibleReasons.push(reason.reason);
  } else {
    unknownReasons.push(reason.reason);
  }
}

/**
 * Analyzes browser/device hardware capabilities for local AI assistant eligibility.
 *
 * @param input - Optional testable environment and hardware thresholds.
 * @returns Hardware eligibility result with status, reasons, and available storage.
 *
 * @remarks
 * **Checks performed:**
 * 1. Browser environment availability (`navigator`, `Worker`)
 * 2. WebGPU adapter availability (`navigator.gpu.requestAdapter()`)
 * 3. Available storage quota (via `navigator.storage.estimate()`)
 * 4. Device memory (via `navigator.deviceMemory`, Chrome-only)
 * 5. Logical CPU cores (via `navigator.hardwareConcurrency`)
 *
 * **Status logic:**
 * - `ineligible`: One or more hard requirements failed (storage, WebGPU, Workers)
 * - `unknown`: Some hints unavailable (memory/CPU unknown) but no hard failures
 * - `eligible`: All requirements met
 *
 * **Privacy considerations:**
 * - Does not fingerprint user; only used client-side for local download decision
 * - Unknown capabilities treated as warnings, not blockers
 *
 * @example
 * ```typescript
 * const result = await analyzeLocalAiHardwareEligibility();
 * if (result.status === 'eligible') {
 *   // Offer model download
 * } else if (result.status === 'unknown') {
 *   // Show warning, allow user to proceed
 * } else {
 *   // Block download with reasons
 * }
 * ```
 */
export async function analyzeLocalAiHardwareEligibility(input: AnalyzeHardwareEligibilityInput = {}): Promise<HardwareEligibilityResult> {
  const requirements = input.requirements ?? DEFAULT_LOCAL_AI_HARDWARE_REQUIREMENTS;
  const environment = input.environment ?? getDefaultHardwareEligibilityEnvironment();
  const ineligibleReasons: HardwareEligibilityReason[] = [];
  const unknownReasons: HardwareEligibilityReason[] = [];

  if (!environment.navigator) {
    ineligibleReasons.push("browser-unavailable");
    return createResult("ineligible", ineligibleReasons, requirements);
  }

  if (environment.Worker) {
    // Worker support is available.
  } else {
    ineligibleReasons.push("workers-unavailable");
  }

  const gpuReason = await collectGpuIneligibleReason(environment.navigator);
  if (gpuReason) {
    ineligibleReasons.push(gpuReason);
  }

  const storageResult = await getAvailableStorageBytes(environment.navigator.storage);
  const storageReason = collectStorageCapabilityReason(storageResult, requirements);
  const {availableStorageBytes, ineligibleReason} = storageReason;

  if (ineligibleReason) {
    ineligibleReasons.push(ineligibleReason);
  }

  pushCapabilityReason(collectMemoryReason(environment.navigator, requirements), ineligibleReasons, unknownReasons);
  pushCapabilityReason(collectCpuReason(environment.navigator, requirements), ineligibleReasons, unknownReasons);

  if (ineligibleReasons.length > 0) {
    return createResult("ineligible", ineligibleReasons, requirements, availableStorageBytes);
  }

  if (unknownReasons.length > 0) {
    return createResult("unknown", unknownReasons, requirements, availableStorageBytes);
  }

  return createResult("eligible", [], requirements, availableStorageBytes);
}
