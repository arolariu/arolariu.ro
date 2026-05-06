import {describe, expect, it} from "vitest";

import {validateBootstrap, WORKER_PROTOCOL_VERSION} from "./workerEnvelope";

describe("WORKER_PROTOCOL_VERSION", () => {
  it("is the integer 1", () => {
    expect(WORKER_PROTOCOL_VERSION).toBe(1);
  });
});

describe("validateBootstrap", () => {
  function makeValid(): unknown {
    const a = new MessageChannel();
    const b = new MessageChannel();
    return {
      kind: "bootstrap",
      version: 1,
      rpcPort: a.port2,
      eventPort: b.port2,
      capabilities: {
        crossOriginIsolated: false,
        hasWebGpu: false,
      },
    };
  }

  it("accepts a well-formed bootstrap message", () => {
    expect(validateBootstrap(makeValid())).toBe(true);
  });

  it("rejects null and undefined", () => {
    expect(validateBootstrap(null)).toBe(false);
    expect(validateBootstrap(undefined)).toBe(false);
  });

  it("rejects primitives", () => {
    expect(validateBootstrap("bootstrap")).toBe(false);
    expect(validateBootstrap(42)).toBe(false);
    expect(validateBootstrap(true)).toBe(false);
  });

  it("rejects messages with the wrong kind", () => {
    const m = makeValid() as Record<string, unknown>;
    m.kind = "not-bootstrap";
    expect(validateBootstrap(m)).toBe(false);
  });

  it("rejects messages with a mismatched protocol version", () => {
    const m = makeValid() as Record<string, unknown>;
    m.version = 2;
    expect(validateBootstrap(m)).toBe(false);
  });

  it("rejects messages missing rpcPort", () => {
    const m = makeValid() as Record<string, unknown>;
    delete m.rpcPort;
    expect(validateBootstrap(m)).toBe(false);
  });

  it("rejects messages missing eventPort", () => {
    const m = makeValid() as Record<string, unknown>;
    delete m.eventPort;
    expect(validateBootstrap(m)).toBe(false);
  });

  it("rejects messages where rpcPort is not a MessagePort", () => {
    const m = makeValid() as Record<string, unknown>;
    m.rpcPort = {fake: "port"};
    expect(validateBootstrap(m)).toBe(false);
  });

  it("rejects messages missing capabilities", () => {
    const m = makeValid() as Record<string, unknown>;
    delete m.capabilities;
    expect(validateBootstrap(m)).toBe(false);
  });

  it("rejects messages where capabilities.crossOriginIsolated is missing or non-boolean", () => {
    const a = makeValid() as Record<string, unknown>;
    a.capabilities = {hasWebGpu: false};
    expect(validateBootstrap(a)).toBe(false);

    const b = makeValid() as Record<string, unknown>;
    b.capabilities = {crossOriginIsolated: "no", hasWebGpu: false};
    expect(validateBootstrap(b)).toBe(false);
  });

  it("rejects messages where capabilities.hasWebGpu is missing or non-boolean", () => {
    const a = makeValid() as Record<string, unknown>;
    a.capabilities = {crossOriginIsolated: false};
    expect(validateBootstrap(a)).toBe(false);

    const b = makeValid() as Record<string, unknown>;
    b.capabilities = {crossOriginIsolated: false, hasWebGpu: 1};
    expect(validateBootstrap(b)).toBe(false);
  });

  it("rejects messages where capabilities.hardwareConcurrency is present but not a number", () => {
    const m = makeValid() as Record<string, unknown>;
    m.capabilities = {crossOriginIsolated: false, hasWebGpu: false, hardwareConcurrency: "8"};
    expect(validateBootstrap(m)).toBe(false);
  });

  it("rejects messages where capabilities.deviceMemory is present but not a number", () => {
    const m = makeValid() as Record<string, unknown>;
    m.capabilities = {crossOriginIsolated: false, hasWebGpu: false, deviceMemory: "16"};
    expect(validateBootstrap(m)).toBe(false);
  });

  it("accepts capabilities with valid optional numeric fields present", () => {
    const m = makeValid() as Record<string, unknown>;
    m.capabilities = {crossOriginIsolated: true, hasWebGpu: true, hardwareConcurrency: 8, deviceMemory: 16};
    expect(validateBootstrap(m)).toBe(true);
  });
});
