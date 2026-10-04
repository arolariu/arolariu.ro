/**
 * @fileoverview Local Cosmos and Azurite storage bootstrap for selfhost mode.
 * @module scripts/container-runtime/selfhost.bootstrap
 *
 * @remarks
 * This module is the only place the Azure Blob SDK is constructed: `BlobServiceClient` stays behind
 * the {@link LocalBlobStorage} service, whose {@link LocalBlobStorageLive} layer the `dev selfhost`
 * handler provides, so tests provide a recording layer instead of reaching Azurite. Cosmos
 * provisioning ({@link ensureCosmos}) goes through the Effect `HttpClient` and reads every response
 * body with the {@link cosmosBootstrapMaximumResponseBytes} bound. Nothing here logs: every failure
 * is a {@link ContainerRuntimeError} whose diagnostic text is bounded and stripped of storage
 * credentials. Cancellation is fiber interruption, which aborts the in-flight request or blob call.
 */

import {BlobServiceClient} from "@azure/storage-blob";
import {Context, Effect, Layer, Redacted} from "effect";
import {HttpClient, HttpClientRequest, type HttpClientError} from "effect/http";

import {readBoundedText, type ResponseTooLarge} from "../platform/Http.ts";
import {ContainerRuntimeError} from "./types.ts";

/** Cosmos DB emulator endpoint the local selfhost stack exposes. */
export const localCosmosEndpoint = "http://localhost:8081";

/** Azurite blob endpoint referenced by local selfhost bootstrap diagnostics. */
export const localAzuriteBlobEndpoint = "http://localhost:10000";

/**
 * Azurite's documented development storage connection string.
 *
 * @remarks
 * The development account name and key this flag expands to are public Azurite emulator
 * constants, not production credentials, and are only ever used against localhost Azurite. It is
 * still typed `Redacted` like every other connection string and unwrapped only by the call that
 * needs the raw value.
 *
 * @see {@link https://learn.microsoft.com/azure/storage/common/storage-use-azurite}
 */
export const azuriteDevelopmentConnectionString: Redacted.Redacted<string> = Redacted.make("UseDevelopmentStorage=true");

/** Maximum number of Cosmos emulator response bytes buffered for one bootstrap request. */
export const cosmosBootstrapMaximumResponseBytes = 65_536;

/** Blob containers the local selfhost stack requires before the application starts. */
export const requiredAzuriteBlobContainers: readonly string[] = ["invoices"];

/** Cosmos database the local selfhost stack provisions. */
const cosmosDatabaseId = "primary";

/** Cosmos containers the local selfhost stack provisions, with their exact partition keys. */
const requiredCosmosContainers = [
  {id: "invoices", partitionKey: {paths: ["/UserIdentifier"], kind: "Hash"}},
  {id: "merchants", partitionKey: {paths: ["/ParentCompanyId"], kind: "Hash"}},
] as const;

/** CORS policy applied to local blob storage so browser-based local development can read blobs. */
const localBlobCorsRules = [
  {
    allowedOrigins: "*",
    allowedMethods: "GET,HEAD,OPTIONS",
    allowedHeaders: "*",
    exposedHeaders: "*",
    maxAgeInSeconds: 3_600,
  },
];

/** Maximum length of a wrapped bootstrap failure detail. */
const maximumBootstrapDiagnosticLength = 1_000;

/** Maximum length of a response-body excerpt embedded in a bootstrap failure. */
const maximumResponseDiagnosticLength = 500;

/** Matches storage credential assignments so they never reach a returned diagnostic. */
const storageCredentialPattern = /(AccountKey|SharedAccessSignature|Sig)=[^;\s"']*/giu;

/** Blob-service capability the local storage bootstrap depends on. */
export class LocalBlobStorage extends Context.Service<
  LocalBlobStorage,
  {
    /** Creates the container when missing and publishes it with blob-level public read access. */
    readonly ensureContainer: (connectionString: Redacted.Redacted<string>, name: string) => Effect.Effect<void, ContainerRuntimeError>;
    /** Applies the local CORS policy required by browser-based local development. */
    readonly applyCorsPolicy: (connectionString: Redacted.Redacted<string>) => Effect.Effect<void, ContainerRuntimeError>;
  }
>()("arolariu/scripts/LocalBlobStorage") {}

/**
 * Bounds one diagnostic excerpt and strips storage credential values from it.
 *
 * @param text - Raw diagnostic text.
 * @param limit - Maximum retained length.
 * @returns Bounded, credential-free diagnostic text.
 */
function boundedDiagnostic(text: string, limit: number): string {
  return text.replaceAll(storageCredentialPattern, "$1=[REDACTED]").slice(0, limit);
}

/**
 * Builds the Azurite bootstrap failure for one failed blob operation.
 *
 * @param error - Value the Azure Blob SDK threw or rejected with.
 * @returns The legacy `Azurite bootstrap failed. … Original error: <detail>` failure, with the detail
 * bounded and stripped of storage credentials.
 */
export function azuriteBootstrapFailure(error: unknown): ContainerRuntimeError {
  const detail = boundedDiagnostic(error instanceof Error ? error.message : String(error), maximumBootstrapDiagnosticLength);
  return new ContainerRuntimeError({
    message: `Azurite bootstrap failed. Ensure the azurite container is running and reachable at ${localAzuriteBlobEndpoint}. Original error: ${detail}`,
  });
}

/**
 * Runs one Azure Blob SDK call for a connection string, aborting it on interruption.
 *
 * @param connectionString - Storage connection string; unwrapped only to construct the client.
 * @param operation - The SDK call, given the client and the interruption signal.
 * @returns An effect failing with {@link azuriteBootstrapFailure} when the client cannot be built
 * or the call rejects.
 */
function blobOperation(
  connectionString: Redacted.Redacted<string>,
  operation: (client: BlobServiceClient, signal: AbortSignal) => Promise<void>,
): Effect.Effect<void, ContainerRuntimeError> {
  return Effect.tryPromise({
    try: (signal) => operation(BlobServiceClient.fromConnectionString(Redacted.value(connectionString)), signal),
    catch: azuriteBootstrapFailure,
  });
}

/** {@link LocalBlobStorage} backed by the Azure Blob SDK. */
export const LocalBlobStorageLive: Layer.Layer<LocalBlobStorage> = Layer.succeed(
  LocalBlobStorage,
  LocalBlobStorage.of({
    ensureContainer: (connectionString, name) =>
      blobOperation(connectionString, async (client, signal) => {
        const container = client.getContainerClient(name);
        await container.createIfNotExists({abortSignal: signal});
        await container.setAccessPolicy("blob", undefined, {abortSignal: signal});
      }),
    applyCorsPolicy: (connectionString) =>
      blobOperation(connectionString, async (client, signal) => {
        await client.setProperties({cors: [...localBlobCorsRules]}, {abortSignal: signal});
      }),
  }),
);

/**
 * Creates one Cosmos emulator resource, treating an existing resource as success.
 *
 * @param path - Resource collection path on {@link localCosmosEndpoint}.
 * @param body - Resource definition sent as the JSON request body.
 * @returns An effect that reads the response body with the {@link cosmosBootstrapMaximumResponseBytes}
 * bound and fails with a {@link ContainerRuntimeError} for an unexpected status, with a
 * `ResponseTooLarge` for an oversized body, or with the transport failure.
 */
function postCosmosResource(
  path: string,
  body: unknown,
): Effect.Effect<void, ContainerRuntimeError | ResponseTooLarge | HttpClientError.HttpClientError, HttpClient.HttpClient> {
  return Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const url = new URL(path, localCosmosEndpoint);
    const response = yield* client.execute(
      HttpClientRequest.post(url.href).pipe(HttpClientRequest.bodyText(JSON.stringify(body), "application/json")),
    );
    const text = yield* readBoundedText(response, cosmosBootstrapMaximumResponseBytes);

    // HTTP 409 is the emulator's "already provisioned" answer, which keeps this bootstrap idempotent.
    if ((response.status < 200 || response.status > 299) && response.status !== 409) {
      return yield* new ContainerRuntimeError({
        message: `Cosmos bootstrap failed for ${url.href}: HTTP ${String(response.status)} ${boundedDiagnostic(text, maximumResponseDiagnosticLength)}`,
      });
    }
  });
}

/**
 * Provisions the local Cosmos database and every required container.
 *
 * @remarks
 * One attempt per resource, sequentially, as in the legacy command: the first failure stops the
 * remaining requests and is wrapped as `Cosmos bootstrap failed. Ensure … Original error: <detail>`.
 * An oversized body fails with the legacy `Response exceeded the 65536 byte limit.` detail. Trace
 * propagation headers are disabled, so the emulator receives exactly the legacy request.
 */
export const ensureCosmos: Effect.Effect<void, ContainerRuntimeError, HttpClient.HttpClient> = Effect.gen(function* () {
  yield* postCosmosResource("/dbs", {id: cosmosDatabaseId});
  yield* Effect.forEach(requiredCosmosContainers, (container) => postCosmosResource(`/dbs/${cosmosDatabaseId}/colls`, container), {
    discard: true,
  });
}).pipe(
  Effect.mapError(
    (error) =>
      new ContainerRuntimeError({
        message: `Cosmos bootstrap failed. Ensure the cosmosdb container is running and reachable at ${localCosmosEndpoint}. Original error: ${boundedDiagnostic(error.message, maximumBootstrapDiagnosticLength)}`,
      }),
  ),
  Effect.provideService(HttpClient.TracerPropagationEnabled, false),
);

/**
 * Provisions every required local blob container, sequentially, then the local CORS policy.
 *
 * @remarks
 * The first failure stops the remaining operations, so a partially provisioned account is reported
 * instead of masked by a later success.
 */
export const ensureAzurite: Effect.Effect<void, ContainerRuntimeError, LocalBlobStorage> = Effect.gen(function* () {
  const storage = yield* LocalBlobStorage;
  yield* Effect.forEach(requiredAzuriteBlobContainers, (name) => storage.ensureContainer(azuriteDevelopmentConnectionString, name), {
    discard: true,
  });
  yield* storage.applyCorsPolicy(azuriteDevelopmentConnectionString);
});
