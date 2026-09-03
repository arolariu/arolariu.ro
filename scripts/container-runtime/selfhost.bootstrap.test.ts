/**
 * @fileoverview Tests for the injected local Cosmos/Azurite selfhost storage bootstrap adapter.
 * @module scripts/container-runtime/selfhost.bootstrap.test
 */

import {describe, expect, it, vi} from "vitest";
import {createHttpResponse} from "../common/runtime.testing.ts";
import {CommandCancellation, type HttpClient, type HttpRequest, type HttpResponse} from "../common/runtime.ts";
import {
  azuriteDevelopmentConnectionString,
  cosmosBootstrapMaximumResponseBytes,
  createLocalStorageBootstrap,
  localCosmosEndpoint,
  requiredAzuriteBlobContainers,
  type LocalBlobStorage,
  type LocalBlobStorageFactory,
} from "./selfhost.bootstrap.ts";
import {ContainerRuntimeError} from "./types.ts";

type RecordingHttpClient = HttpClient & Readonly<{requests: readonly HttpRequest[]}>;

/**
 * Creates an HTTP client that records every request and replays scripted responses.
 *
 * @param responses - Responses returned in order; a `201 Created` response is returned once exhausted.
 * @returns A recording HTTP capability that performs no network I/O.
 */
function createRecordingHttpClient(responses: readonly HttpResponse[] = []): RecordingHttpClient {
  const requests: HttpRequest[] = [];
  const queue = [...responses];

  return {
    request: (request: Readonly<HttpRequest>): Promise<HttpResponse> => {
      requests.push(request);
      return Promise.resolve(queue.shift() ?? createHttpResponse(201, "{}"));
    },
    requests,
  };
}

interface RecordingBlobStorage {
  readonly factory: LocalBlobStorageFactory;
  readonly connectionStrings: readonly string[];
  readonly operations: readonly string[];
  readonly signals: readonly AbortSignal[];
}

/**
 * Creates a blob-storage factory that records every provisioning operation.
 *
 * @param behavior - Optional failure behavior layered over the recording fake.
 * @returns A recording blob-storage factory that never touches Azurite.
 */
function createRecordingBlobStorage(behavior: Readonly<Partial<LocalBlobStorage>> = {}): RecordingBlobStorage {
  const connectionStrings: string[] = [];
  const operations: string[] = [];
  const signals: AbortSignal[] = [];

  const factory: LocalBlobStorageFactory = (connectionString: string): LocalBlobStorage => {
    connectionStrings.push(connectionString);
    return {
      ensureContainer: async (name: string, signal: AbortSignal): Promise<void> => {
        operations.push(`ensureContainer:${name}`);
        signals.push(signal);
        await behavior.ensureContainer?.(name, signal);
      },
      applyCorsPolicy: async (signal: AbortSignal): Promise<void> => {
        operations.push("applyCorsPolicy");
        signals.push(signal);
        await behavior.applyCorsPolicy?.(signal);
      },
    };
  };

  return {factory, connectionStrings, operations, signals};
}

function abortedSignal(): AbortSignal {
  const controller = new AbortController();
  controller.abort(new CommandCancellation("Terminated by test signal.", 143));
  return controller.signal;
}

describe("createLocalStorageBootstrap.ensureCosmos", () => {
  it("provisions the database and every required container at the documented emulator endpoint", async () => {
    const http = createRecordingHttpClient();
    const bootstrap = createLocalStorageBootstrap({http, createBlobStorage: createRecordingBlobStorage().factory});

    await expect(bootstrap.ensureCosmos(new AbortController().signal)).resolves.toBeUndefined();

    expect(http.requests.map((request) => [request.method, request.url.href])).toEqual([
      ["POST", `${localCosmosEndpoint}/dbs`],
      ["POST", `${localCosmosEndpoint}/dbs/primary/colls`],
      ["POST", `${localCosmosEndpoint}/dbs/primary/colls`],
    ]);
    expect(http.requests.map((request) => request.body)).toEqual([
      JSON.stringify({id: "primary"}),
      JSON.stringify({id: "invoices", partitionKey: {paths: ["/UserIdentifier"], kind: "Hash"}}),
      JSON.stringify({id: "merchants", partitionKey: {paths: ["/ParentCompanyId"], kind: "Hash"}}),
    ]);
    expect(http.requests.every((request) => request.headers?.["Content-Type"] === "application/json")).toBe(true);
  });

  it("bounds every buffered response body through the runtime HTTP contract", async () => {
    const http = createRecordingHttpClient();
    const bootstrap = createLocalStorageBootstrap({http, createBlobStorage: createRecordingBlobStorage().factory});

    await bootstrap.ensureCosmos(new AbortController().signal);

    expect(http.requests.every((request) => request.maximumResponseBytes === cosmosBootstrapMaximumResponseBytes)).toBe(true);
  });

  it("threads the invocation signal into every emulator request", async () => {
    const controller = new AbortController();
    const http = createRecordingHttpClient();
    const bootstrap = createLocalStorageBootstrap({http, createBlobStorage: createRecordingBlobStorage().factory});

    await bootstrap.ensureCosmos(controller.signal);

    expect(http.requests.every((request) => request.signal === controller.signal)).toBe(true);
  });

  it("treats an already-provisioned resource reported as HTTP 409 as success", async () => {
    const http = createRecordingHttpClient([
      createHttpResponse(409, "Conflict"),
      createHttpResponse(409, "Conflict"),
      createHttpResponse(409, "Conflict"),
    ]);
    const bootstrap = createLocalStorageBootstrap({http, createBlobStorage: createRecordingBlobStorage().factory});

    await expect(bootstrap.ensureCosmos(new AbortController().signal)).resolves.toBeUndefined();
    expect(http.requests).toHaveLength(3);
  });

  it("returns a bounded status/body failure for an unexpected response and stops immediately", async () => {
    const http = createRecordingHttpClient([createHttpResponse(500, "x".repeat(10_000))]);
    const bootstrap = createLocalStorageBootstrap({http, createBlobStorage: createRecordingBlobStorage().factory});

    const failure = await bootstrap.ensureCosmos(new AbortController().signal).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ContainerRuntimeError);
    const message = failure instanceof Error ? failure.message : "";
    expect(message).toContain("Cosmos bootstrap failed");
    expect(message).toContain(`${localCosmosEndpoint}/dbs`);
    expect(message).toContain("HTTP 500");
    expect(message.length).toBeLessThan(2_000);
    expect(http.requests).toHaveLength(1);
  });

  it("rejects with the invocation's cancellation reason without sending a request", async () => {
    const http = createRecordingHttpClient();
    const bootstrap = createLocalStorageBootstrap({http, createBlobStorage: createRecordingBlobStorage().factory});

    await expect(bootstrap.ensureCosmos(abortedSignal())).rejects.toMatchObject({
      name: "CommandCancellation",
      exitCode: 143,
      message: "Terminated by test signal.",
    });
    expect(http.requests).toHaveLength(0);
  });
});

describe("createLocalStorageBootstrap.ensureAzurite", () => {
  it("creates every required container and applies the local CORS policy through the injected factory", async () => {
    const blobs = createRecordingBlobStorage();
    const bootstrap = createLocalStorageBootstrap({http: createRecordingHttpClient(), createBlobStorage: blobs.factory});

    await expect(bootstrap.ensureAzurite(new AbortController().signal)).resolves.toBeUndefined();

    expect(blobs.connectionStrings).toEqual([azuriteDevelopmentConnectionString]);
    expect(azuriteDevelopmentConnectionString).toBe("UseDevelopmentStorage=true");
    expect(blobs.operations).toEqual([
      ...requiredAzuriteBlobContainers.map((container) => `ensureContainer:${container}`),
      "applyCorsPolicy",
    ]);
    expect(requiredAzuriteBlobContainers).toEqual(["invoices"]);
  });

  it("threads the invocation signal into every blob operation", async () => {
    const controller = new AbortController();
    const blobs = createRecordingBlobStorage();
    const bootstrap = createLocalStorageBootstrap({http: createRecordingHttpClient(), createBlobStorage: blobs.factory});

    await bootstrap.ensureAzurite(controller.signal);

    expect(blobs.signals.every((signal) => signal === controller.signal)).toBe(true);
  });

  it("never exposes storage credentials in a wrapped provisioning failure", async () => {
    const blobs = createRecordingBlobStorage({
      ensureContainer: (): Promise<void> =>
        Promise.reject(new Error("PUT failed for BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;AccountKey=s3cr3tLocalKeyValue==;")),
    });
    const bootstrap = createLocalStorageBootstrap({http: createRecordingHttpClient(), createBlobStorage: blobs.factory});

    const failure = await bootstrap.ensureAzurite(new AbortController().signal).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ContainerRuntimeError);
    const message = failure instanceof Error ? failure.message : "";
    expect(message).toContain("Azurite bootstrap failed");
    expect(message).toContain("[REDACTED]");
    expect(message).not.toContain("s3cr3tLocalKeyValue==");
    expect(message.length).toBeLessThan(2_000);
  });

  it("rejects with the invocation's cancellation reason without constructing a blob client", async () => {
    const blobs = createRecordingBlobStorage();
    const bootstrap = createLocalStorageBootstrap({http: createRecordingHttpClient(), createBlobStorage: blobs.factory});

    await expect(bootstrap.ensureAzurite(abortedSignal())).rejects.toMatchObject({
      name: "CommandCancellation",
      exitCode: 143,
      message: "Terminated by test signal.",
    });
    expect(blobs.connectionStrings).toEqual([]);
  });
});

describe("createLocalStorageBootstrap diagnostics", () => {
  it("writes nothing to the console while succeeding or failing", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => undefined),
    );
    const blobs = createRecordingBlobStorage({
      applyCorsPolicy: (): Promise<void> => Promise.reject(new Error("AccountKey=anotherLocalKey==")),
    });
    const bootstrap = createLocalStorageBootstrap({
      http: createRecordingHttpClient([createHttpResponse(503, "unavailable")]),
      createBlobStorage: blobs.factory,
    });

    try {
      await bootstrap.ensureCosmos(new AbortController().signal).catch(() => undefined);
      await bootstrap.ensureAzurite(new AbortController().signal).catch(() => undefined);

      expect(spies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    } finally {
      for (const spy of spies) {
        spy.mockRestore();
      }
    }
  });
});
