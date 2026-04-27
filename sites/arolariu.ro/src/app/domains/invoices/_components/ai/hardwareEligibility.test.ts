import {describe, expect, it, vi} from "vitest";
import {
  analyzeLocalAiHardwareEligibility,
  DEFAULT_LOCAL_AI_HARDWARE_REQUIREMENTS,
  type HardwareEligibilityResult,
} from "./hardwareEligibility";

type TestGpuAdapter = Readonly<{
  features?: ReadonlySet<string>;
  limits?: Readonly<{
    maxBufferSize?: number;
    maxStorageBufferBindingSize?: number;
  }>;
}>;

type TestNavigator = Readonly<{
  deviceMemory?: number;
  gpu?: Readonly<{
    requestAdapter: () => Promise<TestGpuAdapter | null>;
  }>;
  hardwareConcurrency?: number;
  storage?: Readonly<{
    estimate: () => Promise<StorageEstimate>;
  }>;
}>;

const GiB = 1024 ** 3;

function createWorkerConstructor(): typeof Worker {
  return class TestWorker extends EventTarget {
    public readonly url: string | URL;

    public constructor(url: string | URL) {
      super();
      this.url = url;
    }

    public postMessage(): void {}

    public terminate(): void {}
  } as typeof Worker;
}

function createNavigator(overrides: Partial<TestNavigator> = {}): TestNavigator {
  return {
    deviceMemory: 8,
    gpu: {
      requestAdapter: vi.fn(async () => ({
        features: new Set(["shader-f16"]),
        limits: {
          maxBufferSize: 1024 * 1024 * 1024,
          maxStorageBufferBindingSize: 512 * 1024 * 1024,
        },
      })),
    },
    hardwareConcurrency: 8,
    storage: {
      estimate: vi.fn(async () => ({
        quota: 8 * GiB,
        usage: 1 * GiB,
      })),
    },
    ...overrides,
  };
}

describe("analyzeLocalAiHardwareEligibility", () => {
  it("returns eligible when WebGPU, workers, storage, memory, and CPU meet the default gate", async () => {
    const result = await analyzeLocalAiHardwareEligibility({
      environment: {
        navigator: createNavigator(),
        Worker: createWorkerConstructor(),
      },
    });

    expect(result.status).toBe("eligible");
    expect(result.reasons).toEqual([]);
    expect(result.requirements).toEqual(DEFAULT_LOCAL_AI_HARDWARE_REQUIREMENTS);
  });

  it("returns ineligible before model suggestion when WebGPU is unavailable", async () => {
    const result = await analyzeLocalAiHardwareEligibility({
      environment: {
        navigator: createNavigator({gpu: undefined}),
        Worker: createWorkerConstructor(),
      },
    });

    expect(result.status).toBe("ineligible");
    expect(result.reasons).toContain("webgpu-unavailable");
  });

  it("returns ineligible when available storage is below the model safety threshold", async () => {
    const result = await analyzeLocalAiHardwareEligibility({
      environment: {
        navigator: createNavigator({
          storage: {
            estimate: vi.fn(async () => ({
              quota: 5 * GiB,
              usage: 1 * GiB,
            })),
          },
        }),
        Worker: createWorkerConstructor(),
      },
    });

    expect(result.status).toBe("ineligible");
    expect(result.reasons).toContain("storage-quota-too-low");
  });

  it("returns unknown when storage quota cannot be verified before model download", async () => {
    const result = await analyzeLocalAiHardwareEligibility({
      environment: {
        navigator: createNavigator({
          storage: undefined,
        }),
        Worker: createWorkerConstructor(),
      },
    });

    // Task 3: storage-estimate-unavailable is now "unknown" (warning), not "ineligible" (blocker)
    expect(result.status).toBe("unknown");
    expect(result.reasons).toContain("storage-estimate-unavailable");
  });

  it("returns unknown when optional memory and CPU signals are unavailable", async () => {
    const result = await analyzeLocalAiHardwareEligibility({
      environment: {
        navigator: createNavigator({
          deviceMemory: undefined,
          hardwareConcurrency: undefined,
        }),
        Worker: createWorkerConstructor(),
      },
    });

    expect(result.status).toBe("unknown");
    expect(result.reasons).toEqual(["memory-unknown", "cpu-unknown"]);
  });

  it("surfaces GPU features when WebGPU adapter is available", async () => {
    const result = await analyzeLocalAiHardwareEligibility({
      environment: {
        navigator: createNavigator(),
        Worker: createWorkerConstructor(),
      },
    });

    expect(result.status).toBe("eligible");
    expect(result.gpu).toBeDefined();
    expect(result.gpu?.features).toEqual(["shader-f16"]);
  });

  it("surfaces GPU limits when WebGPU adapter is available", async () => {
    const result = await analyzeLocalAiHardwareEligibility({
      environment: {
        navigator: createNavigator(),
        Worker: createWorkerConstructor(),
      },
    });

    expect(result.status).toBe("eligible");
    expect(result.gpu).toBeDefined();
    expect(result.gpu?.limits).toBeDefined();
    expect(result.gpu?.limits.maxBufferSize).toBe(1024 * 1024 * 1024);
    expect(result.gpu?.limits.maxStorageBufferBindingSize).toBe(512 * 1024 * 1024);
  });

  it("does not collect raw GPU adapter identity information", async () => {
    const result = await analyzeLocalAiHardwareEligibility({
      environment: {
        navigator: createNavigator(),
        Worker: createWorkerConstructor(),
      },
    });

    expect(result.status).toBe("eligible");
    // Ensure no vendor, device ID, or adapter name is stored
    const resultKeys = Object.keys(result);
    expect(resultKeys).not.toContain("vendor");
    expect(resultKeys).not.toContain("deviceId");
    expect(resultKeys).not.toContain("adapterName");
  });

  it("surfaces device memory and logical cores when available", async () => {
    const result = await analyzeLocalAiHardwareEligibility({
      environment: {
        navigator: createNavigator({
          deviceMemory: 16,
          hardwareConcurrency: 12,
        }),
        Worker: createWorkerConstructor(),
      },
    });

    expect(result.status).toBe("eligible");
    expect(result.device).toBeDefined();
    expect(result.device?.deviceMemoryGB).toBe(16);
    expect(result.device?.logicalCores).toBe(12);
  });

  it("marks storage-estimate unavailable as unknown warning and prevents automatic download", async () => {
    const result = await analyzeLocalAiHardwareEligibility({
      environment: {
        navigator: createNavigator({
          storage: undefined,
        }),
        Worker: createWorkerConstructor(),
      },
    });

    // Storage unavailable should now result in "unknown" status, not "ineligible"
    expect(result.status).toBe("unknown");
    expect(result.reasons).toContain("storage-estimate-unavailable");
    // Should not have availableStorageBytes
    expect(result.availableStorageBytes).toBeUndefined();
  });

  it("handles GPU adapter without features gracefully", async () => {
    const result = await analyzeLocalAiHardwareEligibility({
      environment: {
        navigator: createNavigator({
          gpu: {
            requestAdapter: vi.fn(async () => ({
              // No features or limits
            })),
          },
        }),
        Worker: createWorkerConstructor(),
      },
    });

    expect(result.status).toBe("eligible");
    expect(result.gpu).toBeDefined();
    expect(result.gpu?.features).toEqual([]);
  });

  it("returns ineligible when the WebGPU adapter probe does not settle", async () => {
    vi.useFakeTimers();
    try {
      let settledResult: HardwareEligibilityResult | null = null;

      void analyzeLocalAiHardwareEligibility({
        environment: {
          navigator: createNavigator({
            gpu: {
              requestAdapter: vi.fn(() => new Promise<never>(() => {})),
            },
          }),
          Worker: createWorkerConstructor(),
        },
      }).then((result) => {
        settledResult = result;
      });

      await vi.advanceTimersByTimeAsync(5000);

      expect(settledResult?.status).toBe("ineligible");
      expect(settledResult?.reasons).toContain("webgpu-adapter-unavailable");
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns unknown when the storage estimate probe does not settle", async () => {
    vi.useFakeTimers();
    try {
      let settledResult: HardwareEligibilityResult | null = null;

      void analyzeLocalAiHardwareEligibility({
        environment: {
          navigator: createNavigator({
            storage: {
              estimate: vi.fn(() => new Promise<never>(() => {})),
            },
          }),
          Worker: createWorkerConstructor(),
        },
      }).then((result) => {
        settledResult = result;
      });

      await vi.advanceTimersByTimeAsync(5000);

      expect(settledResult?.status).toBe("unknown");
      expect(settledResult?.reasons).toContain("storage-estimate-unavailable");
    } finally {
      vi.useRealTimers();
    }
  });
});
