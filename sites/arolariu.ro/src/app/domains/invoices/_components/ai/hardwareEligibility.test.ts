import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {checkHardwareEligibility} from "./hardwareEligibility";

const ORIGINAL_NAVIGATOR = globalThis.navigator;
const ORIGINAL_WORKER = (globalThis as {Worker?: unknown}).Worker;

type NavigatorStub = Partial<Navigator> & {
  gpu?: unknown;
  deviceMemory?: number;
  storage?: {estimate: () => Promise<{quota?: number; usage?: number}>};
};

function withNavigator(stub: NavigatorStub): void {
  Object.defineProperty(globalThis, "navigator", {value: stub, configurable: true, writable: true});
}

function withWorker(value: unknown): void {
  Object.defineProperty(globalThis, "Worker", {value, configurable: true, writable: true});
}

beforeEach(() => {
  withWorker(function StubWorker() {});
});

afterEach(() => {
  Object.defineProperty(globalThis, "navigator", {value: ORIGINAL_NAVIGATOR, configurable: true, writable: true});
  Object.defineProperty(globalThis, "Worker", {value: ORIGINAL_WORKER, configurable: true, writable: true});
  vi.restoreAllMocks();
});

describe("checkHardwareEligibility", () => {
  it("returns ineligible(workers-unavailable) when Worker is undefined", async () => {
    withWorker(undefined);
    const result = await checkHardwareEligibility();
    expect(result).toEqual({status: "ineligible", reasons: ["workers-unavailable"]});
  });

  it("returns ineligible(webgpu-unavailable) when navigator.gpu is missing", async () => {
    withNavigator({hardwareConcurrency: 8, deviceMemory: 16, storage: {estimate: async () => ({quota: 8e9, usage: 1e9})}});
    const result = await checkHardwareEligibility();
    expect(result.status).toBe("ineligible");
    expect(result.reasons).toContain("webgpu-unavailable");
  });

  it("returns ineligible(webgpu-adapter-unavailable) when requestAdapter returns null", async () => {
    withNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 16,
      gpu: {requestAdapter: async () => null},
      storage: {estimate: async () => ({quota: 8e9, usage: 1e9})},
    });
    const result = await checkHardwareEligibility();
    expect(result.status).toBe("ineligible");
    expect(result.reasons).toContain("webgpu-adapter-unavailable");
  });

  it("returns ineligible(storage-quota-too-low) when free quota is under 2GB", async () => {
    withNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 16,
      gpu: {requestAdapter: async () => ({})},
      storage: {estimate: async () => ({quota: 2.5e9, usage: 1e9})},
    });
    const result = await checkHardwareEligibility();
    expect(result.status).toBe("ineligible");
    expect(result.reasons).toContain("storage-quota-too-low");
  });

  it("returns ineligible(memory-too-low) when deviceMemory is reported and < 4", async () => {
    withNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 2,
      gpu: {requestAdapter: async () => ({})},
      storage: {estimate: async () => ({quota: 8e9, usage: 1e9})},
    });
    const result = await checkHardwareEligibility();
    expect(result.status).toBe("ineligible");
    expect(result.reasons).toContain("memory-too-low");
  });

  it("returns ineligible(cpu-too-low) when hardwareConcurrency is reported and < 4", async () => {
    withNavigator({
      hardwareConcurrency: 2,
      deviceMemory: 16,
      gpu: {requestAdapter: async () => ({})},
      storage: {estimate: async () => ({quota: 8e9, usage: 1e9})},
    });
    const result = await checkHardwareEligibility();
    expect(result.status).toBe("ineligible");
    expect(result.reasons).toContain("cpu-too-low");
  });

  it("returns eligible when all signals pass thresholds", async () => {
    withNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 16,
      gpu: {requestAdapter: async () => ({})},
      storage: {estimate: async () => ({quota: 8e9, usage: 1e9})},
    });
    const result = await checkHardwareEligibility();
    expect(result).toEqual({status: "eligible", reasons: []});
  });

  it("returns unknown when deviceMemory and hardwareConcurrency are both missing but other gates pass", async () => {
    withNavigator({
      gpu: {requestAdapter: async () => ({})},
      storage: {estimate: async () => ({quota: 8e9, usage: 1e9})},
    });
    const result = await checkHardwareEligibility();
    expect(result.status).toBe("unknown");
  });

  it("returns ineligible(webgpu-adapter-unavailable) when requestAdapter throws", async () => {
    withNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 16,
      gpu: {requestAdapter: async () => { throw new Error("GPU init failed"); }},
      storage: {estimate: async () => ({quota: 8e9, usage: 1e9})},
    });
    const result = await checkHardwareEligibility();
    expect(result.status).toBe("ineligible");
    expect(result.reasons).toContain("webgpu-adapter-unavailable");
  });

  it("returns ineligible(webgpu-adapter-unavailable) when navigator.gpu exists but requestAdapter is not a function", async () => {
    withNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 16,
      gpu: {},
      storage: {estimate: async () => ({quota: 8e9, usage: 1e9})},
    });
    const result = await checkHardwareEligibility();
    expect(result.status).toBe("ineligible");
    expect(result.reasons).toContain("webgpu-adapter-unavailable");
  });

  it("treats storage.estimate failure as non-blocking (still eligible)", async () => {
    withNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 16,
      gpu: {requestAdapter: async () => ({})},
      storage: {estimate: async () => { throw new Error("quota denied"); }},
    });
    const result = await checkHardwareEligibility();
    expect(result.status).toBe("eligible");
    expect(result.reasons).not.toContain("storage-quota-too-low");
  });

  it("returns ineligible(workers-unavailable) when navigator is absent", async () => {
    Object.defineProperty(globalThis, "navigator", {value: undefined, configurable: true, writable: true});
    const result = await checkHardwareEligibility();
    expect(result).toEqual({status: "ineligible", reasons: ["workers-unavailable"]});
  });

  it("treats threshold boundaries correctly (deviceMemory === 4 and hardwareConcurrency === 4 are eligible)", async () => {
    withNavigator({
      hardwareConcurrency: 4,
      deviceMemory: 4,
      gpu: {requestAdapter: async () => ({})},
      storage: {estimate: async () => ({quota: 8e9, usage: 1e9})},
    });
    const result = await checkHardwareEligibility();
    expect(result.status).toBe("eligible");
  });
});