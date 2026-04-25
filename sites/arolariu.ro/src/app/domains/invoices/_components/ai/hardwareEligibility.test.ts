import {describe, expect, it, vi} from "vitest";
import {analyzeLocalAiHardwareEligibility, DEFAULT_LOCAL_AI_HARDWARE_REQUIREMENTS} from "./hardwareEligibility";

type TestNavigator = Readonly<{
  deviceMemory?: number;
  gpu?: Readonly<{
    requestAdapter: () => Promise<object | null>;
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
      requestAdapter: vi.fn(async () => ({})),
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

  it("returns ineligible when storage quota cannot be verified before model download", async () => {
    const result = await analyzeLocalAiHardwareEligibility({
      environment: {
        navigator: createNavigator({
          storage: undefined,
        }),
        Worker: createWorkerConstructor(),
      },
    });

    expect(result.status).toBe("ineligible");
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
});
