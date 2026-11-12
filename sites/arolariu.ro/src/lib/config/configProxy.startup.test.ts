// @vitest-environment node

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const privateEnvironment = {
  CLERK_SECRET_KEY: "",
  API_JWT: "",
  API_JWT_ISSUER: "",
  API_JWT_AUDIENCE: "",
  RESEND_API_KEY: "",
  API_URL: "",
  STORAGE_BLOB_ENDPOINT: "",
} as const;

function runtimeResponse(environment = "DEVELOPMENT"): Response {
  return Response.json({
    target: "website",
    config: {
      "Site:Environment": environment,
      "Auth:Clerk:SecretKey": "test-clerk",
      "Auth:JWT:Secret": "test-jwt",
      "Auth:JWT:Issuer": "test-issuer",
      "Auth:JWT:Audience": "test-audience",
      "Communication:Email:ApiKey": "",
      "Endpoints:Service:Api": "https://api.example.test",
      "Endpoints:Storage:Blob": "https://storage.example.test",
    },
  });
}

function delayedResponse(milliseconds: number, options?: RequestInit): Promise<Response> {
  const signal = options?.signal;
  if (!signal) throw new Error("The runtime request must supply an abort signal.");

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve(runtimeResponse());
    }, milliseconds);
    function abort(): void {
      clearTimeout(timer);
      reject(signal?.reason);
    }
    signal.addEventListener("abort", abort, {once: true});
  });
}

describe("runtime configuration startup deadlines", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("INFRA", "azure");
    vi.stubEnv("WEBSITE_INSTANCE_ID", "");
    vi.stubEnv("EXP_PROXY_URL", "http://exp");
    vi.stubEnv("AZURE_CLIENT_ID", "");
    vi.stubEnv("SITE_ENV", "DEVELOPMENT");
    vi.stubEnv("NEXT_PHASE", "phase-production-server");
    vi.stubEnv("OTEL_SDK_DISABLED", "true");
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "");
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", "");
    for (const [key, value] of Object.entries(privateEnvironment)) vi.stubEnv(key, value);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function useDeadlineClock(): void {
    vi.useFakeTimers();
    vi.spyOn(AbortSignal, "timeout").mockImplementation((milliseconds) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException("Request deadline exceeded", "TimeoutError")), milliseconds);
      return controller.signal;
    });
  }

  it("initializes cloud configuration when exp needs fifteen seconds to respond", async () => {
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");
    useDeadlineClock();
    const fetchMock = vi.fn((_url: string, options?: RequestInit) => delayedResponse(15_000, options));
    vi.stubGlobal("fetch", fetchMock);

    const result = initializeRuntimeEnvironmentConfiguration().catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(15_000);

    expect(await result).toBeUndefined();
    expect(process.env["CLERK_SECRET_KEY"]).toBe("test-clerk");
    expect(process.env["API_URL"]).toBe("https://api.example.test");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("recovers from two expired HTTP deadlines using fresh request signals before initializing", async () => {
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");
    useDeadlineClock();
    const signals: AbortSignal[] = [];
    const fetchMock = vi.fn((_url: string, options?: RequestInit) => {
      if (options?.signal) signals.push(options.signal);
      expect(process.env["CLERK_SECRET_KEY"]).toBe("");
      return signals.length < 3 ? delayedResponse(31_000, options) : Promise.resolve(runtimeResponse());
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = initializeRuntimeEnvironmentConfiguration().catch((error: unknown) => error);
    await vi.runAllTimersAsync();

    expect(await result).toBeUndefined();
    expect(process.env["CLERK_SECRET_KEY"]).toBe("test-clerk");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(new Set(signals).size).toBe(3);
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(true);
  });

  it("stops after three timed-out cloud requests without applying private values", async () => {
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");
    useDeadlineClock();
    const fetchMock = vi.fn((_url: string, options?: RequestInit) => delayedResponse(31_000, options));
    vi.stubGlobal("fetch", fetchMock);
    const startedAt = Date.now();

    const result = initializeRuntimeEnvironmentConfiguration().catch((error: unknown) => error);
    await vi.runAllTimersAsync();
    const error: unknown = await result;

    expect(error).toBeInstanceOf(Error);
    expect(String(error)).toContain("stage=http");
    expect(String(error)).toContain("failure=TimeoutError");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(Date.now() - startedAt).toBe(92_000);
    for (const [key, value] of Object.entries(privateEnvironment)) expect(process.env[key]).toBe(value);
  });

  it("retains the two-second, single-attempt local fallback", async () => {
    vi.stubEnv("INFRA", "local");
    vi.stubEnv("CLERK_SECRET_KEY", "local-clerk");
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");
    useDeadlineClock();
    const fetchMock = vi.fn((_url: string, options?: RequestInit) => delayedResponse(15_000, options));
    vi.stubGlobal("fetch", fetchMock);

    const result = initializeRuntimeEnvironmentConfiguration().catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(2000);

    expect(await result).toBeUndefined();
    expect(process.env["CLERK_SECRET_KEY"]).toBe("local-clerk");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403, 503])("does not retry HTTP %s or initialize from an error response", async (status) => {
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({error: "unavailable"}, {status}));
    vi.stubGlobal("fetch", fetchMock);

    await expect(initializeRuntimeEnvironmentConfiguration()).rejects.toThrow(`status=${status}`);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(process.env["CLERK_SECRET_KEY"]).toBe("");
  });

  it("does not retry a document with the wrong environment", async () => {
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");
    const fetchMock = vi.fn().mockResolvedValue(runtimeResponse("PRODUCTION"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(initializeRuntimeEnvironmentConfiguration()).rejects.toThrow("does not match DEVELOPMENT");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(process.env["CLERK_SECRET_KEY"]).toBe("");
  });
});
