const BYTES_PER_GIB = 1024 ** 3;

export const DEFAULT_LOCAL_AI_HARDWARE_REQUIREMENTS = {
  minimumAvailableStorageBytes: 6 * BYTES_PER_GIB,
  minimumDeviceMemoryGB: 4,
  minimumLogicalCores: 4,
} as const satisfies LocalAiHardwareRequirements;

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

export type HardwareEligibilityStatus = "eligible" | "ineligible" | "unknown";

export type LocalAiHardwareRequirements = Readonly<{
  minimumAvailableStorageBytes: number;
  minimumDeviceMemoryGB: number;
  minimumLogicalCores: number;
}>;

type WebGpuLike = Readonly<{
  requestAdapter: () => Promise<unknown | null>;
}>;

type StorageManagerLike = Readonly<{
  estimate: () => Promise<StorageEstimate>;
}>;

export type LocalAiHardwareNavigator = Readonly<{
  deviceMemory?: number;
  gpu?: WebGpuLike;
  hardwareConcurrency?: number;
  storage?: StorageManagerLike;
}>;

export type HardwareEligibilityEnvironment = Readonly<{
  navigator?: LocalAiHardwareNavigator;
  Worker?: typeof Worker;
}>;

export type HardwareEligibilityResult = Readonly<{
  availableStorageBytes?: number;
  reasons: ReadonlyArray<HardwareEligibilityReason>;
  requirements: LocalAiHardwareRequirements;
  status: HardwareEligibilityStatus;
}>;

type AnalyzeHardwareEligibilityInput = Readonly<{
  environment?: HardwareEligibilityEnvironment;
  requirements?: LocalAiHardwareRequirements;
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

async function getAvailableStorageBytes(
  storage: StorageManagerLike | undefined,
): Promise<Readonly<{availableStorageBytes?: number; status: "known" | "unknown"}>> {
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
 * Checks whether the current browser/device is eligible for local-only invoice AI.
 *
 * @param input - Optional testable environment and hardware thresholds.
 * @returns A coarse local-only eligibility result used before model suggestions.
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
  if (storageResult.status === "unknown") {
    unknownReasons.push("storage-estimate-unavailable");
  } else if (storageResult.availableStorageBytes < requirements.minimumAvailableStorageBytes) {
    ineligibleReasons.push("storage-quota-too-low");
  }

  pushCapabilityReason(collectMemoryReason(environment.navigator, requirements), ineligibleReasons, unknownReasons);
  pushCapabilityReason(collectCpuReason(environment.navigator, requirements), ineligibleReasons, unknownReasons);

  if (ineligibleReasons.length > 0) {
    return createResult("ineligible", ineligibleReasons, requirements, storageResult.availableStorageBytes);
  }

  if (unknownReasons.length > 0) {
    return createResult("unknown", unknownReasons, requirements, storageResult.availableStorageBytes);
  }

  return createResult("eligible", [], requirements, storageResult.availableStorageBytes);
}
