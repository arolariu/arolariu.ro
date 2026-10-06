// @vitest-environment node
/**
 * @fileoverview Tests for the local Cosmos/Azurite selfhost storage bootstrap.
 * @module scripts/container-runtime/selfhost.bootstrap.test
 *
 * @remarks
 * `ensureCosmos` runs over the harness `HttpClient` with scripted emulator answers (or a client whose
 * requests never complete, for interruption); `ensureAzurite` runs over a recording
 * `LocalBlobStorage` layer. `LocalBlobStorageLive` is exercised only on a malformed connection string,
 * which the Azure Blob SDK rejects before any request, so no test reaches Cosmos or Azurite.
 */

import {Effect, Exit, Fiber, Layer, Redacted} from "effect";
import {HttpClient} from "effect/http";
import {describe, expect, it, vi} from "vitest";

import {effectTest, makeTestLayer, type ScriptedHttp} from "../platform/testing.ts";
import {
  azuriteBootstrapFailure,
  azuriteDevelopmentConnectionString,
  cosmosBootstrapMaximumResponseBytes,
  ensureAzurite,
  ensureCosmos,
  LocalBlobStorage,
  LocalBlobStorageLive,
  localCosmosEndpoint,
  requiredAzuriteBlobContainers,
} from "./selfhost.bootstrap.ts";
import {ContainerRuntimeError} from "./types.ts";

/** The wrapped-failure prefix of every Cosmos bootstrap failure. */
const COSMOS_PREFIX =
  "Cosmos bootstrap failed. Ensure the cosmosdb container is running and reachable at http://localhost:8081. Original error: ";

/**
 * Scripts every Cosmos request with the same answer.
 *
 * @param status - Response status.
 * @param body - Response body.
 * @returns The scripted HTTP responses.
 */
function cosmosAnswers(status: number, body: string): readonly ScriptedHttp[] {
  return [{match: (request) => request.url.startsWith(localCosmosEndpoint), respond: {status, body}}];
}

/** Recording blob storage plus the operations it saw. */
interface RecordingBlobStorage {
  readonly layer: Layer.Layer<LocalBlobStorage>;
  readonly operations: () => readonly string[];
}

/**
 * Builds a blob storage layer that records every operation.
 *
 * @param failOn - Operation (`ensureContainer:<name>` or `applyCorsPolicy`) that fails.
 * @returns The layer and its recorded operations.
 */
function recordingBlobStorage(failOn?: string): RecordingBlobStorage {
  const operations: string[] = [];
  const step = (operation: string, connectionString: Redacted.Redacted<string>): Effect.Effect<void, ContainerRuntimeError> =>
    Effect.suspend(() => {
      operations.push(`${operation}@${Redacted.value(connectionString)}`);
      return operation === failOn ? Effect.fail(new ContainerRuntimeError({message: `${operation} failed`})) : Effect.void;
    });
  return {
    layer: Layer.succeed(
      LocalBlobStorage,
      LocalBlobStorage.of({
        ensureContainer: (connectionString, name) => step(`ensureContainer:${name}`, connectionString),
        applyCorsPolicy: (connectionString) => step("applyCorsPolicy", connectionString),
      }),
    ),
    operations: () => [...operations],
  };
}

describe("ensureCosmos", () => {
  {
    const harness = makeTestLayer({http: cosmosAnswers(201, "{}")});
    effectTest(
      "provisions the database and every required container at the documented emulator endpoint",
      () =>
        Effect.gen(function* () {
          // Act
          yield* ensureCosmos.pipe(Effect.withSpan("selfhost.bootstrap.test"));

          // Assert
          const calls = harness.httpCalls();
          expect(calls.map((request) => [request.method, request.url])).toEqual([
            ["POST", `${localCosmosEndpoint}/dbs`],
            ["POST", `${localCosmosEndpoint}/dbs/primary/colls`],
            ["POST", `${localCosmosEndpoint}/dbs/primary/colls`],
          ]);
          expect(calls.map((request) => (request.body._tag === "Uint8Array" ? request.body.text : undefined))).toEqual([
            JSON.stringify({id: "primary"}),
            JSON.stringify({id: "invoices", partitionKey: {paths: ["/UserIdentifier"], kind: "Hash"}}),
            JSON.stringify({id: "merchants", partitionKey: {paths: ["/ParentCompanyId"], kind: "Hash"}}),
          ]);
          expect(calls.every((request) => request.body._tag === "Uint8Array" && request.body.contentType === "application/json")).toBe(
            true,
          );
          expect(calls.every((request) => !("traceparent" in request.headers) && !("b3" in request.headers))).toBe(true);
        }),
      harness.layer,
    );
  }

  {
    const harness = makeTestLayer({http: cosmosAnswers(409, "Conflict")});
    effectTest(
      "treats an already-provisioned resource reported as HTTP 409 as success",
      () =>
        Effect.gen(function* () {
          // Act
          yield* ensureCosmos;

          // Assert
          expect(harness.httpCalls()).toHaveLength(3);
        }),
      harness.layer,
    );
  }

  {
    const harness = makeTestLayer({http: cosmosAnswers(500, "x".repeat(10_000))});
    effectTest(
      "returns a bounded status/body failure for an unexpected response and stops immediately",
      () =>
        Effect.gen(function* () {
          // Act
          const error = yield* Effect.flip(ensureCosmos);

          // Assert
          expect(error).toBeInstanceOf(ContainerRuntimeError);
          expect(error.message.startsWith(`${COSMOS_PREFIX}Cosmos bootstrap failed for ${localCosmosEndpoint}/dbs: HTTP 500 xxx`)).toBe(
            true,
          );
          expect(error.message.length).toBeLessThan(2_000);
          expect(harness.httpCalls()).toHaveLength(1);
        }),
      harness.layer,
    );
  }

  {
    const harness = makeTestLayer({http: cosmosAnswers(201, "x".repeat(cosmosBootstrapMaximumResponseBytes + 1))});
    effectTest(
      "bounds the cosmos bootstrap response",
      () =>
        Effect.gen(function* () {
          // Act
          const error = yield* Effect.flip(ensureCosmos);

          // Assert
          expect(error).toBeInstanceOf(ContainerRuntimeError);
          expect(error.message).toBe(`${COSMOS_PREFIX}Response exceeded the 65536 byte limit.`);
          expect(harness.httpCalls()).toHaveLength(1);
        }),
      harness.layer,
    );
  }

  {
    const harness = makeTestLayer({http: cosmosAnswers(201, "x".repeat(cosmosBootstrapMaximumResponseBytes))});
    effectTest(
      "accepts a response body of exactly the bound",
      () =>
        Effect.gen(function* () {
          // Act
          yield* ensureCosmos;

          // Assert
          expect(harness.httpCalls()).toHaveLength(3);
        }),
      harness.layer,
    );
  }

  {
    const harness = makeTestLayer({http: cosmosAnswers(503, "AccountKey=s3cr3tCosmosKey==; emulator starting")});
    effectTest(
      "strips storage credentials from a wrapped failure",
      () =>
        Effect.gen(function* () {
          // Act
          const error = yield* Effect.flip(ensureCosmos);

          // Assert
          expect(error.message).toBe(
            `${COSMOS_PREFIX}Cosmos bootstrap failed for ${localCosmosEndpoint}/dbs: HTTP 503 AccountKey=[REDACTED]; emulator starting`,
          );
        }),
      harness.layer,
    );
  }

  {
    let requests = 0;
    const hanging = Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make(() => {
        requests += 1;
        return Effect.never;
      }),
    );
    effectTest(
      "stops at the in-flight request when interrupted",
      () =>
        Effect.gen(function* () {
          // Arrange
          const fiber = yield* Effect.forkChild(ensureCosmos);
          while (requests === 0) {
            yield* Effect.yieldNow;
          }

          // Act
          const exit = yield* Fiber.interrupt(fiber).pipe(Effect.andThen(Fiber.await(fiber)));

          // Assert
          expect(Exit.hasInterrupts(exit)).toBe(true);
          expect(requests).toBe(1);
        }),
      hanging,
    );
  }
});

describe("ensureAzurite", () => {
  {
    const blobs = recordingBlobStorage();
    effectTest(
      "creates every required container, then applies the local CORS policy, with the development connection string",
      () =>
        Effect.gen(function* () {
          // Act
          yield* ensureAzurite;

          // Assert
          expect(blobs.operations()).toEqual([
            ...requiredAzuriteBlobContainers.map((container) => `ensureContainer:${container}@UseDevelopmentStorage=true`),
            "applyCorsPolicy@UseDevelopmentStorage=true",
          ]);
          expect(requiredAzuriteBlobContainers).toEqual(["invoices"]);
        }),
      blobs.layer,
    );
  }

  {
    const blobs = recordingBlobStorage("ensureContainer:invoices");
    effectTest(
      "stops at the first failed operation and keeps its failure",
      () =>
        Effect.gen(function* () {
          // Act
          const error = yield* Effect.flip(ensureAzurite);

          // Assert
          expect(error.message).toBe("ensureContainer:invoices failed");
          expect(blobs.operations()).toEqual(["ensureContainer:invoices@UseDevelopmentStorage=true"]);
        }),
      blobs.layer,
    );
  }

  it("types the development connection string as a redacted value", () => {
    expect(Redacted.value(azuriteDevelopmentConnectionString)).toBe("UseDevelopmentStorage=true");
    expect(String(azuriteDevelopmentConnectionString)).not.toContain("UseDevelopmentStorage");
  });
});

describe("azuriteBootstrapFailure", () => {
  it("never exposes storage credentials and bounds the detail", () => {
    // Act
    const error = azuriteBootstrapFailure(
      new Error(
        `PUT failed for BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;AccountKey=s3cr3tLocalKeyValue==;${"x".repeat(5_000)}`,
      ),
    );

    // Assert
    expect(error).toBeInstanceOf(ContainerRuntimeError);
    expect(
      error.message.startsWith(
        "Azurite bootstrap failed. Ensure the azurite container is running and reachable at http://localhost:10000. Original error: PUT failed",
      ),
    ).toBe(true);
    expect(error.message).toContain("AccountKey=[REDACTED]");
    expect(error.message).not.toContain("s3cr3tLocalKeyValue==");
    expect(error.message.length).toBeLessThan(2_000);
  });

  it("describes a non-error rejection", () => {
    expect(azuriteBootstrapFailure("Sig=abc").message).toBe(
      "Azurite bootstrap failed. Ensure the azurite container is running and reachable at http://localhost:10000. Original error: Sig=[REDACTED]",
    );
  });
});

describe("LocalBlobStorageLive", () => {
  for (const operation of ["ensureContainer", "applyCorsPolicy"] as const) {
    effectTest(
      `${operation} fails with the Azurite bootstrap failure when the client cannot be built`,
      () =>
        Effect.gen(function* () {
          // Arrange
          const storage = yield* LocalBlobStorage;
          const connectionString = Redacted.make("AccountKey=s3cr3tLocalKeyValue==;not-a-connection-string");

          // Act
          const error = yield* Effect.flip(
            operation === "ensureContainer"
              ? storage.ensureContainer(connectionString, "invoices")
              : storage.applyCorsPolicy(connectionString),
          );

          // Assert
          expect(error.message.startsWith("Azurite bootstrap failed. Ensure the azurite container is running")).toBe(true);
          expect(error.message).not.toContain("s3cr3tLocalKeyValue==");
        }),
      LocalBlobStorageLive,
    );
  }
});

describe("bootstrap diagnostics", () => {
  const harness = makeTestLayer({http: cosmosAnswers(503, "unavailable")});
  effectTest(
    "writes nothing to the console or the output while failing",
    () =>
      Effect.gen(function* () {
        // Arrange
        const spies = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
          vi.spyOn(console, method).mockImplementation(() => undefined),
        );

        // Act
        yield* Effect.flip(ensureCosmos);
        yield* Effect.flip(ensureAzurite.pipe(Effect.provide(recordingBlobStorage("applyCorsPolicy").layer)));

        // Assert
        expect(spies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
        expect(harness.output()).toEqual([]);
      }),
    harness.layer,
  );
});
