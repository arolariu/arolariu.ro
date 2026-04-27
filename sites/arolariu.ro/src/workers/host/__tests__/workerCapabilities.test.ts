import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {getCapabilities} from "../workerCapabilities";

describe("getCapabilities", () => {
  let originalCrossOriginIsolated: boolean;
  let originalNavigator: Navigator;

  beforeEach(() => {
    originalCrossOriginIsolated = (globalThis as {crossOriginIsolated: boolean}).crossOriginIsolated;
    originalNavigator = globalThis.navigator;
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "crossOriginIsolated", {
      value: originalCrossOriginIsolated,
      configurable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it("reports crossOriginIsolated when the global is true", () => {
    Object.defineProperty(globalThis, "crossOriginIsolated", {value: true, configurable: true});
    expect(getCapabilities().crossOriginIsolated).toBe(true);
  });

  it("reports crossOriginIsolated when the global is false", () => {
    Object.defineProperty(globalThis, "crossOriginIsolated", {value: false, configurable: true});
    expect(getCapabilities().crossOriginIsolated).toBe(false);
  });

  it("reports hardwareConcurrency when navigator exposes it", () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {hardwareConcurrency: 8},
      configurable: true,
    });
    expect(getCapabilities().hardwareConcurrency).toBe(8);
  });

  it("omits hardwareConcurrency when navigator does not expose it", () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      configurable: true,
    });
    expect(getCapabilities().hardwareConcurrency).toBeUndefined();
  });

  it("reports deviceMemory when present (Chromium-only signal)", () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {deviceMemory: 16},
      configurable: true,
    });
    expect(getCapabilities().deviceMemory).toBe(16);
  });

  it("hasWebGpu is true when navigator.gpu exists", () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {gpu: {}},
      configurable: true,
    });
    expect(getCapabilities().hasWebGpu).toBe(true);
  });

  it("hasWebGpu is false when navigator.gpu is undefined", () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      configurable: true,
    });
    expect(getCapabilities().hasWebGpu).toBe(false);
  });
});
