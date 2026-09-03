/**
 * @fileoverview Injected local Cosmos and Azurite storage bootstrap for selfhost mode.
 * @module scripts/container-runtime/selfhost.bootstrap
 *
 * @remarks
 * This module is the only place the Azure Blob SDK is constructed: `BlobServiceClient` never
 * escapes it, so the selfhost command depends on the narrow {@link LocalBlobStorage} capability
 * instead of a vendor client and unit tests inject a fake factory rather than reaching Azurite.
 * Cosmos provisioning goes through the runtime {@link HttpClient}, so its status and body
 * handling stay bounded and cancellation-aware. Nothing here logs: every failure is returned to
 * the caller as a typed error whose diagnostic text is bounded and stripped of storage
 * credentials, and a cancelled invocation surfaces its own {@link CommandCancellation} instead of
 * being downgraded into an operational failure.
 */

import {BlobServiceClient} from "@azure/storage-blob";
import {CommandCancellation, commandCancellationFromSignal, type HttpClient} from "../common/runtime.ts";
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
 * constants, not production credentials, and are only ever used against localhost Azurite.
 *
 * @see {@link https://learn.microsoft.com/azure/storage/common/storage-use-azurite}
 */
export const azuriteDevelopmentConnectionString = "UseDevelopmentStorage=true";

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

/** Minimal blob-service capability the local storage bootstrap depends on. */
export interface LocalBlobStorage {
  /** Creates the container when missing and publishes it with blob-level public read access. */
  readonly ensureContainer: (name: string, signal: AbortSignal) => Promise<void>;
  /** Applies the local CORS policy required by browser-based local development. */
  readonly applyCorsPolicy: (signal: AbortSignal) => Promise<void>;
}

/** Creates a {@link LocalBlobStorage} for one storage connection string. */
export type LocalBlobStorageFactory = (connectionString: string) => LocalBlobStorage;

/** Idempotent local Cosmos and Azurite provisioning used by the selfhost start action. */
export interface LocalStorageBootstrap {
  /** Provisions the local Cosmos database and every required container. */
  readonly ensureCosmos: (signal: AbortSignal) => Promise<void>;
  /** Provisions every required local blob container and the local CORS policy. */
  readonly ensureAzurite: (signal: AbortSignal) => Promise<void>;
}

/** Capabilities {@link createLocalStorageBootstrap} depends on. */
export interface LocalStorageBootstrapDependencies {
  /** HTTP capability used for every Cosmos emulator request. */
  readonly http: HttpClient;
  /** Blob-client factory; tests inject a fake so no unit test reaches Azurite. */
  readonly createBlobStorage?: LocalBlobStorageFactory;
}

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
 * Throws the invocation's own cancellation reason when its signal has already aborted.
 *
 * @param signal - The owning invocation's cancellation signal.
 * @throws {CommandCancellation} When `signal` is aborted.
 */
function throwIfCancelled(signal: AbortSignal): void {
  if (signal.aborted) {
    throw commandCancellationFromSignal(signal);
  }
}

/**
 * Normalizes a bootstrap failure without downgrading a cancellation into an operational error.
 *
 * @param error - Value thrown by one provisioning step.
 * @param signal - The owning invocation's cancellation signal.
 * @param context - Operational guidance prefixed to the returned failure message.
 * @returns The cancellation reason when the invocation was cancelled, otherwise a bounded,
 * credential-free {@link ContainerRuntimeError}.
 */
function toBootstrapFailure(error: unknown, signal: AbortSignal, context: string): Error {
  if (error instanceof CommandCancellation) {
    return error;
  }
  if (signal.aborted) {
    return commandCancellationFromSignal(signal);
  }

  const detail = boundedDiagnostic(error instanceof Error ? error.message : String(error), maximumBootstrapDiagnosticLength);
  return new ContainerRuntimeError(`${context} Original error: ${detail}`);
}

/**
 * Creates one Cosmos emulator resource, treating an existing resource as success.
 *
 * @param http - HTTP capability used for the request.
 * @param url - Absolute Cosmos emulator resource collection URL.
 * @param body - Resource definition sent as the JSON request body.
 * @param signal - The owning invocation's cancellation signal.
 * @throws {ContainerRuntimeError} When the emulator reports an unexpected status.
 */
async function postCosmosResource(http: HttpClient, url: URL, body: unknown, signal: AbortSignal): Promise<void> {
  const response = await http.request({
    url,
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body),
    signal,
    maximumResponseBytes: cosmosBootstrapMaximumResponseBytes,
  });

  // HTTP 409 is the emulator's "already provisioned" answer, which keeps this bootstrap idempotent.
  if (!response.ok && response.status !== 409) {
    throw new ContainerRuntimeError(
      `Cosmos bootstrap failed for ${url.href}: HTTP ${String(response.status)} ${boundedDiagnostic(response.text, maximumResponseDiagnosticLength)}`,
    );
  }
}

/**
 * Provisions the local Cosmos database and every required container.
 *
 * @param http - HTTP capability used for every emulator request.
 * @param signal - The owning invocation's cancellation signal.
 * @throws {CommandCancellation} When the invocation is cancelled.
 * @throws {ContainerRuntimeError} When provisioning fails.
 */
async function ensureCosmos(http: HttpClient, signal: AbortSignal): Promise<void> {
  throwIfCancelled(signal);

  try {
    await postCosmosResource(http, new URL("/dbs", localCosmosEndpoint), {id: cosmosDatabaseId}, signal);

    for (const container of requiredCosmosContainers) {
      // Intentionally sequential: each container is created against the database provisioned by
      // the previous request, and the first failure must stop the remaining requests.
      // eslint-disable-next-line no-await-in-loop
      await postCosmosResource(http, new URL(`/dbs/${cosmosDatabaseId}/colls`, localCosmosEndpoint), container, signal);
    }
  } catch (error: unknown) {
    throw toBootstrapFailure(
      error,
      signal,
      `Cosmos bootstrap failed. Ensure the cosmosdb container is running and reachable at ${localCosmosEndpoint}.`,
    );
  }
}

/**
 * Provisions every required local blob container and the local CORS policy.
 *
 * @param createBlobStorage - Blob-client factory used for this invocation.
 * @param signal - The owning invocation's cancellation signal.
 * @throws {CommandCancellation} When the invocation is cancelled.
 * @throws {ContainerRuntimeError} When provisioning fails.
 */
async function ensureAzurite(createBlobStorage: LocalBlobStorageFactory, signal: AbortSignal): Promise<void> {
  throwIfCancelled(signal);

  try {
    const storage = createBlobStorage(azuriteDevelopmentConnectionString);

    for (const container of requiredAzuriteBlobContainers) {
      // Intentionally sequential: the first container failure must stop the remaining ones so a
      // partially provisioned account is reported instead of masked by a later success.
      // eslint-disable-next-line no-await-in-loop
      await storage.ensureContainer(container, signal);
    }

    await storage.applyCorsPolicy(signal);
  } catch (error: unknown) {
    throw toBootstrapFailure(
      error,
      signal,
      `Azurite bootstrap failed. Ensure the azurite container is running and reachable at ${localAzuriteBlobEndpoint}.`,
    );
  }
}

/**
 * Creates the production {@link LocalBlobStorage} backed by the Azure Blob SDK.
 *
 * @param connectionString - Storage connection string; never logged or embedded in diagnostics.
 * @returns A blob capability bound to that account.
 */
function createAzuriteBlobStorage(connectionString: string): LocalBlobStorage {
  const client = BlobServiceClient.fromConnectionString(connectionString);

  return {
    ensureContainer: async (name: string, signal: AbortSignal): Promise<void> => {
      const container = client.getContainerClient(name);
      await container.createIfNotExists({abortSignal: signal});
      await container.setAccessPolicy("blob", undefined, {abortSignal: signal});
    },
    applyCorsPolicy: async (signal: AbortSignal): Promise<void> => {
      await client.setProperties({cors: [...localBlobCorsRules]}, {abortSignal: signal});
    },
  };
}

/**
 * Creates the local storage bootstrap used by the selfhost start action.
 *
 * @param dependencies - HTTP capability and optional blob-client factory.
 * @returns Idempotent Cosmos and Azurite provisioning bound to those capabilities.
 */
export function createLocalStorageBootstrap(dependencies: Readonly<LocalStorageBootstrapDependencies>): LocalStorageBootstrap {
  const createBlobStorage = dependencies.createBlobStorage ?? createAzuriteBlobStorage;

  return {
    ensureCosmos: (signal: AbortSignal): Promise<void> => ensureCosmos(dependencies.http, signal),
    ensureAzurite: (signal: AbortSignal): Promise<void> => ensureAzurite(createBlobStorage, signal),
  };
}
