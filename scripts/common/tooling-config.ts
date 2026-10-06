/**
 * @fileoverview Versioned, non-secret repository-local tooling configuration.
 * @module scripts/common/tooling-config
 */

import {Effect, type FileSystem, type Path, type PlatformError} from "effect";

import type {ContainerEngine} from "../container-runtime/types.ts";
import {ReadOnlyFiles, writeTextAtomic} from "../platform/Files.ts";

const supportedContainerEngines: ReadonlySet<string> = new Set(["rancher", "podman"]);
const secretKeyFragments = ["token", "secret", "password", "connectionstring"] as const;

/** Version 1 of the repository-local, non-secret tooling configuration. */
export interface ToolingConfigV1 {
  readonly schemaVersion: 1;
  readonly containerEngine?: ContainerEngine;
}

/** Result of reading the optional repository-local tooling configuration. */
export type ToolingConfigReadResult =
  | {readonly status: "missing"}
  | {readonly status: "valid"; readonly config: ToolingConfigV1}
  | {readonly status: "invalid"; readonly error: string};

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizedKey(key: string): string {
  return key.replaceAll(/[^a-z0-9]/giu, "").toLowerCase();
}

/**
 * Recursively rejects any secret-shaped property name, including inside objects (such as a
 * discarded legacy `fingerprints` object) that are never copied into the parsed result.
 *
 * @param value - Untrusted candidate value.
 * @param visited - Cycle guard shared across the recursive walk.
 * @throws When any nested property name matches a secret-shaped fragment.
 */
function rejectSecretShapedKeys(value: unknown, visited: WeakSet<object> = new WeakSet()): void {
  if (typeof value !== "object" || value === null || visited.has(value)) {
    return;
  }

  visited.add(value);
  for (const [key, child] of Object.entries(value)) {
    const normalized = normalizedKey(key);
    if (secretKeyFragments.some((fragment) => normalized.includes(fragment))) {
      throw new Error(`Local tooling configuration must not contain secrets (property '${key}').`);
    }
    rejectSecretShapedKeys(child, visited);
  }
}

function parseContainerEngine(value: unknown): ContainerEngine | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || !supportedContainerEngines.has(value)) {
    throw new Error(`Unsupported container engine '${String(value)}'. Supported engines: rancher, podman.`);
  }
  return value === "rancher" ? "rancher" : "podman";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Parses the configuration document text into a read result.
 *
 * @param path - Configuration path, quoted in the invalid message.
 * @param contents - Raw document text.
 * @returns The valid configuration, or the invalid result for malformed JSON or schema.
 */
function parseToolingConfigDocument(path: string, contents: string): ToolingConfigReadResult {
  try {
    const value: unknown = JSON.parse(contents);
    return {status: "valid", config: parseToolingConfig(value)};
  } catch (error) {
    return {
      status: "invalid",
      error: `Invalid local tooling configuration '${path}': ${errorMessage(error)}`,
    };
  }
}

/**
 * Parses untrusted local tooling configuration and returns only schema-known fields.
 *
 * @remarks
 * A legacy `fingerprints` object (or any other unknown property) is silently discarded from the
 * parsed result; it is never rejected on that basis alone. Its property names are still walked for
 * secret-shaped fragments, so a legacy document carrying a secret-shaped key nested inside a
 * discarded object remains rejected exactly like any other secret-shaped property.
 *
 * @param value - Untrusted JSON-compatible value.
 * @returns Validated version 1 tooling configuration.
 * @throws When the schema, values, or any secret-shaped property is invalid.
 */
export function parseToolingConfig(value: unknown): ToolingConfigV1 {
  rejectSecretShapedKeys(value);
  if (!isRecord(value)) {
    throw new Error("Local tooling configuration must be an object.");
  }
  if (value["schemaVersion"] !== 1) {
    throw new Error(`Unsupported tooling configuration schema version '${String(value["schemaVersion"])}'. Expected version 1.`);
  }

  const containerEngine = parseContainerEngine(value["containerEngine"]);

  return {
    schemaVersion: 1,
    ...(containerEngine === undefined ? {} : {containerEngine}),
  };
}

/**
 * Reads and validates optional repository-local tooling configuration.
 *
 * @param path - Absolute or repository-relative configuration path.
 * @returns Missing (the file does not exist), valid, or explicit invalid status, read through
 * {@link ReadOnlyFiles}; never fails.
 */
export function readToolingConfig(path: string): Effect.Effect<ToolingConfigReadResult, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const files = yield* ReadOnlyFiles;
    return yield* files.readFileString(path).pipe(
      Effect.map((contents) => parseToolingConfigDocument(path, contents)),
      Effect.catch((error) =>
        Effect.succeed<ToolingConfigReadResult>(
          error.reason._tag === "NotFound"
            ? {status: "missing"}
            : {
                status: "invalid",
                error: `Unable to read local tooling configuration '${path}': Failed to readText '${path}': ${error.message}`,
              },
        ),
      ),
    );
  });
}

/**
 * Writes validated configuration through a permission-conscious atomic write.
 *
 * @param path - Destination configuration path.
 * @param config - Version 1 configuration to persist.
 * @returns An effect completing once `path` holds the serialized configuration, written by
 * `writeTextAtomic` with mode `0o600` and parent-directory mode `0o700`.
 */
export function writeToolingConfig(
  path: string,
  config: Readonly<ToolingConfigV1>,
): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem | Path.Path> {
  return Effect.suspend(() => {
    const parsed = parseToolingConfig(config);
    const document = `${JSON.stringify(parsed, null, 2)}\n`;
    return writeTextAtomic(path, document, {mode: 0o600, directoryMode: 0o700});
  });
}

/**
 * Merges a partial update without discarding an existing preference field.
 *
 * @param current - Existing configuration, when present.
 * @param patch - Preference fields to update.
 * @returns Validated merged version 1 configuration.
 */
export function mergeToolingConfig(
  current: ToolingConfigV1 | undefined,
  patch: Readonly<Partial<Omit<ToolingConfigV1, "schemaVersion">>>,
): ToolingConfigV1 {
  const containerEngine = patch.containerEngine ?? current?.containerEngine;

  return parseToolingConfig({
    schemaVersion: 1,
    ...(containerEngine === undefined ? {} : {containerEngine}),
  });
}
