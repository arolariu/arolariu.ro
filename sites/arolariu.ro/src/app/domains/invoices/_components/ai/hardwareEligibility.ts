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
 * Maximum time to wait for browser capability probes before recovering.
 *
 * @remarks
 * Some WebGPU drivers or storage implementations can leave capability probes
 * pending indefinitely. The assistant must surface an actionable status instead
 * of keeping the user on the hardware-checking screen forever.
 */
const HARDWARE_CAPABILITY_PROBE_TIMEOUT_MS = 3000;

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
  requestAdapter: () => Promise<WebGpuAdapterLike | null>;
}>;

/**
 * Subset of WebGPU adapter with safe capability information.
 *
 * @remarks
 * Only collects feature flags and resource limits needed for model selection.
 * Does NOT collect vendor ID, device ID, or adapter name to avoid fingerprinting.
 */
type WebGpuAdapterLike = Readonly<{
  /** GPU feature flags (e.g., shader-f16). */
  features?: ReadonlySet<string>;
  /** GPU resource limits. */
  limits?: Readonly<{
    /** Maximum buffer size in bytes. */
    maxBufferSize?: number;
    /** Maximum storage buffer binding size in bytes. */
    maxStorageBufferBindingSize?: number;
  }>;
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
 *
 * **Privacy-preserving enrichment (Task 3):**
 * - `gpu`: Safe GPU capability data (features, limits) without vendor/device IDs
 * - `device`: Coarse device capabilities (memory GB, logical cores)
 */
export type HardwareEligibilityResult = Readonly<{
  /** Available storage in bytes (if determinable). */
  availableStorageBytes?: number;
  /** Device capability hints (memory, cores). */
  device?: Readonly<{
    /** Device memory in gigabytes (if available). */
    deviceMemoryGB?: number;
    /** Logical processor cores (if available). */
    logicalCores?: number;
  }>;
  /** GPU capability data without fingerprintable identity. */
  gpu?: Readonly<{
    /** GPU feature flags (e.g., shader-f16). */
    features: ReadonlyArray<string>;
    /** GPU resource limits. */
    limits: Readonly<{
      /** Maximum buffer size in bytes. */
      maxBufferSize?: number;
      /** Maximum storage buffer binding size in bytes. */
      maxStorageBufferBindingSize?: number;
    }>;
  }>;
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
 * Storage capability analysis with optional warning reason.
 *
 * @remarks
 * Task 3: storage-estimate-unavailable is now treated as "unknown" (warning)
 * rather than "ineligible" (blocker). Only storage-quota-too-low is ineligible.
 */
type StorageCapabilityResult = Readonly<{
  /** Available storage bytes (if known). */
  availableStorageBytes?: number;
  /** Ineligibility reason if storage quota is too low. */
  ineligibleReason?: "storage-quota-too-low";
  /** Unknown/warning reason if storage estimate is unavailable. */
  unknownReason?: "storage-estimate-unavailable";
}>;

function createResult(
  status: HardwareEligibilityStatus,
  reasons: ReadonlyArray<HardwareEligibilityReason>,
  requirements: LocalAiHardwareRequirements,
  options?: Readonly<{
    availableStorageBytes?: number;
    device?: Readonly<{
      deviceMemoryGB?: number;
      logicalCores?: number;
    }>;
    gpu?: Readonly<{
      features: ReadonlyArray<string>;
      limits: Readonly<{
        maxBufferSize?: number;
        maxStorageBufferBindingSize?: number;
      }>;
    }>;
  }>,
): HardwareEligibilityResult {
  const result: {
    availableStorageBytes?: number;
    device?: Readonly<{
      deviceMemoryGB?: number;
      logicalCores?: number;
    }>;
    gpu?: Readonly<{
      features: ReadonlyArray<string>;
      limits: Readonly<{
        maxBufferSize?: number;
        maxStorageBufferBindingSize?: number;
      }>;
    }>;
    reasons: ReadonlyArray<HardwareEligibilityReason>;
    requirements: LocalAiHardwareRequirements;
    status: HardwareEligibilityStatus;
  } = {
    reasons,
    requirements,
    status,
  };

  if (options?.availableStorageBytes !== undefined) {
    result.availableStorageBytes = options.availableStorageBytes;
  }

  if (options?.gpu !== undefined) {
    result.gpu = options.gpu;
  }

  if (options?.device !== undefined) {
    result.device = options.device;
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
    const estimate = await withHardwareProbeTimeout(storage.estimate());
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

async function withHardwareProbeTimeout<T>(operation: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
      timeoutId = undefined;
      reject(new Error("Hardware capability probe timed out."));
    }, HARDWARE_CAPABILITY_PROBE_TIMEOUT_MS);

    operation.then(
      (value) => {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }

        resolve(value);
      },
      (error: unknown) => {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }

        reject(error);
      },
    );
  });
}

function collectStorageCapabilityReason(
  storageResult: StorageAvailabilityResult,
  requirements: LocalAiHardwareRequirements,
): StorageCapabilityResult {
  if (storageResult.status === "unknown") {
    // Task 3: storage-estimate-unavailable is now a warning (unknown), not blocker
    return {unknownReason: "storage-estimate-unavailable"};
  }

  const {availableStorageBytes} = storageResult;
  if (availableStorageBytes < requirements.minimumAvailableStorageBytes) {
    return {availableStorageBytes, ineligibleReason: "storage-quota-too-low"};
  }

  return {availableStorageBytes};
}

/**
 * GPU capability collection result.
 */
type GpuCapabilityResult = Readonly<{
  /** Enriched GPU data (features, limits) if adapter available. */
  gpu?: Readonly<{
    features: ReadonlyArray<string>;
    limits: Readonly<{
      maxBufferSize?: number;
      maxStorageBufferBindingSize?: number;
    }>;
  }>;
  /** Ineligibility reason if GPU check failed. */
  ineligibleReason?: HardwareEligibilityReason;
}>;

/**
 * Device capability collection result.
 */
type DeviceCapabilityResult = Readonly<{
  deviceMemoryGB?: number;
  logicalCores?: number;
}>;

async function collectGpuCapability(navigator: LocalAiHardwareNavigator): Promise<GpuCapabilityResult> {
  if (!navigator.gpu) {
    return {ineligibleReason: "webgpu-unavailable"};
  }

  try {
    const adapter = await withHardwareProbeTimeout(navigator.gpu.requestAdapter());
    if (!adapter) {
      return {ineligibleReason: "webgpu-adapter-unavailable"};
    }

    // Collect safe GPU capabilities without fingerprinting
    const features = adapter.features ? Array.from(adapter.features) : [];
    const limits = adapter.limits
      ? {
          ...(typeof adapter.limits.maxBufferSize === "number" ? {maxBufferSize: adapter.limits.maxBufferSize} : {}),
          ...(typeof adapter.limits.maxStorageBufferBindingSize === "number"
            ? {maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize}
            : {}),
        }
      : {};

    return {
      gpu: {
        features,
        limits,
      },
    };
  } catch {
    return {ineligibleReason: "webgpu-adapter-unavailable"};
  }
}

function collectDeviceCapability(navigator: LocalAiHardwareNavigator): DeviceCapabilityResult {
  return {
    ...(typeof navigator.deviceMemory === "number" ? {deviceMemoryGB: navigator.deviceMemory} : {}),
    ...(typeof navigator.hardwareConcurrency === "number" ? {logicalCores: navigator.hardwareConcurrency} : {}),
  };
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
 * @returns Hardware eligibility result with status, reasons, enriched GPU/device data, and available storage.
 *
 * @remarks
 * **Checks performed:**
 * 1. Browser environment availability (`navigator`, `Worker`)
 * 2. WebGPU adapter availability (`navigator.gpu.requestAdapter()`)
 * 3. Available storage quota (via `navigator.storage.estimate()`)
 * 4. Device memory (via `navigator.deviceMemory`, Chrome-only)
 * 5. Logical CPU cores (via `navigator.hardwareConcurrency`)
 *
 * **Task 3 enrichment:**
 * - Collects GPU features and limits (shader-f16, maxBufferSize, etc.) for model recommendation
 * - Collects device memory and logical cores for capability reporting
 * - Does NOT collect vendor ID, device ID, or adapter name (privacy-preserving)
 * - Storage-estimate unavailable is now "unknown" (warning) not "ineligible" (blocker)
 *
 * **Status logic:**
 * - `ineligible`: One or more hard requirements failed (WebGPU unavailable, Workers missing, storage quota too low)
 * - `unknown`: Some hints unavailable (memory/CPU/storage-estimate unknown) but no hard failures
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
 *   // Offer model download with enriched GPU features
 *   const model = recommendLocalInvoiceAssistantModel({
 *     hardwareResult: result,
 *     gpuFeatures: result.gpu?.features,
 *   });
 * } else if (result.status === 'unknown') {
 *   // Show warning, require explicit user confirmation before download
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

  const [gpuCapabilityResult, storageResult] = await Promise.all([
    collectGpuCapability(environment.navigator),
    getAvailableStorageBytes(environment.navigator.storage),
  ]);

  if (gpuCapabilityResult.ineligibleReason) {
    ineligibleReasons.push(gpuCapabilityResult.ineligibleReason);
  }

  const storageReason = collectStorageCapabilityReason(storageResult, requirements);
  const {availableStorageBytes, ineligibleReason, unknownReason} = storageReason;

  if (ineligibleReason) {
    ineligibleReasons.push(ineligibleReason);
  }

  if (unknownReason) {
    unknownReasons.push(unknownReason);
  }

  // Collect device capability data (Task 3)
  const deviceCapability = collectDeviceCapability(environment.navigator);
  const device = Object.keys(deviceCapability).length > 0 ? deviceCapability : undefined;
  const resultOptions = {
    ...(availableStorageBytes !== undefined ? {availableStorageBytes} : {}),
    ...(device !== undefined ? {device} : {}),
    ...(gpuCapabilityResult.gpu !== undefined ? {gpu: gpuCapabilityResult.gpu} : {}),
  };

  pushCapabilityReason(collectMemoryReason(environment.navigator, requirements), ineligibleReasons, unknownReasons);
  pushCapabilityReason(collectCpuReason(environment.navigator, requirements), ineligibleReasons, unknownReasons);

  if (ineligibleReasons.length > 0) {
    return createResult("ineligible", ineligibleReasons, requirements, resultOptions);
  }

  if (unknownReasons.length > 0) {
    return createResult("unknown", unknownReasons, requirements, resultOptions);
  }

  return createResult("eligible", [], requirements, resultOptions);
}
