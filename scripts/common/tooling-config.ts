/**
 * @fileoverview Versioned, non-secret repository-local tooling configuration.
 * @module scripts/common/tooling-config
 */

import type {ContainerEngine} from "../container-runtime/types.ts";
import type {FileSystem, ReadOnlyFileSystem} from "../core/runtime/runtime-capability.ts";

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

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
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
 * @param files - Read-only filesystem capability used to read the configuration file.
 * @returns Missing, valid, or explicit invalid status.
 */
export async function readToolingConfig(path: string, files: ReadOnlyFileSystem): Promise<ToolingConfigReadResult> {
  let contents: string;
  try {
    contents = await files.readText(path);
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) {
      return {status: "missing"};
    }
    return {
      status: "invalid",
      error: `Unable to read local tooling configuration '${path}': ${errorMessage(error)}`,
    };
  }

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
 * Writes validated configuration through a permission-conscious atomic write.
 *
 * @param path - Destination configuration path.
 * @param config - Version 1 configuration to persist.
 * @param files - Filesystem capability used to perform the atomic write.
 */
export async function writeToolingConfig(path: string, config: Readonly<ToolingConfigV1>, files: FileSystem): Promise<void> {
  const parsed = parseToolingConfig(config);
  const document = `${JSON.stringify(parsed, null, 2)}\n`;

  await files.writeTextAtomic(path, document, {mode: 0o600, directoryMode: 0o700});
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
