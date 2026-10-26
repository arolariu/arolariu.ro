/**
 * @fileoverview Provider payload contracts and decoders independent of executable checks.
 * @module github/scripts/lib/hygiene/payloads
 */
import {array, count, record, text} from "../../helpers/reports/validation.ts";
import {testSuitesPayloadSchema} from "../testing/suites.ts";
import type {Schema} from "./contracts.ts";
import type {ProviderId} from "./registry.ts";

/** Required formatter evidence. */
export interface FormatPayload {
  readonly unformattedCount: number;
  readonly unformattedFiles: readonly string[];
}
/** Required lint counters. */
export interface LintPayload {
  readonly errorCount: number;
  readonly warningCount: number;
  readonly filesChecked: number;
}
/** File-extension frequency. */
export interface ExtensionStat {
  readonly extension: string;
  readonly count: number;
}
/** Directory frequency. */
export interface DirectoryStat {
  readonly directory: string;
  readonly count: number;
}
/** Committed folder byte comparison. */
export interface FolderSize {
  readonly folder: string;
  readonly mainTotal: number;
  readonly headTotal: number;
}
/** Required statistics evidence; no fields are trusted because a provider emitted them. */
export interface StatsPayload {
  readonly filesChanged: number;
  readonly linesAdded: number;
  readonly linesDeleted: number;
  readonly topExtensions: readonly ExtensionStat[];
  readonly topDirectories: readonly DirectoryStat[];
  readonly bundleSizes: readonly FolderSize[];
}

/** Validates formatter counts and their complete file list; additive fields are ignored. */
export const formatPayloadSchema: Schema<FormatPayload> = {
  parse(value: unknown): FormatPayload {
    const raw = record(value, "format payload");
    const unformattedFiles = array(raw["unformattedFiles"], "unformattedFiles").map((value) => text(value, "unformatted file"));
    const unformattedCount = count(raw["unformattedCount"], "unformattedCount");
    if (unformattedCount !== unformattedFiles.length) throw new TypeError("Unformatted file count does not match");
    return {unformattedCount, unformattedFiles};
  },
};
/** Validates finite nonnegative lint counters. */
export const lintPayloadSchema: Schema<LintPayload> = {
  parse(value: unknown): LintPayload {
    const raw = record(value, "lint payload");
    return {
      errorCount: count(raw["errorCount"], "errorCount"),
      warningCount: count(raw["warningCount"], "warningCount"),
      filesChecked: count(raw["filesChecked"], "filesChecked"),
    };
  },
};
/** Validates all statistics counters, arrays and byte measurements. */
export const statsPayloadSchema: Schema<StatsPayload> = {
  parse(value: unknown): StatsPayload {
    const raw = record(value, "stats payload");
    return {
      filesChanged: count(raw["filesChanged"], "filesChanged"),
      linesAdded: count(raw["linesAdded"], "linesAdded"),
      linesDeleted: count(raw["linesDeleted"], "linesDeleted"),
      topExtensions: array(raw["topExtensions"], "topExtensions").map((value) => {
        const item = record(value, "extension statistic");
        return {extension: text(item["extension"], "extension"), count: count(item["count"], "extension count")};
      }),
      topDirectories: array(raw["topDirectories"], "topDirectories").map((value) => {
        const item = record(value, "directory statistic");
        return {directory: text(item["directory"], "directory"), count: count(item["count"], "directory count")};
      }),
      bundleSizes: array(raw["bundleSizes"], "bundleSizes").map((value) => {
        const item = record(value, "folder size");
        return {
          folder: text(item["folder"], "folder"),
          mainTotal: count(item["mainTotal"], "mainTotal"),
          headTotal: count(item["headTotal"], "headTotal"),
        };
      }),
    };
  },
};

/**
 * Selects the decoder owned by a stable provider identity.
 * @param id - Registered identity, never a provider implementation import.
 * @returns The exact payload decoder; skipped/null states bypass it at envelope level.
 */
export function payloadSchemaFor(id: ProviderId): Schema<unknown> {
  switch (id) {
    case "format":
      return formatPayloadSchema;
    case "lint":
      return lintPayloadSchema;
    case "stats":
      return statsPayloadSchema;
    case "test-typescript":
    case "test-dotnet":
    case "test-python":
      return testSuitesPayloadSchema;
  }
}
