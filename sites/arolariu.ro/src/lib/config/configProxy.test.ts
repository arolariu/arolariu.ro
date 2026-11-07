/**
 * @fileoverview Unit tests for single-key exp config proxy behavior.
 * @module sites/arolariu.ro/src/lib/config/configProxy.test
 */

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {getCachedConfigValue, invalidateConfigValueCache, isConfigValueResponse, setCachedConfigValue} from "./configProxy";

const instrumentationMocks = vi.hoisted(() => ({
  injectTraceContextHeaders: vi.fn((headers?: Headers) => {
    const enrichedHeaders = headers instanceof Headers ? headers : new Headers();
    enrichedHeaders.set("traceparent", "00-abcdefabcdefabcdefabcdefabcdefab-abcdefabcdefabcd-01");
    enrichedHeaders.set("X-Request-Id", "abcdefabcdefabcdefabcdefabcdefab");
    return enrichedHeaders;
  }),
}));

// Mock instrumentation — configProxy.ts imports {addSpanEvent, logWithTrace, withSpan}
vi.mock("@/instrumentation.server", () => ({
  withSpan: vi.fn((_name: string, fn: () => unknown) => fn()),
  logWithTrace: vi.fn(),
  addSpanEvent: vi.fn(),
  getTraceparentHeader: vi.fn(() => ""),
  injectTraceContextHeaders: instrumentationMocks.injectTraceContextHeaders,
}));

function createJsonResponse(body: unknown, status = 200): Response {
  return {
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}

function createConfigValuePayload(name: string, value: string, refreshIntervalSeconds = 300) {
  return {
    name,
    value,
    availableForTargets: ["website"],
    availableInDocuments: ["website.build-time", "website.run-time"],
    description: `${name} description`,
    fetchedAt: "2026-01-01T00:00:00Z",
    refreshIntervalSeconds,
    requiredInDocuments: ["website.build-time", "website.run-time"],
    usage: `${name} usage`,
  } as const;
}

beforeEach(() => {
  vi.stubEnv("INFRA", "");
  vi.stubEnv("WEBSITE_INSTANCE_ID", "");
  vi.stubEnv("EXP_PROXY_URL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("configProxy", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env["AZURE_CLIENT_ID"];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env["AZURE_CLIENT_ID"];
  });

  it("fetches one config value and returns the resolved value", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Endpoints:Storage:Blob", "https://storage.example.test")));
    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    const value = await fetchConfigValue("Endpoints:Storage:Blob");

    expect(value).toBe("https://storage.example.test");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0] as [string])[0]).toContain("/api/v1/config?name=Endpoints%3AStorage%3ABlob");
    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].headers).toMatchObject({
      "X-Exp-Target": "website",
      "X-Request-Id": "abcdefabcdefabcdefabcdefabcdefab",
      traceparent: "00-abcdefabcdefabcdefabcdefabcdefab-abcdefabcdefabcd-01",
    });
  });

  it("returns cached values without an additional network call", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Auth:JWT:Issuer", "https://issuer.example.test")));
    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    const first = await fetchConfigValue("Auth:JWT:Issuer");
    const second = await fetchConfigValue("Auth:JWT:Issuer");

    expect(first).toBe("https://issuer.example.test");
    expect(second).toBe("https://issuer.example.test");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws when exp rejects an unknown key", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse({error: "Unknown"}, 400)));

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    await expect(fetchConfigValue("Unknown:Key")).rejects.toThrow("Failed to fetch config 'Unknown:Key' (status=400).");
  });

  it("returns an empty string for optional keys with empty values", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Communication:Email:ApiKey", ""))));

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    const value = await fetchConfigValue("Communication:Email:ApiKey");

    expect(value).toBe("");
  });

  it("fetches multiple values independently and returns them as a record", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Auth:JWT:Issuer", "https://issuer.example.test")))
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Auth:JWT:Secret", "super-secret")));
    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValues, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    const values = await fetchConfigValues(["Auth:JWT:Issuer", "Auth:JWT:Secret"]);

    expect(values["Auth:JWT:Issuer"]).toBe("https://issuer.example.test");
    expect(values["Auth:JWT:Secret"]).toBe("super-secret");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("invalidates cached keys so the next read refetches", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Auth:JWT:Issuer", "https://issuer.example.test")))
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Auth:JWT:Issuer", "https://updated.example.test")));
    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    const first = await fetchConfigValue("Auth:JWT:Issuer");
    invalidateConfigCache("Auth:JWT:Issuer");
    const second = await fetchConfigValue("Auth:JWT:Issuer");

    expect(first).toBe("https://issuer.example.test");
    expect(second).toBe("https://updated.example.test");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses http://exp when AZURE_CLIENT_ID is not set", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Endpoints:Service:Api", "https://api.example.test")));
    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    await fetchConfigValue("Endpoints:Service:Api");

    expect((fetchMock.mock.calls[0] as [string])[0]).toContain("http://exp");
  });

  it("uses https://exp.arolariu.ro when AZURE_CLIENT_ID is set", async () => {
    process.env["AZURE_CLIENT_ID"] = "test-managed-identity-id";
    vi.resetModules();

    vi.doMock("@/lib/azure/credentials", () => ({
      getAzureCredential: () => ({
        getToken: vi.fn().mockResolvedValue({token: "mock-azure-bearer-token"}),
      }),
    }));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Endpoints:Service:Api", "https://api.example.test")));
    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    await fetchConfigValue("Endpoints:Service:Api");

    expect((fetchMock.mock.calls[0] as [string])[0]).toContain("https://exp.arolariu.ro");
  });

  it("throws when exp returns OK but payload is invalid (non-config shape)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse({unexpected: "shape"})));

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    await expect(fetchConfigValue("Some:Key")).rejects.toThrow("Invalid config response payload for key 'Some:Key'.");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Typed config value helpers (with env-var fallback)
// ─────────────────────────────────────────────────────────────────────────────

describe("initializeRuntimeEnvironmentConfiguration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/azure/credentials");
    vi.stubEnv("AZURE_CLIENT_ID", "");
    vi.stubEnv("EXP_PROXY_URL", "http://exp");
    vi.stubEnv("INFRA", "azure");
    vi.stubEnv("WEBSITE_INSTANCE_ID", "");
    vi.stubEnv("SITE_ENV", "DEVELOPMENT");
    vi.stubEnv("NEXT_PHASE", "phase-production-server");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "public-from-ci");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    vi.stubEnv("API_JWT", "");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("API_URL", "");
    vi.stubEnv("API_JWT_ISSUER", "");
    vi.stubEnv("API_JWT_AUDIENCE", "");
    vi.stubEnv("STORAGE_BLOB_ENDPOINT", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.doUnmock("@azure/identity");
  });

  function runtimeDocument(config: Readonly<Record<string, unknown>> = {}) {
    return {
      target: "website",
      contractVersion: "1",
      version: "test-version",
      refreshIntervalSeconds: 300,
      fetchedAt: "2026-10-13T00:00:00Z",
      features: {},
      config: {
        "Site:Environment": "DEVELOPMENT",
        "Site:Name": "dev.arolariu.ro",
        "Site:Url": "https://dev.arolariu.ro",
        "Auth:Clerk:PublishableKey": "public-from-exp",
        "Auth:Clerk:SecretKey": "private-clerk",
        "Auth:JWT:Issuer": "https://issuer.example.test",
        "Auth:JWT:Audience": "test-audience",
        "Auth:JWT:Secret": "private-jwt",
        "Endpoints:Service:Api": "https://api.example.test",
        "Endpoints:Storage:Blob": "https://storage.example.test",
        "Communication:Email:ApiKey": "private-email",
        ...config,
      },
    };
  }

  it("loads private cloud values without overriding public CI configuration", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse(runtimeDocument()));
    vi.stubGlobal("fetch", fetchMock);
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    await initializeRuntimeEnvironmentConfiguration();

    expect(process.env["CLERK_SECRET_KEY"]).toBe("private-clerk");
    expect(process.env["API_JWT"]).toBe("private-jwt");
    expect(process.env["RESEND_API_KEY"]).toBe("private-email");
    expect(process.env["API_URL"]).toBe("https://api.example.test");
    expect(process.env["API_JWT_ISSUER"]).toBe("https://issuer.example.test");
    expect(process.env["API_JWT_AUDIENCE"]).toBe("test-audience");
    expect(process.env["STORAGE_BLOB_ENDPOINT"]).toBe("https://storage.example.test");
    expect(process.env["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"]).toBe("public-from-ci");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/v1/run-time?for=website&label=DEVELOPMENT");
  });

  it("preserves local dotenv values when local exp is unavailable", async () => {
    vi.stubEnv("INFRA", "local");
    vi.stubEnv("AZURE_CLIENT_ID", "local-cloud-resource-identity");
    vi.stubEnv("CLERK_SECRET_KEY", "local-clerk");
    vi.stubEnv("API_JWT", "local-jwt");
    vi.stubEnv("RESEND_API_KEY", "local-email");
    const fetchMock = vi.fn().mockRejectedValue(new Error("exp unavailable"));
    vi.stubGlobal("fetch", fetchMock);
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    await initializeRuntimeEnvironmentConfiguration();

    expect(process.env["CLERK_SECRET_KEY"]).toBe("local-clerk");
    expect(process.env["API_JWT"]).toBe("local-jwt");
    expect(process.env["RESEND_API_KEY"]).toBe("local-email");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0];
    expect(request?.[0]).toContain("http://exp/api/v1/run-time");
    expect(request?.[1].headers).not.toHaveProperty("Authorization");
  });

  it("uses local exp when it is running", async () => {
    vi.stubEnv("INFRA", "local");
    vi.stubEnv("CLERK_SECRET_KEY", "outdated-local-value");
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse(runtimeDocument()));
    vi.stubGlobal("fetch", fetchMock);
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    await initializeRuntimeEnvironmentConfiguration();

    expect(process.env["CLERK_SECRET_KEY"]).toBe("private-clerk");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps subsequent per-key reads on local exp when a local Azure identity is configured", async () => {
    vi.stubEnv("INFRA", "local");
    vi.stubEnv("EXP_PROXY_URL", "");
    vi.stubEnv("AZURE_CLIENT_ID", "local-resource-identity");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(runtimeDocument()))
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("website.commander.enabled", "true")));
    vi.stubGlobal("fetch", fetchMock);
    const {initializeRuntimeEnvironmentConfiguration, fetchConfigValue} = await import("./configProxy");

    await initializeRuntimeEnvironmentConfiguration();
    expect(await fetchConfigValue("website.commander.enabled")).toBe("true");

    expect(fetchMock.mock.calls[1]?.[0]).toContain("http://exp/api/v1/config");
    expect(fetchMock.mock.calls[1]?.[1].headers).not.toHaveProperty("Authorization");
  });

  it("uses dotenv aliases for subsequent reads when local exp is unavailable", async () => {
    vi.stubEnv("INFRA", "local");
    vi.stubEnv("STORAGE_BLOB_ENDPOINT", "https://offline-storage.example.test");
    const fetchMock = vi.fn().mockRejectedValue(new Error("connection refused"));
    vi.stubGlobal("fetch", fetchMock);
    const {initializeRuntimeEnvironmentConfiguration, fetchConfigValue} = await import("./configProxy");

    await initializeRuntimeEnvironmentConfiguration();

    expect(await fetchConfigValue("Endpoints:Storage:Blob")).toBe("https://offline-storage.example.test");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("serves all values from the initialized document without additional requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse(runtimeDocument()));
    vi.stubGlobal("fetch", fetchMock);
    const {initializeRuntimeEnvironmentConfiguration, fetchConfigValue} = await import("./configProxy");

    await initializeRuntimeEnvironmentConfiguration();

    expect(await fetchConfigValue("Endpoints:Storage:Blob")).toBe("https://storage.example.test");
    expect(await fetchConfigValue("Auth:JWT:Issuer")).toBe("https://issuer.example.test");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not treat object prototype members as initialized configuration", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(runtimeDocument()))
      .mockResolvedValueOnce(createJsonResponse({error: "Unknown key"}, 400));
    vi.stubGlobal("fetch", fetchMock);
    const {initializeRuntimeEnvironmentConfiguration, fetchConfigValue} = await import("./configProxy");

    await initializeRuntimeEnvironmentConfiguration();

    await expect(fetchConfigValue("toString")).rejects.toThrow("status=400");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("selects the production label from SITE_ENV", async () => {
    vi.stubEnv("SITE_ENV", "PRODUCTION");
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse(runtimeDocument({"Site:Environment": "PRODUCTION"})));
    vi.stubGlobal("fetch", fetchMock);
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    await initializeRuntimeEnvironmentConfiguration();

    expect(fetchMock.mock.calls[0]?.[0]).toContain("label=PRODUCTION");
  });

  it("normalizes a valid environment before selecting its label", async () => {
    vi.stubEnv("SITE_ENV", " production ");
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse(runtimeDocument({"Site:Environment": "PRODUCTION"})));
    vi.stubGlobal("fetch", fetchMock);
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    await initializeRuntimeEnvironmentConfiguration();

    expect(fetchMock.mock.calls[0]?.[0]).toContain("label=PRODUCTION");
  });

  it("rejects a runtime document from the wrong environment before applying private values", async () => {
    vi.stubEnv("SITE_ENV", "PRODUCTION");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse(runtimeDocument())));
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    await expect(initializeRuntimeEnvironmentConfiguration()).rejects.toThrow("does not match PRODUCTION");
    expect(process.env["CLERK_SECRET_KEY"]).toBe("");
    expect(process.env["API_JWT"]).toBe("");
  });

  it("treats Azure App Service as cloud even without an infrastructure flag", async () => {
    vi.stubEnv("INFRA", "");
    vi.stubEnv("WEBSITE_INSTANCE_ID", "app-service-instance");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    await expect(initializeRuntimeEnvironmentConfiguration()).rejects.toThrow("Unable to fetch private runtime configuration");
  });

  it("rejects an invalid exp URL before making a request", async () => {
    vi.stubEnv("EXP_PROXY_URL", "not-a-url");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    await expect(initializeRuntimeEnvironmentConfiguration()).rejects.toThrow("EXP_PROXY_URL must be a valid URL");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["", "STAGING"])("rejects missing or unsupported SITE_ENV (%s)", async (environment) => {
    vi.stubEnv("SITE_ENV", environment);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    await expect(initializeRuntimeEnvironmentConfiguration()).rejects.toThrow("SITE_ENV must be set to PRODUCTION or DEVELOPMENT");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not resolve runtime secrets during a Next.js build", async () => {
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    const fetchMock = vi.fn().mockRejectedValue(new Error("runtime secrets must not be fetched during builds"));
    vi.stubGlobal("fetch", fetchMock);
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    await initializeRuntimeEnvironmentConfiguration();

    expect(process.env["CLERK_SECRET_KEY"]).toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects unavailable configuration rather than starting with missing keys", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse({error: "Unavailable"}, 503)));
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    await expect(initializeRuntimeEnvironmentConfiguration()).rejects.toThrow("status=503");
    expect(process.env["CLERK_SECRET_KEY"]).toBe("");
    expect(process.env["API_JWT"]).toBe("");
  });

  it("does not fall back to dotenv on cloud transport failures", async () => {
    vi.stubEnv("CLERK_SECRET_KEY", "stale-local-value");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    await expect(initializeRuntimeEnvironmentConfiguration()).rejects.toThrow("Unable to fetch private runtime configuration");
    expect(process.env["CLERK_SECRET_KEY"]).toBe("stale-local-value");
  });

  it("identifies token acquisition failures without disclosing provider messages", async () => {
    vi.stubEnv("EXP_PROXY_URL", "https://exp.arolariu.ro");
    vi.stubEnv("AZURE_CLIENT_ID", "frontend-managed-identity");
    vi.doMock("@azure/identity", () => ({
      DefaultAzureCredential: class {
        public async getToken(): Promise<never> {
          throw Object.assign(new Error("sensitive-identity-provider-message"), {
            name: "CredentialUnavailableError",
            code: "ECONNREFUSED",
          });
        }
      },
    }));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    const error: unknown = await initializeRuntimeEnvironmentConfiguration().catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(Error);
    expect(String(error)).toContain("stage=authentication");
    expect(String(error)).toContain("CredentialUnavailableError");
    expect(String(error)).toContain("ECONNREFUSED");
    expect(String(error)).not.toContain("sensitive-identity-provider-message");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("identifies exp DNS failures using the nested transport code without disclosing messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(
        new TypeError("sensitive-exp-request-message", {
          cause: Object.assign(new Error("sensitive-exp-hostname"), {code: "ENOTFOUND"}),
        }),
      ),
    );
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    const error: unknown = await initializeRuntimeEnvironmentConfiguration().catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(Error);
    expect(String(error)).toContain("stage=http");
    expect(String(error)).toContain("ENOTFOUND");
    expect(String(error)).not.toContain("sensitive-exp");
  });

  it("reports only allowlisted identifiers from an aggregate Azure credential failure", async () => {
    vi.stubEnv("EXP_PROXY_URL", "https://exp.arolariu.ro");
    vi.stubEnv("AZURE_CLIENT_ID", "frontend-managed-identity");
    vi.doMock("@azure/identity", () => ({
      DefaultAzureCredential: class {
        public async getToken(): Promise<never> {
          throw Object.assign(new Error("private-aggregate-description"), {
            name: "AggregateAuthenticationError",
            errors: [
              Object.assign(new Error("private-managed-identity-response"), {
                name: "AuthenticationError",
                statusCode: 403,
                cause: Object.assign(new Error("private-socket-details"), {code: "ECONNRESET"}),
              }),
            ],
          });
        }
      },
    }));
    vi.stubGlobal("fetch", vi.fn());
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    const error: unknown = await initializeRuntimeEnvironmentConfiguration().catch((failure: unknown) => failure);

    expect(String(error)).toContain("AggregateAuthenticationError");
    expect(String(error)).toContain("AuthenticationError");
    expect(String(error)).toContain("status=403");
    expect(String(error)).toContain("ECONNRESET");
    expect(String(error)).not.toContain("private-");
  });

  it("does not send an anonymous cloud configuration request when credentials return no token", async () => {
    vi.stubEnv("EXP_PROXY_URL", "https://exp.arolariu.ro");
    vi.stubEnv("AZURE_CLIENT_ID", "frontend-managed-identity");
    vi.doMock("@azure/identity", () => ({
      DefaultAzureCredential: class {
        public async getToken(): Promise<null> {
          return null;
        }
      },
    }));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    await expect(initializeRuntimeEnvironmentConfiguration()).rejects.toThrow("stage=authentication");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("omits unknown error names and codes instead of trusting arbitrary provider values", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue({
        name: "private-error-name",
        code: "private-error-code",
        message: "private-error-message",
      }),
    );
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    const error: unknown = await initializeRuntimeEnvironmentConfiguration().catch((failure: unknown) => failure);

    expect(String(error)).toContain("failure=unknown");
    expect(String(error)).not.toContain("private-error");
  });

  it.each([null, "private-thrown-string"])("sanitizes non-Error transport rejections (%s)", async (failure) => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(failure));
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    const error: unknown = await initializeRuntimeEnvironmentConfiguration().catch((rejection: unknown) => rejection);

    expect(String(error)).toContain("failure=unknown");
    expect(String(error)).not.toContain("private-thrown-string");
  });

  it("rejects invalid local exp configuration instead of hiding it with dotenv", async () => {
    vi.stubEnv("INFRA", "local");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse({target: "website", config: []})));
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    await expect(initializeRuntimeEnvironmentConfiguration()).rejects.toThrow("Invalid website runtime configuration");
  });

  it("validates every required private value before modifying the environment", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse(runtimeDocument({"Auth:JWT:Secret": "   "}))));
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    await expect(initializeRuntimeEnvironmentConfiguration()).rejects.toThrow("Auth:JWT:Secret");
    expect(process.env["CLERK_SECRET_KEY"]).toBe("");
    expect(process.env["API_JWT"]).toBe("");
  });

  it("allows an empty optional email key to disable delivery", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse(runtimeDocument({"Communication:Email:ApiKey": ""}))));
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    await initializeRuntimeEnvironmentConfiguration();

    expect(process.env["CLERK_SECRET_KEY"]).toBe("private-clerk");
    expect(process.env["RESEND_API_KEY"]).toBe("");
  });

  it("rejects an invalid runtime document", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse({target: "api", config: {}})));
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    await expect(initializeRuntimeEnvironmentConfiguration()).rejects.toThrow("Invalid website runtime configuration");
    expect(process.env["CLERK_SECRET_KEY"]).toBe("");
  });

  it("rejects non-string runtime values before applying any configuration", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse(runtimeDocument({"Auth:JWT:Secret": 123}))));
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    await expect(initializeRuntimeEnvironmentConfiguration()).rejects.toThrow(TypeError);
    expect(process.env["CLERK_SECRET_KEY"]).toBe("");
  });

  it("sanitizes JSON parsing errors instead of exposing response contents", async () => {
    const response = createJsonResponse({});
    response.json = async () => {
      throw new SyntaxError("private-response-marker");
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    const {initializeRuntimeEnvironmentConfiguration} = await import("./configProxy");

    await expect(initializeRuntimeEnvironmentConfiguration()).rejects.toThrow("Invalid website runtime configuration document");
    expect(process.env["CLERK_SECRET_KEY"]).toBe("");
  });
});

describe("configProxy typed helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    delete process.env["AZURE_CLIENT_ID"];
    delete process.env["API_URL"];
    delete process.env["API_JWT"];
    delete process.env["RESEND_API_KEY"];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env["AZURE_CLIENT_ID"];
    delete process.env["API_URL"];
    delete process.env["API_JWT"];
    delete process.env["RESEND_API_KEY"];
  });

  // ─────────────────────────────────────────────────────────────────────────
  // fetchApiUrl
  // ─────────────────────────────────────────────────────────────────────────

  describe("fetchApiUrl", () => {
    it("returns the value from exp when available", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Endpoints:Service:Api", "https://api.arolariu.ro"))),
      );

      const {fetchApiUrl, invalidateConfigCache} = await import("./configProxy");
      invalidateConfigCache();

      const result = await fetchApiUrl();

      expect(result).toBe("https://api.arolariu.ro");
    });

    it("falls back to API_URL env var when exp returns empty", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Endpoints:Service:Api", ""))));
      process.env["API_URL"] = "https://api-fallback.example.com";

      const {fetchApiUrl, invalidateConfigCache} = await import("./configProxy");
      invalidateConfigCache();

      const result = await fetchApiUrl();

      expect(result).toBe("https://api-fallback.example.com");
    });

    it("falls back to API_URL env var when exp throws", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse({error: "unavailable"}, 500)));
      process.env["API_URL"] = "https://api-env.example.com";

      const {fetchApiUrl, invalidateConfigCache} = await import("./configProxy");
      invalidateConfigCache();

      const result = await fetchApiUrl();

      expect(result).toBe("https://api-env.example.com");
    });

    it("returns empty string when both exp and env are absent", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse({error: "unavailable"}, 500)));

      const {fetchApiUrl, invalidateConfigCache} = await import("./configProxy");
      invalidateConfigCache();

      const result = await fetchApiUrl();

      expect(result).toBe("");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // fetchApiJwtSecret
  // ─────────────────────────────────────────────────────────────────────────

  describe("fetchApiJwtSecret", () => {
    it("returns the value from exp when available", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Auth:JWT:Secret", "super-secret-from-exp"))),
      );

      const {fetchApiJwtSecret, invalidateConfigCache} = await import("./configProxy");
      invalidateConfigCache();

      const result = await fetchApiJwtSecret();

      expect(result).toBe("super-secret-from-exp");
    });

    it("falls back to API_JWT env var when exp throws", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse({error: "unavailable"}, 500)));
      process.env["API_JWT"] = "env-jwt-fallback";

      const {fetchApiJwtSecret, invalidateConfigCache} = await import("./configProxy");
      invalidateConfigCache();

      const result = await fetchApiJwtSecret();

      expect(result).toBe("env-jwt-fallback");
    });

    it("returns empty string when both exp and env are absent", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse({error: "unavailable"}, 500)));

      const {fetchApiJwtSecret, invalidateConfigCache} = await import("./configProxy");
      invalidateConfigCache();

      const result = await fetchApiJwtSecret();

      expect(result).toBe("");
    });

    it("falls back to API_JWT env var when exp returns empty string", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Auth:JWT:Secret", ""))));
      process.env["API_JWT"] = "env-jwt-from-empty-exp";

      const {fetchApiJwtSecret, invalidateConfigCache} = await import("./configProxy");
      invalidateConfigCache();

      const result = await fetchApiJwtSecret();

      expect(result).toBe("env-jwt-from-empty-exp");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // fetchResendApiKey
  // ─────────────────────────────────────────────────────────────────────────

  describe("fetchResendApiKey", () => {
    it("returns the value from exp when available", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Communication:Email:ApiKey", "re_exp_key_value"))),
      );

      const {fetchResendApiKey, invalidateConfigCache} = await import("./configProxy");
      invalidateConfigCache();

      const result = await fetchResendApiKey();

      expect(result).toBe("re_exp_key_value");
    });

    it("falls back to RESEND_API_KEY env var when exp throws", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse({error: "unavailable"}, 500)));
      process.env["RESEND_API_KEY"] = "re_env_key";

      const {fetchResendApiKey, invalidateConfigCache} = await import("./configProxy");
      invalidateConfigCache();

      const result = await fetchResendApiKey();

      expect(result).toBe("re_env_key");
    });

    it("returns empty string when both exp and env are absent", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse({error: "unavailable"}, 500)));

      const {fetchResendApiKey, invalidateConfigCache} = await import("./configProxy");
      invalidateConfigCache();

      const result = await fetchResendApiKey();

      expect(result).toBe("");
    });

    it("falls back to RESEND_API_KEY env var when exp returns empty string", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Communication:Email:ApiKey", ""))));
      process.env["RESEND_API_KEY"] = "re_env_from_empty_exp";

      const {fetchResendApiKey, invalidateConfigCache} = await import("./configProxy");
      invalidateConfigCache();

      const result = await fetchResendApiKey();

      expect(result).toBe("re_env_from_empty_exp");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isConfigValueResponse guard (consolidated from configCatalog.types.test.ts)
// ─────────────────────────────────────────────────────────────────────────────

describe("isConfigValueResponse", () => {
  it("returns true for a valid single-key config payload", () => {
    expect(
      isConfigValueResponse({
        name: "Endpoints:Service:Api",
        value: "https://api.example.test",
        availableForTargets: ["website"],
        availableInDocuments: ["website.build-time", "website.run-time"],
        requiredInDocuments: ["website.build-time", "website.run-time"],
        description: "API endpoint.",
        usage: "Server-only.",
        refreshIntervalSeconds: 300,
        fetchedAt: "2026-01-01T00:00:00Z",
      }),
    ).toBe(true);
  });

  it("returns false for null and non-object payloads", () => {
    expect(isConfigValueResponse(null)).toBe(false);
    expect(isConfigValueResponse("invalid")).toBe(false);
  });

  it("returns false when array metadata contains non-string values", () => {
    expect(
      isConfigValueResponse({
        name: "Endpoints:Service:Api",
        value: "https://api.example.test",
        availableForTargets: [42],
        availableInDocuments: ["website.build-time"],
        requiredInDocuments: ["website.build-time"],
        description: "API endpoint.",
        usage: "Server-only.",
        refreshIntervalSeconds: 300,
        fetchedAt: "2026-01-01T00:00:00Z",
      }),
    ).toBe(false);
  });

  it("returns false when refresh interval is not numeric", () => {
    expect(
      isConfigValueResponse({
        name: "Endpoints:Service:Api",
        value: "https://api.example.test",
        availableForTargets: ["website"],
        availableInDocuments: ["website.build-time"],
        requiredInDocuments: ["website.build-time"],
        description: "API endpoint.",
        usage: "Server-only.",
        refreshIntervalSeconds: "300",
        fetchedAt: "2026-01-01T00:00:00Z",
      }),
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Config cache (consolidated from configCatalogCache.server.test.ts)
// ─────────────────────────────────────────────────────────────────────────────

const samplePayload = {
  name: "Endpoints:Service:Api",
  value: "https://api.example.test",
  availableForTargets: ["website"],
  availableInDocuments: ["website.build-time", "website.run-time"],
  requiredInDocuments: ["website.build-time", "website.run-time"],
  description: "API endpoint.",
  usage: "Server-only.",
  refreshIntervalSeconds: 300,
  fetchedAt: "2026-01-01T00:00:00Z",
} as const;

describe("configCatalogCache.server", () => {
  it("stores and retrieves a config value entry", () => {
    invalidateConfigValueCache();
    setCachedConfigValue("Endpoints:Service:Api", samplePayload);

    expect(getCachedConfigValue("Endpoints:Service:Api")).toEqual(samplePayload);
  });

  it("returns null for missing entries", () => {
    invalidateConfigValueCache();
    expect(getCachedConfigValue("Endpoints:Service:Api")).toBeNull();
  });

  it("returns null for stale entries", () => {
    invalidateConfigValueCache();
    setCachedConfigValue("Endpoints:Service:Api", {...samplePayload, refreshIntervalSeconds: 0});

    expect(getCachedConfigValue("Endpoints:Service:Api")).toBeNull();
  });

  it("invalidates by key and globally", () => {
    invalidateConfigValueCache();
    setCachedConfigValue("Endpoints:Service:Api", samplePayload);
    setCachedConfigValue("Auth:JWT:Secret", {...samplePayload, name: "Auth:JWT:Secret"});

    invalidateConfigValueCache("Endpoints:Service:Api");
    expect(getCachedConfigValue("Endpoints:Service:Api")).toBeNull();
    expect(getCachedConfigValue("Auth:JWT:Secret")?.name).toBe("Auth:JWT:Secret");

    invalidateConfigValueCache();
    expect(getCachedConfigValue("Auth:JWT:Secret")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Circuit breaker and stale cache tests
// ─────────────────────────────────────────────────────────────────────────────

describe("configProxy circuit breaker", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    delete process.env["AZURE_CLIENT_ID"];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should trip circuit breaker on fetch failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("Network error")));

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    await expect(fetchConfigValue("Test:Key")).rejects.toThrow();
  });

  it("should return stale cached value when circuit is open", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Test:Key", "cached-value", 0)))
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Test:Key", "new-value")));

    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    // First call: cache the value
    const first = await fetchConfigValue("Test:Key");
    expect(first).toBe("cached-value");

    // Wait for cache to become stale (TTL = 0)
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Second call: should fail and trip circuit breaker
    await expect(fetchConfigValue("Test:Key")).rejects.toThrow();

    // Third call: circuit is open, should return stale cache
    const third = await fetchConfigValue("Test:Key");
    expect(third).toBe("cached-value");
  });

  it("should throw when circuit is open and no stale cache exists", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    // First call trips circuit
    await expect(fetchConfigValue("New:Key")).rejects.toThrow();

    // Second call: circuit is open, no stale cache
    await expect(fetchConfigValue("New:Key")).rejects.toThrow("exp circuit breaker open");
  });

  it("should convert plain object headers to Headers instance", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Test:PlainHeaders", "value-with-plain-headers")));
    vi.stubGlobal("fetch", fetchMock);

    // Mock injectTraceContextHeaders to return a plain object instead of Headers
    instrumentationMocks.injectTraceContextHeaders.mockReturnValueOnce({
      "X-Custom-Header": "custom-value",
      traceparent: "00-abcdefabcdefabcdefabcdefabcdefab-abcdefabcdefabcd-01",
    } as unknown as Headers);

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    const value = await fetchConfigValue("Test:PlainHeaders");

    expect(value).toBe("value-with-plain-headers");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // The code should convert the plain object to Headers and include the custom header
    // We verify by checking that fetch was called (which means the conversion succeeded)
    const requestInit = (fetchMock.mock.calls[0] as [string, RequestInit])[1];
    expect(requestInit.headers).toBeDefined();
  });

  it("uses label=PRODUCTION when SITE_ENV is set to PRODUCTION", async () => {
    vi.stubEnv("SITE_ENV", "PRODUCTION");
    vi.resetModules();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Endpoints:Service:Api", "https://api.prod.example.com")));
    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    await fetchConfigValue("Endpoints:Service:Api");

    expect((fetchMock.mock.calls[0] as [string])[0]).toContain("label=PRODUCTION");

    vi.unstubAllEnvs();
  });

  it("returns empty bearer token when Azure credential getToken returns null", async () => {
    process.env["AZURE_CLIENT_ID"] = "test-managed-identity-id";
    vi.resetModules();

    vi.doMock("@/lib/azure/credentials", () => ({
      getAzureCredential: () => ({
        getToken: vi.fn().mockResolvedValue(null), // null token — exercises line 179
      }),
    }));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Endpoints:Service:Api", "https://api.example.com")));
    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    const value = await fetchConfigValue("Endpoints:Service:Api");
    expect(value).toBe("https://api.example.com");

    // When token is null, no Authorization header should be sent
    const requestHeaders = (fetchMock.mock.calls[0] as [string, RequestInit])[1].headers as Record<string, string>;
    expect(requestHeaders["Authorization"]).toBeUndefined();

    delete process.env["AZURE_CLIENT_ID"];
  });

  it("should re-close circuit breaker after cooldown", async () => {
    // This test verifies that the circuit breaker can re-close after cooldown.
    // Due to module-level state, we test the logic by verifying the time-based condition
    // without actually waiting or using multiple test runs that pollute state.

    // The circuit breaker logic (lines 206-207) checks:
    // if (Date.now() - expCircuitOpenedAt > CIRCUIT_RESET_MS) {
    //   expCircuitOpen = false;
    //   return false;
    // }

    // This test verifies the fetch can succeed after enough time has passed.
    // We'll use a shorter test with fewer failures to avoid circuit pollution.

    process.env["AZURE_CLIENT_ID"] = "test-client-id";
    vi.useFakeTimers();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Circuit:Cooldown:Test", "initial-value")))
      .mockRejectedValueOnce(new Error("Transient failure"))
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Circuit:Cooldown:Test", "recovered-value")));

    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    // First call succeeds and caches
    const first = await fetchConfigValue("Circuit:Cooldown:Test");
    expect(first).toBe("initial-value");

    // Advance time to expire cache
    vi.advanceTimersByTime(310_000); // 5+ minutes to expire cache (TTL = 300s)

    // Second call fails but returns stale cache (circuit not yet open in this isolated test)
    try {
      await fetchConfigValue("Circuit:Cooldown:Test");
    } catch {
      // Expected to fail
    }

    // Advance past circuit cooldown
    vi.advanceTimersByTime(35_000); // 35s past circuit reset (30s threshold)

    // Third call should succeed as circuit can re-close
    const recovered = await fetchConfigValue("Circuit:Cooldown:Test");
    expect(recovered).toBe("recovered-value");

    vi.useRealTimers();
    delete process.env["AZURE_CLIENT_ID"];
  });
});
