/**
 * @fileoverview Versioned, non-secret repository-local tooling configuration.
 * @module scripts/common/tooling-config
 */

import {createHash, randomBytes} from "node:crypto";
import {createReadStream} from "node:fs";
import {mkdir, readFile, rename, rm, writeFile} from "node:fs/promises";
import {basename, dirname, resolve} from "node:path";
import type {ContainerEngine} from "../container-runtime/types.ts";

const supportedContainerEngines: ReadonlySet<string> = new Set(["rancher", "podman"]);
const fingerprintKeys = ["nodeVersion", "rootPackageLockSha256", "githubScriptsPackageLockSha256", "pythonRequirementsSha256"] as const;
const secretKeyFragments = ["token", "secret", "password", "connectionstring"] as const;

/** Setup inputs whose successful state can be reused while their fingerprints match. */
export interface SetupFingerprints {
  readonly nodeVersion?: string;
  readonly rootPackageLockSha256?: string;
  readonly githubScriptsPackageLockSha256?: string;
  readonly pythonRequirementsSha256?: string;
}

/** Version 1 of the repository-local, non-secret tooling configuration. */
export interface ToolingConfigV1 {
  readonly schemaVersion: 1;
  readonly containerEngine?: ContainerEngine;
  readonly fingerprints?: SetupFingerprints;
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

function readOptionalString(record: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Tooling configuration property '${key}' must be a non-empty string.`);
  }
  return value;
}

function parseFingerprints(value: unknown): SetupFingerprints {
  if (!isRecord(value)) {
    throw new Error("Tooling configuration property 'fingerprints' must be an object.");
  }

  const parsed: {
    -readonly [Key in keyof SetupFingerprints]?: string;
  } = {};
  for (const key of fingerprintKeys) {
    const fingerprint = readOptionalString(value, key);
    if (fingerprint !== undefined) {
      parsed[key] = fingerprint;
    }
  }
  return parsed;
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
  const fingerprints = value["fingerprints"] === undefined ? undefined : parseFingerprints(value["fingerprints"]);

  return {
    schemaVersion: 1,
    ...(containerEngine === undefined ? {} : {containerEngine}),
    ...(fingerprints === undefined ? {} : {fingerprints}),
  };
}

/**
 * Reads and validates optional repository-local tooling configuration.
 *
 * @param path - Absolute or repository-relative configuration path.
 * @returns Missing, valid, or explicit invalid status.
 */
export async function readToolingConfig(path: string): Promise<ToolingConfigReadResult> {
  let contents: string;
  try {
    contents = await readFile(path, "utf8");
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
 * Writes validated configuration through a permission-conscious temporary sibling.
 *
 * @param path - Destination configuration path.
 * @param config - Version 1 configuration to persist.
 */
export async function writeToolingConfig(path: string, config: Readonly<ToolingConfigV1>): Promise<void> {
  const parsed = parseToolingConfig(config);
  const parent = dirname(path);
  const temporaryPath = resolve(parent, `${basename(path)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`);
  const document = `${JSON.stringify(parsed, null, 2)}\n`;

  try {
    await mkdir(parent, {recursive: true, mode: 0o700});
    await writeFile(temporaryPath, document, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    await rename(temporaryPath, path);
  } catch (error) {
    try {
      await rm(temporaryPath, {force: true});
    } catch {
      // Preserve the original write/rename failure and never broaden cleanup.
    }
    throw error;
  }
}

/**
 * Calculates the lowercase hexadecimal SHA-256 digest of a file.
 *
 * @param path - File to hash.
 * @returns SHA-256 digest.
 */
export async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
  }
  return hash.digest("hex");
}

/**
 * Merges a partial update without discarding existing preference or fingerprint fields.
 *
 * @param current - Existing configuration, when present.
 * @param patch - Preference and fingerprint fields to update.
 * @returns Validated merged version 1 configuration.
 */
export function mergeToolingConfig(
  current: ToolingConfigV1 | undefined,
  patch: Readonly<Partial<Omit<ToolingConfigV1, "schemaVersion">>>,
): ToolingConfigV1 {
  const containerEngine = patch.containerEngine ?? current?.containerEngine;
  const fingerprints = {
    ...current?.fingerprints,
    ...patch.fingerprints,
  };

  return parseToolingConfig({
    schemaVersion: 1,
    ...(containerEngine === undefined ? {} : {containerEngine}),
    ...(Object.keys(fingerprints).length === 0 ? {} : {fingerprints}),
  });
}
